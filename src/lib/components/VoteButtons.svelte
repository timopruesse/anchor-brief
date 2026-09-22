<script lang="ts">
	import { votes } from '$lib/votes.svelte';
	import { voteStorageKey, type VoteValue } from '$lib/votes';

	interface Props {
		briefId: string;
		itemId: string;
		/** Quieter chrome for roundup bullets. */
		compact?: boolean;
		label?: string;
	}

	let { briefId, itemId, compact = false, label = 'Was this useful?' }: Props = $props();

	const current = $derived(votes.map[voteStorageKey(briefId, itemId)] ?? 0);

	function cast(vote: VoteValue) {
		votes.cast(briefId, itemId, vote);
	}
</script>

<div
	class="vote"
	class:vote--compact={compact}
	role="group"
	aria-label={label}
>
	<button
		type="button"
		class="vote__btn"
		class:vote__btn--on={current === 1}
		aria-pressed={current === 1}
		aria-label="Upvote"
		onclick={() => cast(1)}
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
			<path
				d="M7 11v9a1 1 0 0 0 1 1h7.4a2 2 0 0 0 1.9-1.4l2.1-6.3A1.8 1.8 0 0 0 17.5 11H14V5.5A2.5 2.5 0 0 0 11.5 3h-.3a1.2 1.2 0 0 0-1.2 1l-.8 5.2A2 2 0 0 1 7.3 11H7zM4 11v10"
				stroke-linecap="round"
				stroke-linejoin="round"
			></path>
		</svg>
	</button>
	<button
		type="button"
		class="vote__btn"
		class:vote__btn--on={current === -1}
		aria-pressed={current === -1}
		aria-label="Downvote"
		onclick={() => cast(-1)}
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
			<path
				d="M17 13V4a1 1 0 0 0-1-1H8.6a2 2 0 0 0-1.9 1.4L4.6 10.7A1.8 1.8 0 0 0 6.5 13H10v5.5A2.5 2.5 0 0 0 12.5 21h.3a1.2 1.2 0 0 0 1.2-1l.8-5.2A2 2 0 0 1 16.7 13H17zM20 13V3"
				stroke-linecap="round"
				stroke-linejoin="round"
			></path>
		</svg>
	</button>
</div>

<style>
	.vote {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.vote__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--tap);
		height: var(--tap);
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--ink-4);
		cursor: pointer;
		transition:
			color 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease;
	}

	.vote__btn svg {
		width: 1.05rem;
		height: 1.05rem;
		flex: none;
	}

	.vote__btn:hover {
		color: var(--ink-2);
		border-color: var(--line);
		background: var(--surface-2);
	}

	.vote__btn--on {
		color: var(--accent);
		border-color: var(--accent-line);
		background: var(--accent-soft);
	}

	.vote__btn--on:hover {
		color: var(--accent);
		border-color: var(--accent-line);
		background: var(--accent-soft);
	}

	.vote--compact .vote__btn {
		width: 1.85rem;
		height: 1.85rem;
	}

	.vote--compact .vote__btn svg {
		width: 0.9rem;
		height: 0.9rem;
	}

	@media (min-width: 34rem) {
		.vote:not(.vote--compact) .vote__btn {
			width: 2.15rem;
			height: 2.15rem;
		}
	}
</style>
