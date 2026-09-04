<script lang="ts">
	import { resolve } from '$app/paths';
	import StoryCard from './StoryCard.svelte';
	import StoryFilters from './StoryFilters.svelte';
	import { editionLabel, fold, makeFormatters, toDate } from '$lib/format';
	import type { EditionSummary, IndexedStory } from '$lib/types';

	interface Props {
		/** Main-desk edition summaries only (for the archive list). */
		editions: EditionSummary[];
		/** GME siblings keyed for archive cards — never mixed into story search. */
		gmeEditions: EditionSummary[];
		/** Main-desk stories only for cross-day search/filters. */
		indexed: IndexedStory[];
	}

	let { editions, gmeEditions, indexed }: Props = $props();

	let activeTopic = $state<string | null>(null);
	let query = $state('');

	const mainEditions = $derived(editions.filter((e) => e.desk === 'main'));

	const gmeByParent = $derived.by(() => {
		const map = new Map<string, EditionSummary>();
		for (const e of gmeEditions) {
			if (e.parentId) map.set(e.parentId, e);
		}
		return map;
	});

	const topicCounts = $derived.by(() => {
		const map = new Map<string, number>();
		for (const row of indexed) {
			for (const t of row.story.topics ?? []) map.set(t, (map.get(t) ?? 0) + 1);
		}
		return [...map.entries()]
			.map(([topic, count]) => ({ topic, count }))
			.sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
	});

	const filtered = $derived.by(() => {
		const q = fold(query.trim());
		return indexed.filter((row) => {
			if (activeTopic && !(row.story.topics ?? []).includes(activeTopic)) return false;
			if (!q) return true;
			const hay = fold(
				[
					row.story.title,
					...(row.story.facts ?? []),
					row.story.whyItMatters,
					...(row.story.topics ?? []),
					row.headline,
					row.editionId
				].join(' ')
			);
			return hay.includes(q);
		});
	});

	const searching = $derived(Boolean(activeTopic || query.trim()));

	const statusText = $derived.by(() => {
		if (!searching) {
			return `${indexed.length} main-desk stories across ${mainEditions.length} briefings — search to filter across days`;
		}
		return `Showing ${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'} across main editions`;
	});
</script>

<section class="page-intro wrap">
	<h1>Archive</h1>
	<p>
		Browse past main editions, or search and filter <strong>main-desk</strong> stories across days.
		GME desk editions stay on their own schema and pages — linked from each card, not mixed into this
		feed.
	</p>
</section>

<StoryFilters
	topics={topicCounts}
	{activeTopic}
	{query}
	{statusText}
	searchPlaceholder="Search main editions across days…"
	onTopic={(t) => (activeTopic = t)}
	onQuery={(q) => (query = q)}
	onReset={() => {
		activeTopic = null;
		query = '';
	}}
/>

{#if searching}
	<section class="wrap cross-results" aria-label="Cross-day results">
		{#if filtered.length}
			<div class="stories" id="stories">
				{#each filtered as row (`${row.editionId}:${row.story.id}`)}
					{@const edLabel = editionLabel(row.edition)}
					<StoryCard
						story={row.story}
						query={query.trim()}
						generatedAt={row.generatedAt}
						editionHref={resolve(`/brief/${row.editionId}`)}
						editionLabel={edLabel}
					/>
				{/each}
			</div>
		{:else}
			<div class="empty">
				<p class="empty__title">Nothing matches</p>
				<p class="empty__body">No main-desk story matches the current filters.</p>
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
{:else}
	<section class="wrap archive-list-wrap" aria-label="Past editions">
		<ul class="archive-list">
			{#each mainEditions as ed (ed.id)}
				{@const gme = gmeByParent.get(ed.id)}
				{@const d = toDate(ed.generatedAt)}
				{@const fmt = makeFormatters('Europe/Berlin')}
				<li>
					<div class="archive-card">
						<a class="main" href={resolve(`/brief/${ed.id}`)}>
							<span class="ed">{editionLabel(ed.edition)}</span>
							<span class="hl">{ed.headline}</span>
							{#if d}
								<time datetime={ed.generatedAt}>{fmt.stamp(d)}</time>
							{/if}
						</a>
						{#if gme}
							<a class="gme" href={resolve(`/brief/${gme.id}`)}>GME</a>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
		{#if gmeEditions.length && !mainEditions.length}
			<p class="empty__body">No main editions yet. GME desks live at <a href={resolve('/gme')}>/gme</a>.</p>
		{/if}
	</section>
{/if}
