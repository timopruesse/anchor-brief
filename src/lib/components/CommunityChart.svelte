<script lang="ts">
	import {
		COMMUNITY_KINDS,
		COMMUNITY_KIND_LABELS,
		shortBerlinDate
	} from '$lib/community';
	import type { CommunityDay, CommunityKind } from '$lib/types';

	interface Props {
		history: CommunityDay[];
	}

	let { history }: Props = $props();

	const W = 560;
	const H = 168;
	const PAD = { top: 12, right: 8, bottom: 28, left: 28 };
	const GAP = 0.28;

	const series = $derived(
		[...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
	);

	const maxPosts = $derived(
		Math.max(1, ...series.map((d) => d.posts || d.dd + d.daily + d.news + d.junk))
	);

	interface StackSeg {
		kind: CommunityKind;
		count: number;
		y: number;
		h: number;
	}

	interface StackBar {
		date: string;
		label: string;
		x: number;
		w: number;
		segs: StackSeg[];
		total: number;
	}

	const bars = $derived.by((): StackBar[] => {
		const n = series.length;
		if (!n) return [];
		const innerW = W - PAD.left - PAD.right;
		const innerH = H - PAD.top - PAD.bottom;
		const slot = innerW / n;
		const barW = Math.max(4, slot * (1 - GAP));

		return series.map((day, i) => {
			const total = day.posts || day.dd + day.daily + day.news + day.junk;
			let yCursor = PAD.top + innerH;
			const segs: StackSeg[] = [];
			for (const kind of COMMUNITY_KINDS) {
				const count = day[kind] ?? 0;
				if (count <= 0) continue;
				const h = (count / maxPosts) * innerH;
				yCursor -= h;
				segs.push({ kind, count, y: yCursor, h });
			}
			return {
				date: day.date,
				label: shortBerlinDate(day.date),
				x: PAD.left + i * slot + (slot - barW) / 2,
				w: barW,
				segs,
				total
			};
		});
	});

	const yTicks = $derived.by(() => {
		const top = maxPosts;
		const mid = Math.round(top / 2);
		return mid > 0 && mid !== top ? [0, mid, top] : [0, top];
	});

	function yFor(value: number): number {
		const innerH = H - PAD.top - PAD.bottom;
		return PAD.top + innerH * (1 - value / maxPosts);
	}

	const showEvery = $derived(series.length > 8 ? 2 : 1);
</script>

{#if series.length}
	<figure class="comm-chart">
		<svg
			viewBox="0 0 {W} {H}"
			role="img"
			aria-label="Superstonk posts by kind over the last {series.length} days"
		>
			{#each yTicks as tick (tick)}
				{@const y = yFor(tick)}
				<line class="grid" x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} />
				<text class="tick" x={PAD.left - 6} y={y + 3} text-anchor="end">{tick}</text>
			{/each}

			{#each bars as bar (bar.date)}
				{#each bar.segs as seg (seg.kind)}
					<rect
						class="seg seg-{seg.kind}"
						x={bar.x}
						y={seg.y}
						width={bar.w}
						height={Math.max(seg.h, 0.5)}
						rx="1.5"
					>
						<title>{bar.label}: {COMMUNITY_KIND_LABELS[seg.kind]} · {seg.count}</title>
					</rect>
				{/each}
			{/each}

			{#each bars as bar, i (bar.date + '-lbl')}
				{#if i % showEvery === 0 || i === bars.length - 1}
					<text class="xlabel" x={bar.x + bar.w / 2} y={H - 8} text-anchor="middle">
						{bar.label}
					</text>
				{/if}
			{/each}
		</svg>

		<figcaption class="legend" aria-label="Kind legend">
			{#each COMMUNITY_KINDS as kind (kind)}
				<span class="leg leg-{kind}">{COMMUNITY_KIND_LABELS[kind]}</span>
			{/each}
		</figcaption>
	</figure>
{/if}

<style>
	.comm-chart {
		margin: 0.85rem 0 1rem;
		padding: 0.75rem 0.7rem 0.55rem;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 12px;
		min-width: 0;
	}

	.comm-chart svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.grid {
		stroke: var(--line-soft);
		stroke-width: 1;
	}

	.tick {
		fill: var(--ink-4);
		font-size: 9px;
		font-family: var(--sans);
	}

	.xlabel {
		fill: var(--ink-4);
		font-size: 9px;
		font-family: var(--sans);
	}

	.seg-dd {
		fill: var(--accent);
	}
	.seg-daily {
		fill: #c48a4a;
	}
	.seg-news {
		fill: #8a7460;
	}
	.seg-junk {
		fill: #4a423a;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem 0.75rem;
		margin: 0.5rem 0 0;
		padding: 0.15rem 0 0;
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-3);
		border-top: 1px solid var(--line-soft);
		padding-top: 0.55rem;
	}

	.leg {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 1.6rem;
	}

	.leg::before {
		content: '';
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 2px;
		background: currentColor;
	}

	.leg-dd {
		color: var(--accent);
	}
	.leg-daily {
		color: #c48a4a;
	}
	.leg-news {
		color: #8a7460;
	}
	.leg-junk {
		color: #6a6158;
	}

	@media (max-width: 40rem) {
		.comm-chart {
			padding: 0.65rem 0.55rem 0.5rem;
			border-radius: 10px;
		}

		.tick,
		.xlabel {
			font-size: 8px;
		}

		.legend {
			gap: 0.35rem 0.65rem;
			font-size: 0.66rem;
		}
	}

	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme='dark'])) .seg-junk {
			fill: #d4c8b8;
		}
		:global(:root:not([data-theme='dark'])) .leg-junk {
			color: #9a8c7a;
		}
		:global(:root:not([data-theme='dark'])) .seg-daily {
			fill: #b87333;
		}
		:global(:root:not([data-theme='dark'])) .leg-daily {
			color: #b87333;
		}
		:global(:root:not([data-theme='dark'])) .seg-news {
			fill: #6e5a48;
		}
		:global(:root:not([data-theme='dark'])) .leg-news {
			color: #6e5a48;
		}
	}

	:global(:root[data-theme='light']) .seg-junk {
		fill: #d4c8b8;
	}
	:global(:root[data-theme='light']) .leg-junk {
		color: #9a8c7a;
	}
	:global(:root[data-theme='light']) .seg-daily {
		fill: #b87333;
	}
	:global(:root[data-theme='light']) .leg-daily {
		color: #b87333;
	}
	:global(:root[data-theme='light']) .seg-news {
		fill: #6e5a48;
	}
	:global(:root[data-theme='light']) .leg-news {
		color: #6e5a48;
	}
</style>
