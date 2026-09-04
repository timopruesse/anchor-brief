<script lang="ts">
	import Highlight from './Highlight.svelte';
	import {
		KIND_LABELS,
		formatSourceTime,
		gradientFor,
		safeHref
	} from '$lib/format';
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
	const facts = $derived(story.facts ?? []);

	const defaultVisibleCount = $derived.by(() => {
		if (density === 'compact') return 0;
		if (weight === 'lead') return 3;
		if (weight === 'brief') return 1;
		return 2;
	});

	const hiddenCount = $derived(Math.max(0, facts.length - defaultVisibleCount));
	const visibleFacts = $derived(expanded ? facts : facts.slice(0, defaultVisibleCount));
	const sources = $derived(
		(story.sources ?? [])
			.map((s) => ({ ...s, href: safeHref(s.url) }))
			.filter((s) => s.href)
	);

	const ph = $derived(gradientFor(story.id || story.title, theme.isLight));
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
			{#each visibleFacts as fact (fact)}
				<li><Highlight text={fact} {query} /></li>
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
						<a
							class="source-chip"
							data-kind={src.kind}
							href={src.href!}
							rel="noopener noreferrer"
							target="_blank"
						>
							{#if src.kind === 'x'}
								<span class="source-chip__badge source-chip__badge--x" title="Post on X">
									<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" aria-hidden="true">
										<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
									</svg>
									<span>X</span>
								</span>
							{:else if src.kind === 'primary'}
								<span class="source-chip__badge source-chip__badge--primary" title="Primary reporting or filing">
									<span class="primary-dot" aria-hidden="true"></span>
									<span>Primary</span>
								</span>
							{:else}
								<span class="source-chip__badge source-chip__badge--article" title="News reporting">
									<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
										<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
										<path d="M8 7h8M8 11h8M8 15h5"/>
									</svg>
									<span>Article</span>
								</span>
							{/if}

							<span class="source-chip__label">{src.label}</span>

							{#if src.time}
								{@const timeStr = formatSourceTime(src.time, generatedAt, timezone)}
								{#if timeStr}
									<time class="source-chip__time" datetime={src.time} title="Published {src.time}">
										{timeStr}
									</time>
								{/if}
							{/if}

							<svg class="source-chip__outbound" viewBox="0 0 12 12" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8"/>
							</svg>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</article>
