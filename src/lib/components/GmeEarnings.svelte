<script lang="ts">
	import {
		formatEarningsValue,
		formatOutlookChip,
		defaultComparisonMode,
		type ComparisonMode
	} from '$lib/earnings';
	import { safeHref } from '$lib/format';
	import type { EarningsComparison, EarningsMetric, GmeEarnings } from '$lib/types';

	interface Props {
		earnings: GmeEarnings;
	}

	let { earnings }: Props = $props();

	const availableModes = $derived.by((): ComparisonMode[] => {
		const modes: ComparisonMode[] = [];
		if (earnings.comparisons?.yoy) modes.push('yoy');
		if (earnings.comparisons?.qoq) modes.push('qoq');
		return modes;
	});

	/** User toggle; null means follow defaultComparisonMode(earnings). */
	let modeOverride = $state<ComparisonMode | null>(null);

	const mode = $derived.by((): ComparisonMode => {
		if (modeOverride && availableModes.includes(modeOverride)) return modeOverride;
		return defaultComparisonMode(earnings) ?? availableModes[0] ?? 'yoy';
	});

	const comparison = $derived.by((): EarningsComparison | null => {
		const c = earnings.comparisons?.[mode];
		if (c?.periods?.length && c?.metrics?.length) return c;
		// Soft-fallback if selected mode vanished
		const fallback = availableModes[0];
		if (fallback && fallback !== mode) {
			const alt = earnings.comparisons?.[fallback];
			if (alt?.periods?.length && alt?.metrics?.length) return alt;
		}
		return null;
	});

	const hasComparison = $derived(Boolean(comparison));
	const mix = $derived(
		earnings.mix?.segments?.length ? earnings.mix : null
	);
	const show = $derived(hasComparison || Boolean(mix));

	const sourceHref = $derived(safeHref(earnings.source?.url));
	const sourceLabel = $derived(
		(typeof earnings.source?.label === 'string' && earnings.source.label.trim()) ||
			'IR source'
	);
	const outlookChip = $derived(formatOutlookChip(earnings.outlook));
	const asOf = $derived(
		typeof earnings.asOf === 'string' && earnings.asOf.trim() ? earnings.asOf.trim() : ''
	);

	const MODE_LABELS: Record<ComparisonMode, string> = {
		yoy: 'YoY',
		qoq: 'QoQ'
	};

	interface BarPeriod {
		id: string;
		label: string;
		value: number | null;
		isLatest: boolean;
		widthPct: number;
	}

	interface MetricRow {
		id: string;
		label: string;
		unit: string;
		note?: string;
		bars: BarPeriod[];
		deltaPct: number | null;
	}

	const metricRows = $derived.by((): MetricRow[] => {
		const cmp = comparison;
		if (!cmp) return [];
		const periods = Array.isArray(cmp.periods) ? cmp.periods : [];
		if (!periods.length) return [];

		return (cmp.metrics ?? [])
			.filter((m): m is EarningsMetric => Boolean(m?.id && m?.label && m?.unit && m?.values))
			.map((metric) => {
				const vals = periods.map((p) => {
					const v = metric.values?.[p.id];
					return typeof v === 'number' && Number.isFinite(v) ? v : null;
				});
				const absMax = Math.max(
					1e-9,
					...vals.filter((v): v is number => v != null).map((v) => Math.abs(v))
				);

				const bars: BarPeriod[] = periods.map((p, i) => {
					const value = vals[i];
					return {
						id: p.id,
						label: p.label,
						value,
						isLatest: i === periods.length - 1,
						widthPct: value == null ? 0 : (Math.abs(value) / absMax) * 100
					};
				});

				let deltaPct: number | null = null;
				if (vals.length >= 2) {
					const prior = vals[0];
					const latest = vals[vals.length - 1];
					if (prior != null && latest != null && prior !== 0) {
						deltaPct = ((latest - prior) / Math.abs(prior)) * 100;
					}
				}

				const row: MetricRow = {
					id: metric.id,
					label: metric.label,
					unit: metric.unit,
					bars,
					deltaPct
				};
				if (metric.note?.trim()) row.note = metric.note.trim();
				return row;
			});
	});

	const chartNotes = $derived.by((): string[] => {
		const notes: string[] = [];
		for (const row of metricRows) {
			if (row.note) notes.push(row.note);
		}
		const cmpNote = comparison?.note?.trim();
		if (cmpNote) notes.push(cmpNote);
		return notes;
	});

	const mixMax = $derived.by(() => {
		if (!mix?.segments?.length) return 100;
		return Math.max(100, ...mix.segments.map((s) => (Number.isFinite(s.value) ? s.value : 0)));
	});

	function formatDelta(pct: number): string {
		const sign = pct > 0 ? '+' : '';
		const abs = Math.abs(pct);
		const fixed = abs >= 100 ? pct.toFixed(0) : pct.toFixed(1);
		return `${sign}${fixed.replace(/\.0$/, '')}%`;
	}

	function setMode(next: ComparisonMode) {
		if (availableModes.includes(next)) modeOverride = next;
	}
</script>

{#if show}
	<div class="earn">
		<div class="earn-meta">
			{#if asOf}
				<span class="earn-meta__asof" title="As of">{asOf}</span>
				<span class="earn-meta__sep" aria-hidden="true">·</span>
			{/if}
			{#if sourceHref}
				<a
					class="earn-meta__source"
					href={sourceHref}
					rel="noopener noreferrer"
					target="_blank"
				>
					{sourceLabel}
				</a>
			{:else}
				<span class="earn-meta__source earn-meta__source--plain">{sourceLabel}</span>
			{/if}
			{#if outlookChip}
				<span class="earn-meta__sep" aria-hidden="true">·</span>
				<span class="outlook-chip" title="{outlookChip.label} {outlookChip.detail}">
					<span class="outlook-chip__label">{outlookChip.label}</span>
					<span class="outlook-chip__detail">{outlookChip.detail}</span>
				</span>
			{/if}
		</div>

		{#if hasComparison && comparison}
			<div class="earn-panel">
				<div class="earn-panel__head">
					<span class="earn-panel__title">{comparison.label}</span>
					{#if availableModes.length}
						<div class="earn-modes" role="group" aria-label="Comparison mode">
							{#each availableModes as m (m)}
								<button
									type="button"
									class="earn-chip"
									aria-pressed={mode === m}
									onclick={() => setMode(m)}
								>
									{MODE_LABELS[m]}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				{#if comparison.periods.length}
					<div class="earn-legend" aria-label="Period legend">
						{#each comparison.periods as period, i (period.id)}
							<span class={['leg', i === comparison.periods.length - 1 ? 'leg--latest' : 'leg--prior']}>
								{period.label}
							</span>
						{/each}
					</div>
				{/if}

				<div class="earn-metrics">
					{#each metricRows as row (row.id)}
						<div class="metric">
							<div class="metric__head">
								<span class="metric__label">{row.label}</span>
								{#if row.deltaPct != null}
									<span
										class={[
											'metric__delta',
											row.deltaPct > 0 ? 'up' : row.deltaPct < 0 ? 'down' : ''
										]}
									>
										{formatDelta(row.deltaPct)}
									</span>
								{/if}
							</div>
							<div class="metric__bars">
								{#each row.bars as bar (bar.id)}
									<div class="bar-row">
										<span class="bar-period">{bar.label}</span>
										<div class="bar-track">
											{#if bar.value != null}
												<div
													class={['bar-fill', bar.isLatest ? 'bar-fill--latest' : 'bar-fill--prior']}
													style="width: {bar.widthPct}%"
												></div>
											{/if}
										</div>
										<span class="bar-val">
											{bar.value != null ? formatEarningsValue(bar.value, row.unit) : '—'}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				{#if chartNotes.length}
					<ul class="earn-notes">
						{#each chartNotes as note, i (i)}
							<li>{note}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		{#if mix}
			<div class="earn-panel">
				<div class="earn-panel__head">
					<span class="earn-panel__title">{mix.label}</span>
				</div>
				<div class="mix-rows">
					{#each mix.segments as seg (seg.id)}
						{@const pct = Number.isFinite(seg.value) ? seg.value : 0}
						<div class="mix-row">
							<span class="mix-label">{seg.label}</span>
							<div class="bar-track">
								<div
									class="bar-fill bar-fill--latest"
									style="width: {(Math.max(0, pct) / mixMax) * 100}%"
								></div>
							</div>
							<span class="bar-val">{formatEarningsValue(pct, mix.unit || 'pct')}</span>
						</div>
					{/each}
				</div>
				{#if mix.note?.trim()}
					<p class="earn-notes earn-notes--single">{mix.note.trim()}</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.earn {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
	}

	.earn-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.45rem;
		font-size: 0.74rem;
		color: var(--ink-4);
		font-variant-numeric: tabular-nums;
		line-height: 1.35;
	}

	.earn-meta__asof {
		font-family: var(--mono);
	}

	.earn-meta__sep {
		color: var(--line);
	}

	.earn-meta__source {
		color: var(--ink-3);
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}

	.earn-meta__source:hover {
		color: var(--accent);
		border-bottom-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.earn-meta__source--plain {
		border-bottom: none;
	}

	.outlook-chip {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.3rem 0.45rem;
		padding: 0.15rem 0.45rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		font-size: 0.7rem;
		line-height: 1.3;
		color: var(--ink-3);
	}

	.outlook-chip__label {
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-size: 0.64rem;
		color: var(--accent);
	}

	.outlook-chip__detail {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
		color: var(--ink-2);
	}

	.earn-panel {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		overflow: hidden;
		min-width: 0;
	}

	.earn-panel__head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 0.75rem;
		padding: 0.65rem 1rem;
		background: var(--surface-2);
		border-bottom: 1px solid var(--line-soft);
	}

	.earn-panel__title {
		font-size: 0.72rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-3);
		min-width: 0;
	}

	.earn-modes {
		display: inline-flex;
		align-items: center;
		padding: 2px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		gap: 2px;
	}

	.earn-chip {
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

	.earn-chip:hover {
		color: var(--ink);
		background: rgba(255, 255, 255, 0.04);
	}

	.earn-chip[aria-pressed='true'] {
		background: var(--accent);
		color: var(--accent-ink);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.earn-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem 0.85rem;
		padding: 0.55rem 1rem 0.15rem;
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-4);
	}

	.leg {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.leg::before {
		content: '';
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 2px;
		background: currentColor;
	}

	.leg--prior {
		color: var(--ink-4);
	}

	.leg--latest {
		color: var(--accent);
	}

	.earn-metrics {
		display: grid;
		gap: 0.85rem;
		padding: 0.65rem 1rem 0.9rem;
	}

	.metric__head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
	}

	.metric__label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ink);
		min-width: 0;
	}

	.metric__delta {
		font-family: var(--mono);
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--ink-4);
		flex: 0 0 auto;
	}

	.metric__delta.up {
		color: var(--up);
	}

	.metric__delta.down {
		color: var(--down);
	}

	.metric__bars,
	.mix-rows {
		display: grid;
		gap: 0.28rem;
	}

	.bar-row,
	.mix-row {
		display: grid;
		grid-template-columns: 3.25rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.45rem 0.55rem;
		min-width: 0;
	}

	.mix-row {
		grid-template-columns: minmax(5.5rem, 8.5rem) minmax(0, 1fr) auto;
		padding: 0 1rem;
	}

	.mix-rows {
		padding: 0.75rem 0 0.9rem;
		gap: 0.4rem;
	}

	.bar-period,
	.mix-label {
		font-size: 0.68rem;
		color: var(--ink-4);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mix-label {
		font-size: 0.76rem;
		color: var(--ink-3);
		white-space: normal;
	}

	.bar-track {
		position: relative;
		height: 0.55rem;
		background: color-mix(in srgb, var(--line-soft) 80%, transparent);
		border-radius: 2px;
		overflow: hidden;
		min-width: 0;
	}

	.bar-fill {
		height: 100%;
		border-radius: 2px;
		min-width: 2px;
	}

	.bar-fill--prior {
		background: color-mix(in srgb, var(--ink-4) 70%, transparent);
	}

	.bar-fill--latest {
		background: var(--accent);
	}

	.bar-val {
		font-family: var(--mono);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: var(--ink-2);
		text-align: right;
		min-width: 3.5rem;
	}

	.earn-notes {
		margin: 0;
		padding: 0.55rem 1rem 0.75rem;
		border-top: 1px solid var(--line-soft);
		background: var(--surface-2);
		list-style: none;
		display: grid;
		gap: 0.25rem;
		font-size: 0.72rem;
		line-height: 1.4;
		color: var(--ink-4);
	}

	.earn-notes--single {
		display: block;
	}

	.earn-notes li {
		padding: 0;
	}

	.earn-notes li::before {
		content: '·';
		margin-right: 0.35rem;
		color: var(--ink-4);
	}

	@media (max-width: 40rem) {
		.earn-panel__head {
			padding: 0.55rem 0.85rem;
		}

		.earn-metrics {
			padding: 0.55rem 0.85rem 0.75rem;
		}

		.earn-legend {
			padding: 0.45rem 0.85rem 0.1rem;
		}

		.bar-row {
			grid-template-columns: 2.75rem minmax(0, 1fr) auto;
			gap: 0.35rem 0.4rem;
		}

		.mix-row {
			grid-template-columns: minmax(4.5rem, 1fr) minmax(0, 1.4fr) auto;
			padding: 0 0.85rem;
		}

		.bar-val {
			min-width: 3rem;
			font-size: 0.68rem;
		}

		.earn-notes {
			padding: 0.45rem 0.85rem 0.65rem;
		}

		.outlook-chip {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.earn-chip {
			transition: none;
		}
	}
</style>
