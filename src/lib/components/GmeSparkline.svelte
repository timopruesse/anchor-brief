<script lang="ts">
	import { formatMoney, formatPct, formatSigned } from '$lib/format';
	import type { SparkPoint } from '$lib/types';

	type RangeKey = '1M' | '3M' | '6M' | 'YTD';

	interface Props {
		points: SparkPoint[];
		currency?: string;
	}

	let { points, currency = 'USD' }: Props = $props();

	const RANGES: { key: RangeKey; label: string; days?: number }[] = [
		{ key: '1M', label: '1M', days: 30 },
		{ key: '3M', label: '3M', days: 90 },
		{ key: '6M', label: '6M', days: 180 },
		{ key: 'YTD', label: 'YTD' }
	];

	let containerWidth = $state(560);
	const W = $derived(Math.max(300, containerWidth || 560));
	const H = 180;
	const PAD = { top: 20, right: 0, bottom: 22, left: 0 };

	let range = $state<RangeKey>('1M');
	let hoverIdx = $state<number | null>(null);

	function parseDay(t: string): number | null {
		// Treat YYYY-MM-DD as UTC noon to avoid DST edge flips.
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.trim());
		if (!m) return null;
		const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
		return Number.isFinite(ms) ? ms : null;
	}

	function formatDayLabel(t: string): string {
		const ms = parseDay(t);
		if (ms == null) return t;
		return new Intl.DateTimeFormat('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}).format(new Date(ms));
	}

	const series = $derived.by((): SparkPoint[] => {
		const raw = Array.isArray(points) ? points : [];
		return raw
			.filter((p) => p && typeof p.c === 'number' && Number.isFinite(p.c) && typeof p.t === 'string')
			.slice()
			.sort((a, b) => a.t.localeCompare(b.t));
	});

	const usable = $derived(series.length >= 2);

	const windowPoints = $derived.by((): SparkPoint[] => {
		if (!usable) return [];
		const last = series[series.length - 1];
		const lastMs = parseDay(last.t);
		if (lastMs == null) return series;

		const meta = RANGES.find((r) => r.key === range);
		let startMs: number;
		if (meta?.days != null) {
			startMs = lastMs - meta.days * 86_400_000;
		} else {
			// YTD: Jan 1 of the last point's calendar year
			const d = new Date(lastMs);
			startMs = Date.UTC(d.getUTCFullYear(), 0, 1, 12, 0, 0);
		}

		const startIso = new Date(startMs).toISOString().slice(0, 10);
		const sliced = series.filter((p) => p.t >= startIso);
		return sliced.length >= 2 ? sliced : series;
	});

	interface ChartGeom {
		path: string;
		area: string;
		coords: { x: number; y: number; p: SparkPoint }[];
		min: number;
		max: number;
		minY: number;
		maxY: number;
		start: SparkPoint;
		end: SparkPoint;
		midY: number;
	}

	const geom = $derived.by((): ChartGeom | null => {
		const pts = windowPoints;
		if (pts.length < 2) return null;

		const vals = pts.map((p) => p.c);
		const min = Math.min(...vals);
		const max = Math.max(...vals);
		const span = max - min || 1;
		const innerW = W - PAD.left - PAD.right;
		const innerH = H - PAD.top - PAD.bottom;

		const coords = pts.map((p, i) => {
			const x = PAD.left + (i / (pts.length - 1)) * innerW;
			const y = PAD.top + (1 - (p.c - min) / span) * innerH;
			return { x, y, p };
		});

		const path = coords
			.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
			.join(' ');

		const first = coords[0];
		const last = coords[coords.length - 1];
		const baseline = PAD.top + innerH;
		const area = `${path} L${last.x.toFixed(2)} ${baseline.toFixed(2)} L${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;

		const minIdx = vals.indexOf(min);
		const maxIdx = vals.indexOf(max);

		return {
			path,
			area,
			coords,
			min,
			max,
			minY: coords[minIdx].y,
			maxY: coords[maxIdx].y,
			start: pts[0],
			end: pts[pts.length - 1],
			midY: PAD.top + innerH / 2
		};
	});

	const windowChange = $derived.by(() => {
		if (!geom) return null;
		const delta = geom.end.c - geom.start.c;
		const pct = geom.start.c !== 0 ? (delta / geom.start.c) * 100 : 0;
		return { delta, pct, up: delta >= 0 };
	});

	const activeHover = $derived.by(() => {
		if (hoverIdx == null || !geom) return null;
		return geom.coords[hoverIdx] ?? null;
	});

	const hoverDelta = $derived.by(() => {
		if (!activeHover || !geom) return null;
		const delta = activeHover.p.c - geom.start.c;
		const pct = geom.start.c !== 0 ? (delta / geom.start.c) * 100 : 0;
		return { delta, pct, up: delta >= 0 };
	});

	const summary = $derived.by(() => {
		if (!geom || !windowChange) return 'Price chart unavailable.';
		const dir = windowChange.up ? 'up' : 'down';
		return `GME ${range} chart from ${formatDayLabel(geom.start.t)} to ${formatDayLabel(geom.end.t)}. Started at ${formatMoney(geom.start.c, currency)}, ended at ${formatMoney(geom.end.c, currency)}, ${dir} ${formatPct(windowChange.pct)}. Range ${formatMoney(geom.min, currency)} to ${formatMoney(geom.max, currency)}.`;
	});

	function setRange(key: RangeKey) {
		range = key;
		hoverIdx = null;
	}

	function onPointerMove(event: PointerEvent & { currentTarget: SVGSVGElement }) {
		if (!geom || geom.coords.length < 2) return;

		const svg = event.currentTarget;
		let x: number;

		try {
			const pt = svg.createSVGPoint();
			pt.x = event.clientX;
			pt.y = event.clientY;
			const ctm = svg.getScreenCTM();
			if (ctm) {
				x = pt.matrixTransform(ctm.inverse()).x;
			} else {
				const rect = svg.getBoundingClientRect();
				x = ((event.clientX - rect.left) / rect.width) * W;
			}
		} catch {
			const rect = svg.getBoundingClientRect();
			x = ((event.clientX - rect.left) / rect.width) * W;
		}

		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < geom.coords.length; i++) {
			const d = Math.abs(geom.coords[i].x - x);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		hoverIdx = best;
	}

	function onPointerLeave() {
		hoverIdx = null;
	}
</script>

{#if usable && geom && windowChange}
	<figure class="spark" bind:clientWidth={containerWidth}>
		<div class="spark-head">
			<div class="spark-window">
				<div class="spark-title-row">
					<span class="spark-tag">{range} Price Action</span>
					<span class="spark-dates">{formatDayLabel(geom.start.t)} — {formatDayLabel(geom.end.t)}</span>
				</div>
				<div class="spark-price-row">
					<span class="spark-window__price">{formatMoney(geom.end.c, currency)}</span>
					<span class={['spark-window__chg', windowChange.up ? 'up' : 'down']}>
						{formatSigned(windowChange.delta, 2)} ({formatPct(windowChange.pct)})
					</span>
					<span class="spark-range-summary">
						Low {formatMoney(geom.min, currency)} · High {formatMoney(geom.max, currency)}
					</span>
				</div>
			</div>

			<div class="spark-ranges" role="group" aria-label="Price chart range">
				{#each RANGES as r (r.key)}
					<button
						type="button"
						class="spark-chip"
						aria-pressed={range === r.key}
						onclick={() => setRange(r.key)}
					>
						{r.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="spark-chart-box">
			<svg
				class="spark-svg"
				viewBox="0 0 {W} {H}"
				preserveAspectRatio="none"
				role="img"
				aria-label={summary}
				onpointerdown={onPointerMove}
				onpointermove={onPointerMove}
				onpointerup={onPointerLeave}
				onpointercancel={onPointerLeave}
				onpointerleave={onPointerLeave}
			>
				<title>{summary}</title>

				<defs>
					<linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25" />
						<stop offset="85%" stop-color="var(--accent)" stop-opacity="0.03" />
						<stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
					</linearGradient>
				</defs>

				<!-- horizontal grid lines spanning full width 0 to W -->
				<line class="grid" x1="0" y1={geom.maxY} x2={W} y2={geom.maxY} />
				<line class="grid" x1="0" y1={geom.midY} x2={W} y2={geom.midY} />
				<line class="grid" x1="0" y1={geom.minY} x2={W} y2={geom.minY} />

				<!-- Max / Min reference price labels floating near right edge -->
				<text class="axis-label" x={W - 14} y={geom.maxY - 5} text-anchor="end">{formatMoney(geom.max, currency)}</text>
				{#if Math.abs(geom.minY - geom.maxY) >= 20}
					<text class="axis-label" x={W - 14} y={geom.minY - 5} text-anchor="end">{formatMoney(geom.min, currency)}</text>
				{/if}

				<!-- Area and trendline spanning full width -->
				<path class="area" d={geom.area} fill="url(#spark-gradient)"></path>
				<path class="line" d={geom.path}></path>

				<!-- End marker (shown when idle; inset by radius so it does not get clipped by right border) -->
				{#if !activeHover}
					<circle
						class={['dot', 'end', windowChange.up ? 'up' : 'down']}
						cx={Math.min(W - 4, geom.coords[geom.coords.length - 1].x)}
						cy={geom.coords[geom.coords.length - 1].y}
						r="3.5"
					/>
				{/if}

				<!-- Active Hover Crosshair and Markers -->
				{#if activeHover}
					<line
						class="cross"
						x1={activeHover.x}
						y1={0}
						x2={activeHover.x}
						y2={H - PAD.bottom}
					/>
					<circle class="dot-hover-ring" cx={activeHover.x} cy={activeHover.y} r="7" />
					<circle class="dot hover" cx={activeHover.x} cy={activeHover.y} r="3.5" />
				{/if}

				<!-- Period date labels -->
				<text class="xlabel" x={14} y={H - 7} text-anchor="start">{formatDayLabel(geom.start.t)}</text>
				<text class="xlabel" x={W - 14} y={H - 7} text-anchor="end">{formatDayLabel(geom.end.t)}</text>
			</svg>
		</div>

		<div class="spark-footer">
			{#if activeHover && hoverDelta}
				<p class="spark-readout" aria-live="polite">
					<span class="readout-date">{formatDayLabel(activeHover.p.t)}</span>
					<span class="readout-sep">·</span>
					<span class="readout-price">{formatMoney(activeHover.p.c, currency)}</span>
					<span class="readout-sep">·</span>
					<span class={['readout-delta', hoverDelta.up ? 'up' : 'down']}>
						{formatSigned(hoverDelta.delta, 2)} ({formatPct(hoverDelta.pct)} vs window start)
					</span>
				</p>
			{:else}
				<p class="spark-readout spark-readout--muted">
					<span>Inspect session: hover across chart</span>
					<span class="readout-sep">·</span>
					<span>{geom.coords.length} sessions in window</span>
					<span class="readout-sep">·</span>
					<span>Low {formatMoney(geom.min, currency)} — High {formatMoney(geom.max, currency)}</span>
				</p>
			{/if}
		</div>
	</figure>
{/if}

<style>
	.spark {
		margin: 0;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0;
		min-width: 0;
		width: 100%;
		overflow: hidden;
	}

	.spark-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.65rem 1rem;
		padding: 1rem 1.25rem 0.65rem;
		min-width: 0;
	}

	.spark-window {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.spark-title-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.spark-tag {
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.spark-dates {
		font-size: 0.72rem;
		color: var(--ink-4);
		font-variant-numeric: tabular-nums;
	}

	.spark-price-row {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.45rem 0.75rem;
	}

	.spark-window__price {
		font-family: var(--serif);
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
		color: var(--ink);
	}

	.spark-window__chg {
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}

	.spark-window__chg.up {
		color: var(--up);
	}

	.spark-window__chg.down {
		color: var(--down);
	}

	.spark-range-summary {
		font-size: 0.74rem;
		color: var(--ink-4);
		font-variant-numeric: tabular-nums;
	}

	.spark-ranges {
		display: inline-flex;
		align-items: center;
		padding: 2px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		gap: 2px;
	}

	.spark-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 1.75rem;
		min-width: 2.25rem;
		padding: 0.2rem 0.55rem;
		border: none;
		border-radius: calc(var(--radius-sm) - 2px);
		background: transparent;
		color: var(--ink-3);
		font: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		cursor: pointer;
		flex: 0 0 auto;
		transition:
			background-color 140ms ease,
			color 140ms ease;
	}

	.spark-chip:hover {
		color: var(--ink);
		background: rgba(255, 255, 255, 0.04);
	}

	.spark-chip[aria-pressed='true'] {
		background: var(--accent);
		color: var(--accent-ink);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.spark-chart-box {
		width: 100%;
		position: relative;
		overflow: hidden;
	}

	.spark-svg {
		display: block;
		width: 100%;
		height: 180px;
		overflow: visible;
		touch-action: pan-y;
		cursor: crosshair;
		user-select: none;
	}

	.spark-svg * {
		pointer-events: none;
	}

	.grid {
		stroke: var(--line-soft);
		stroke-width: 1;
		stroke-dasharray: 2 4;
	}

	.area {
		stroke: none;
	}

	.line {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.dot {
		fill: var(--accent);
		stroke: var(--surface);
		stroke-width: 1.5;
	}

	.dot.end.up {
		fill: var(--up);
	}

	.dot.end.down {
		fill: var(--down);
	}

	.dot.hover {
		fill: var(--ink);
		stroke: var(--accent);
		stroke-width: 2;
	}

	.dot-hover-ring {
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.5;
		opacity: 0.6;
	}

	.cross {
		stroke: var(--ink-3);
		stroke-width: 1;
		stroke-dasharray: 2 3;
		opacity: 0.6;
	}

	.axis-label {
		fill: var(--ink-4);
		font-size: 8.5px;
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
	}

	.xlabel {
		fill: var(--ink-4);
		font-size: 8.5px;
		font-family: var(--sans);
	}

	.spark-footer {
		border-top: 1px solid var(--line-soft);
		padding: 0.55rem 1.25rem 0.75rem;
		background: var(--surface-2);
	}

	.spark-readout {
		margin: 0;
		font-size: 0.76rem;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
		line-height: 1.35;
		min-height: 1.3em;
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.35rem;
		font-family: var(--mono);
	}

	.readout-date {
		color: var(--ink-3);
	}

	.readout-price {
		font-weight: 700;
		color: var(--ink);
	}

	.readout-delta.up {
		color: var(--up);
	}

	.readout-delta.down {
		color: var(--down);
	}

	.spark-readout--muted {
		color: var(--ink-4);
		font-family: var(--sans);
	}

	.readout-sep {
		color: var(--line);
	}

	@media (max-width: 40rem) {
		.spark-head {
			padding: 0.75rem 0.85rem 0.5rem;
		}

		.spark-footer {
			padding: 0.45rem 0.85rem 0.65rem;
		}

		.spark-range-summary {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spark-chip {
			transition: none;
		}
	}
</style>
