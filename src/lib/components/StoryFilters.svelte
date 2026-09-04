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
		density?: 'editorial' | 'compact';
		onDensity?: (density: 'editorial' | 'compact') => void;
	}

	let {
		topics,
		activeTopic,
		query,
		statusText,
		onTopic,
		onQuery,
		onReset,
		searchPlaceholder = 'Search titles and facts…',
		density = 'editorial',
		onDensity
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

		<div class="status-bar">
			<p class="status" role="status" aria-live="polite">
				<span>{statusText}</span>
				{#if hasFilters}
					<button type="button" class="status__reset" onclick={onReset}>Clear filters</button>
				{/if}
			</p>

			{#if onDensity}
				<div class="density-group" role="group" aria-label="Reading density">
					<button
						type="button"
						class="density-btn"
						class:active={density === 'editorial'}
						aria-pressed={density === 'editorial'}
						onclick={() => onDensity('editorial')}
						title="Editorial view"
					>
						<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<rect x="3" y="3" width="7" height="7"></rect>
							<rect x="14" y="3" width="7" height="7"></rect>
							<rect x="14" y="14" width="7" height="7"></rect>
							<rect x="3" y="14" width="7" height="7"></rect>
						</svg>
						<span>Editorial</span>
					</button>
					<button
						type="button"
						class="density-btn"
						class:active={density === 'compact'}
						aria-pressed={density === 'compact'}
						onclick={() => onDensity('compact')}
						title="Compact view"
					>
						<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<line x1="3" y1="6" x2="21" y2="6"></line>
							<line x1="3" y1="12" x2="21" y2="12"></line>
							<line x1="3" y1="18" x2="21" y2="18"></line>
						</svg>
						<span>Compact</span>
					</button>
				</div>
			{/if}
		</div>
	</div>
</section>
