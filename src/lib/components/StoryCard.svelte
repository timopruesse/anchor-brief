<script lang="ts">
	import Highlight from './Highlight.svelte';
	import SourceChip from './SourceChip.svelte';
	import { normalizeFact } from '$lib/facts';
	import { gradientFor, safeHref } from '$lib/format';
	import { theme } from '$lib/theme.svelte';
	import type { Story } from '$lib/types';

	interface Props {
		story: Story;
		query?: string;
		generatedAt?: string;
		timezone?: string;
		editionHref?: string | null;
		editionLabel?: string | null;
		desk?: 'main' | 'gme';
		density?: 'editorial' | 'compact';
	}

	let {
		story,
		query = '',
		generatedAt,
		timezone = 'Europe/Berlin',
		editionHref = null,
		editionLabel = null,
		desk = 'main',
		density = 'editorial'
	}: Props = $props();

	let expanded = $state(false);
	let imgFailed = $state(false);

	const weight = $derived(story.weight || 'normal');
	const facts = $derived((story.facts ?? []).map(normalizeFact));

	const defaultVisibleCount = $derived.by(() => {
		if (density === 'compact') return 0;
		if (weight === 'lead') return 3;
		if (weight === 'brief') return 1;
		return 2;
	});

	const hiddenCount = $derived(Math.max(0, facts.length - defaultVisibleCount));
	const visibleFacts = $derived(expanded ? facts : facts.slice(0, defaultVisibleCount));
	/** Footnotes list — only sources with a safe http(s) href. */
	const sources = $derived(
		(story.sources ?? [])
			.map((s) => ({ ...s, href: safeHref(s.url) }))
			.filter((s): s is typeof s & { href: string } => Boolean(s.href))
	);

	const ph = $derived(gradientFor(story.id || story.title, theme.isLight));

	/** Resolve per-fact chips by original `sources[]` index (schema contract). */
	function factSources(indexes: number[] | undefined) {
		if (!indexes?.length) return [];
		const raw = story.sources ?? [];
		const out: Array<(typeof raw)[number] & { href: string }> = [];
		for (const i of indexes) {
			const s = raw[i];
			if (!s) continue;
			const href = safeHref(s.url);
			if (!href) continue;
			out.push({ ...s, href });
		}
		return out;
	}
</script>

<article
	class="story"
	class:story--gme={desk === 'gme'}
	class:story--lead={weight === 'lead'}
	class:story--brief={weight === 'brief'}
	class:story--compact={density === 'compact'}
	data-weight={weight}
	id={story.id}
>
	<div class="story__eyebrow">
		{#if weight === 'lead'}
			<span class="flag">Lead</span>
		{:else if weight === 'brief'}
			<span class="flag">Brief</span>
		{/if}
		{#if story.topics?.length}
			<ul class="tags">
				{#each story.topics as topic (topic)}
					<li class="tag">{topic}</li>
				{/each}
			</ul>
		{/if}
	</div>

	<h2 class="story__title">
		<a href="#{story.id}"><Highlight text={story.title} {query} /></a>
	</h2>

	{#if editionHref && editionLabel}
		<p class="story__edition">
			From <a href={editionHref}>{editionLabel}</a>
		</p>
	{/if}

	{#if story.image?.url}
		<figure class="figure">
			<div
				class="figure__frame"
				style:--ph-gradient={ph}
				data-img={imgFailed ? 'failed' : 'ok'}
			>
				<img
					src={story.image.url}
					alt={story.image.alt || ''}
					loading="lazy"
					decoding="async"
					onerror={() => (imgFailed = true)}
				/>
			</div>
			{#if story.image.credit}
				<figcaption>
					{#if story.image.creditUrl && safeHref(story.image.creditUrl)}
						<a href={safeHref(story.image.creditUrl)!} rel="noopener noreferrer" target="_blank">
							{story.image.credit}
						</a>
					{:else}
						{story.image.credit}
					{/if}
				</figcaption>
			{/if}
		</figure>
	{/if}

	{#if visibleFacts.length}
		<ul class="facts">
			{#each visibleFacts as fact, i (`${i}:${fact.text}`)}
				{@const linked = factSources(fact.sourceIndexes)}
				<li class:facts__item--linked={linked.length > 0}>
					<span class="facts__text"><Highlight text={fact.text} {query} /></span>
					{#if linked.length}
						<span class="facts__sources">
							{#each linked as src (src.href + src.label)}
								<SourceChip {src} compact {generatedAt} {timezone} />
							{/each}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if hiddenCount > 0}
		<button
			type="button"
			class="toggle"
			aria-expanded={expanded}
			onclick={() => (expanded = !expanded)}
		>
			<svg class="toggle__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
				<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"></path>
			</svg>
			{expanded ? 'Show fewer facts' : `Show ${hiddenCount} more fact${hiddenCount === 1 ? '' : 's'}`}
		</button>
	{/if}

	{#if story.whyItMatters}
		<div class="story__takeaway" class:story__takeaway--lead={weight === 'lead'}>
			<span class="takeaway-label">Why it matters &mdash;</span>
			<span class="takeaway-text">{story.whyItMatters}</span>
		</div>
	{/if}

	{#if sources.length}
		<nav class="story__sources" aria-label="Sources">
			<span class="sources__label">Sources</span>
			<ul class="sources__list">
				{#each sources as src (src.href + src.label)}
					<li class="sources__item">
						<SourceChip {src} {generatedAt} {timezone} />
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</article>
