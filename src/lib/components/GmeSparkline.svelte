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

	const W = 360;
	const H = 148;
	const PAD = { top: 16, right: 48, bottom: 26, left: 10 };

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
		// Prefer fine pointers (mouse / stylus); skip sticky hover on coarse touch.
		if (event.pointerType === 'touch') return;

		const rect = event.currentTarget.getBoundingClientRect();
		if (rect.width <= 0) return;
		const x = ((event.clientX - rect.left) / rect.width) * W;
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
	<figure class="spark">
		<div class="spark-head">
			<div class="spark-window">
				<span class="spark-window__label">{range} window</span>
				<span class="spark-window__price">{formatMoney(geom.end.c, currency)}</span>
				<span class={['spark-window__chg', windowChange.up ? 'up' : 'down']}>
					{formatSigned(windowChange.delta, 2)} ({formatPct(windowChange.pct)})
				</span>
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

		<svg
			class="spark-svg"
			viewBox="0 0 {W} {H}"
			role="img"
			aria-label={summary}
			onpointermove={onPointerMove}
			onpointerleave={onPointerLeave}
		>
			<title>{summary}</title>

			<!-- subtle mid / min / max guides -->
			<line class="grid" x1={PAD.left} y1={geom.maxY} x2={W - PAD.right} y2={geom.maxY} />
			<line class="grid" x1={PAD.left} y1={geom.midY} x2={W - PAD.right} y2={geom.midY} />
			<line class="grid" x1={PAD.left} y1={geom.minY} x2={W - PAD.right} y2={geom.minY} />

			<text class="axis-label" x={W - PAD.right + 6} y={geom.maxY + 3}>{formatMoney(geom.max, currency)}</text>
			<text class="axis-label" x={W - PAD.right + 6} y={geom.minY + 3}>{formatMoney(geom.min, currency)}</text>

			<path class="area" d={geom.area}></path>
			<path class="line" d={geom.path}></path>

			<!-- start / end markers -->
			<circle class="dot start" cx={geom.coords[0].x} cy={geom.coords[0].y} r="3.2" />
			<circle
				class={['dot', 'end', windowChange.up ? 'up' : 'down']}
				cx={geom.coords[geom.coords.length - 1].x}
				cy={geom.coords[geom.coords.length - 1].y}
				r="3.6"
			/>

			{#if activeHover}
				<line
					class="cross"
					x1={activeHover.x}
					y1={PAD.top}
					x2={activeHover.x}
					y2={H - PAD.bottom}
				/>
				<circle class="dot hover" cx={activeHover.x} cy={activeHover.y} r="4" />
			{/if}

			<text class="xlabel" x={PAD.left} y={H - 6}>{formatDayLabel(geom.start.t)}</text>
			<text class="xlabel" x={W - PAD.right} y={H - 6} text-anchor="end"
				>{formatDayLabel(geom.end.t)}</text
			>
		</svg>

		{#if activeHover}
			<p class="spark-readout" aria-live="polite">
				{formatDayLabel(activeHover.p.t)} · {formatMoney(activeHover.p.c, currency)}
			</p>
		{:else}
			<p class="spark-readout spark-readout--muted">
				{formatDayLabel(geom.start.t)} → {formatDayLabel(geom.end.t)} · min
				{formatMoney(geom.min, currency)} · max {formatMoney(geom.max, currency)}
			</p>
		{/if}
	</figure>
{/if}

<style>
	.spark {
		margin: 1rem 0 0;
		padding: 0.75rem 0.8rem 0.65rem;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 12px;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
	}

	.spark-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.65rem 0.85rem;
		margin-bottom: 0.55rem;
		min-width: 0;
	}

	.spark-window {
		display: grid;
		gap: 0.12rem;
		min-width: 0;
	}

	.spark-window__label {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 650;
		color: var(--ink-4);
	}

	.spark-window__price {
		font-family: var(--serif);
		font-size: 1.15rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		line-height: 1.15;
		color: var(--ink);
	}

	.spark-window__chg {
		font-size: 0.88rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}

	.spark-window__chg.up {
		color: var(--up);
	}

	.spark-window__chg.down {
		color: var(--down);
	}

	.spark-ranges {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		min-width: 0;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.spark-ranges::-webkit-scrollbar {
		display: none;
	}

	.spark-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: var(--tap);
		min-width: 2.75rem;
		padding: 0.35rem 0.72rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--ink-2);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		line-height: 1.2;
		cursor: pointer;
		flex: 0 0 auto;
		transition:
			color 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease,
			transform 140ms ease;
	}

	.spark-chip:hover {
		color: var(--ink);
		border-color: var(--accent-line);
	}

	.spark-chip:active {
		transform: scale(0.98);
	}

	.spark-chip[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-ink);
	}

	.spark-svg {
		display: block;
		width: 100%;
		height: auto;
		min-height: 120px;
		max-height: 160px;
		overflow: visible;
		touch-action: pan-y;
		cursor: crosshair;
	}

	.grid {
		stroke: var(--line-soft);
		stroke-width: 1;
		stroke-dasharray: 3 4;
	}

	.area {
		fill: var(--accent-soft);
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

	.dot.start {
		fill: var(--ink-3);
	}

	.dot.end.up {
		fill: var(--up);
	}

	.dot.end.down {
		fill: var(--down);
	}

	.dot.hover {
		fill: var(--ink);
	}

	.cross {
		stroke: var(--ink-4);
		stroke-width: 1;
		stroke-dasharray: 2 3;
		opacity: 0.7;
	}

	.axis-label {
		fill: var(--ink-4);
		font-size: 9px;
		font-family: var(--sans, system-ui, sans-serif);
		font-variant-numeric: tabular-nums;
	}

	.xlabel {
		fill: var(--ink-4);
		font-size: 9px;
		font-family: var(--sans, system-ui, sans-serif);
	}

	.spark-readout {
		margin: 0.4rem 0 0;
		font-size: 0.78rem;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
		line-height: 1.35;
		min-height: 1.2em;
	}

	.spark-readout--muted {
		color: var(--ink-3);
	}

	@media (max-width: 40rem) {
		.spark {
			padding: 0.7rem 0.65rem 0.55rem;
			border-radius: 10px;
		}

		.spark-svg {
			min-height: 132px;
		}

		.spark-window__price {
			font-size: 1.05rem;
		}

		.axis-label,
		.xlabel {
			font-size: 8px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spark-chip {
			transition: none;
		}
	}
</style>
