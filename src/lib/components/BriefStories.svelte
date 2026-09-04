<script lang="ts">
	import StoryCard from './StoryCard.svelte';
	import StoryFilters from './StoryFilters.svelte';
	import { sortStoriesByWeight } from '$lib/format';
	import { StoryFilterEngine } from '$lib/storyFilter.svelte';
	import type { Story } from '$lib/types';

	interface Props {
		stories: Story[];
		generatedAt?: string;
		timezone?: string;
	}

	let { stories, generatedAt, timezone = 'Europe/Berlin' }: Props = $props();

	const sorted = $derived(sortStoriesByWeight(stories));

	const filterEngine = new StoryFilterEngine<Story>({
		getItems: () => sorted,
		extractTopics: (s) => s.topics ?? [],
		extractSearchFields: (s) => [
			s.title,
			...(s.facts ?? []),
			s.whyItMatters ?? '',
			...(s.topics ?? [])
		]
	});
</script>

<StoryFilters
	topics={filterEngine.topicFacets}
	activeTopic={filterEngine.activeTopic}
	query={filterEngine.query}
	statusText={filterEngine.statusText}
	onTopic={(t) => filterEngine.setTopic(t)}
	onQuery={(q) => filterEngine.setQuery(q)}
	onReset={() => filterEngine.reset()}
/>

<section class="wrap" aria-label="Stories">
	{#if filterEngine.filtered.length}
		<div class="stories" id="stories">
			{#each filterEngine.filtered as story (story.id)}
				<StoryCard {story} query={filterEngine.query.trim()} {generatedAt} {timezone} />
			{/each}
		</div>
	{:else}
		<div class="empty">
			<p class="empty__title">Nothing matches</p>
			<p class="empty__body">No story in this briefing matches the current topic and search filters.</p>
			<button
				type="button"
				class="iconbtn"
				onclick={() => filterEngine.reset()}
			>
				Clear filters
			</button>
		</div>
	{/if}
</section>
