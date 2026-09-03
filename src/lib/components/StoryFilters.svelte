<script lang="ts">
	interface TopicCount {
		topic: string;
		count: number;
	}

	interface Props {
		topics: TopicCount[];
		activeTopic: string | null;
		query: string;
		statusText: string;
		onTopic: (topic: string | null) => void;
		onQuery: (q: string) => void;
		onReset: () => void;
		searchPlaceholder?: string;
	}

	let {
		topics,
		activeTopic,
		query,
		statusText,
		onTopic,
		onQuery,
		onReset,
		searchPlaceholder = 'Search titles and facts…'
	}: Props = $props();

	const hasFilters = $derived(Boolean(activeTopic || query.trim()));
</script>

<section class="controls" aria-label="Filter stories">
	<div class="wrap controls__inner">
		{#if topics.length}
			<fieldset class="chips">
				<legend class="sr-only">Filter by topic</legend>
				<button
					type="button"
					class="chip"
					aria-pressed={!activeTopic}
					onclick={() => onTopic(null)}
				>
					All
				</button>
				{#each topics as t (t.topic)}
					<button
						type="button"
						class="chip"
						aria-pressed={activeTopic === t.topic}
						data-empty={t.count === 0 ? 'true' : 'false'}
						onclick={() => onTopic(activeTopic === t.topic ? null : t.topic)}
					>
						{t.topic}
						<span class="chip__count">{t.count}</span>
					</button>
				{/each}
			</fieldset>
		{/if}

		<div class="searchrow">
			<div class="search" data-filled={query ? 'true' : 'false'}>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<circle cx="10.5" cy="10.5" r="6.2"></circle>
					<path d="M15.2 15.2 20 20"></path>
				</svg>
				<label class="sr-only" for="search">Search titles and facts</label>
				<input
					type="search"
					id="search"
					placeholder={searchPlaceholder}
					autocomplete="off"
					spellcheck="false"
					enterkeyhint="search"
					value={query}
					oninput={(e) => onQuery(e.currentTarget.value)}
				/>
				<button
					type="button"
					class="search__clear"
					aria-label="Clear search"
					onclick={() => onQuery('')}
				>
					&times;
				</button>
			</div>
		</div>

		<p class="status" role="status" aria-live="polite">
			<span>{statusText}</span>
			{#if hasFilters}
				<button type="button" class="status__reset" onclick={onReset}>Clear filters</button>
			{/if}
		</p>
	</div>
</section>
