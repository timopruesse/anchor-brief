<script lang="ts">
	import StoryCard from './StoryCard.svelte';
	import StoryFilters from './StoryFilters.svelte';
	import { fold, sortStoriesByWeight } from '$lib/format';
	import type { Story } from '$lib/types';

	interface Props {
		stories: Story[];
		generatedAt?: string;
		timezone?: string;
	}

	let { stories, generatedAt, timezone = 'Europe/Berlin' }: Props = $props();

	let activeTopic = $state<string | null>(null);
	let query = $state('');

	const sorted = $derived(sortStoriesByWeight(stories));

	const topicCounts = $derived.by(() => {
		const map = new Map<string, number>();
		for (const s of sorted) {
			for (const t of s.topics ?? []) map.set(t, (map.get(t) ?? 0) + 1);
		}
		return [...map.entries()]
			.map(([topic, count]) => ({ topic, count }))
			.sort((a, b) => a.topic.localeCompare(b.topic));
	});

	const filtered = $derived.by(() => {
		const q = fold(query.trim());
		return sorted.filter((s) => {
			if (activeTopic && !(s.topics ?? []).includes(activeTopic)) return false;
			if (!q) return true;
			const hay = fold(
				[s.title, ...(s.facts ?? []), s.whyItMatters, ...(s.topics ?? [])].join(' ')
			);
			return hay.includes(q);
		});
	});

	const statusText = $derived.by(() => {
		const n = filtered.length;
		const total = sorted.length;
		if (!activeTopic && !query.trim()) {
			return `${total} stor${total === 1 ? 'y' : 'ies'}`;
		}
		return `Showing ${n} of ${total}`;
	});
</script>

<StoryFilters
	topics={topicCounts}
	{activeTopic}
	{query}
	{statusText}
	onTopic={(t) => (activeTopic = t)}
	onQuery={(q) => (query = q)}
	onReset={() => {
		activeTopic = null;
		query = '';
	}}
/>

<section class="wrap" aria-label="Stories">
	{#if filtered.length}
		<div class="stories" id="stories">
			{#each filtered as story (story.id)}
				<StoryCard {story} query={query.trim()} {generatedAt} {timezone} />
			{/each}
		</div>
	{:else}
		<div class="empty">
			<p class="empty__title">Nothing matches</p>
			<p class="empty__body">No story in this briefing matches the current topic and search filters.</p>
			<button
				type="button"
				class="iconbtn"
				onclick={() => {
					activeTopic = null;
					query = '';
				}}
			>
				Clear filters
			</button>
		</div>
	{/if}
</section>
