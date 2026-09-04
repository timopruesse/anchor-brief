<script lang="ts">
	import StoryCard from './StoryCard.svelte';
	import StoryFilters from './StoryFilters.svelte';
	import { sortStoriesByWeight } from '$lib/format';
	import { StoryFilterEngine } from '$lib/storyFilter.svelte';
	import type { Story } from '$lib/types';

	type Density = 'editorial' | 'compact';
	const DENSITY_KEY = 'anchor-brief:density';

	interface Props {
		stories: Story[];
		generatedAt?: string;
		timezone?: string;
	}

	let { stories, generatedAt, timezone = 'Europe/Berlin' }: Props = $props();

	let density = $state<Density>('editorial');

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			try {
				const saved = localStorage.getItem(DENSITY_KEY);
				if (saved === 'compact' || saved === 'editorial') {
					density = saved;
				}
			} catch {
				/* ignore */
			}
		}
	});

	function setDensity(d: Density) {
		density = d;
		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(DENSITY_KEY, d);
			} catch {
				/* ignore */
			}
		}
	}

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

	const leadStories = $derived(filterEngine.filtered.filter((s) => s.weight === 'lead'));
	const normalStories = $derived(
		filterEngine.filtered.filter((s) => !s.weight || s.weight === 'normal')
	);
	const briefStories = $derived(filterEngine.filtered.filter((s) => s.weight === 'brief'));
	const hasBriefDivider = $derived(
		briefStories.length > 0 && (leadStories.length > 0 || normalStories.length > 0)
	);
</script>

<StoryFilters
	topics={filterEngine.topicFacets}
	activeTopic={filterEngine.activeTopic}
	query={filterEngine.query}
	statusText={filterEngine.statusText}
	{density}
	onDensity={setDensity}
	onTopic={(t) => filterEngine.setTopic(t)}
	onQuery={(q) => filterEngine.setQuery(q)}
	onReset={() => filterEngine.reset()}
/>

<section class="wrap" aria-label="Stories">
	{#if filterEngine.filtered.length}
		<div class="stories" id="stories" data-density={density}>
			{#each leadStories as story (story.id)}
				<StoryCard
					{story}
					query={filterEngine.query.trim()}
					{generatedAt}
					{timezone}
					{density}
				/>
			{/each}

			{#each normalStories as story (story.id)}
				<StoryCard
					{story}
					query={filterEngine.query.trim()}
					{generatedAt}
					{timezone}
					{density}
				/>
			{/each}

			{#if hasBriefDivider}
				<div class="brief-heading" role="separator" aria-label="In brief">
					<span class="brief-heading__title">In brief</span>
					<span class="brief-heading__line" aria-hidden="true"></span>
				</div>
			{/if}

			{#each briefStories as story (story.id)}
				<StoryCard
					{story}
					query={filterEngine.query.trim()}
					{generatedAt}
					{timezone}
					{density}
				/>
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

