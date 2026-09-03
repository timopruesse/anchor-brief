<script lang="ts">
	import Highlight from './Highlight.svelte';
	import {
		KIND_LABELS,
		formatSourceTime,
		gradientFor,
		safeHref
	} from '$lib/format';
	import type { Story } from '$lib/types';

	const VISIBLE_FACTS = 3;

	interface Props {
		story: Story;
		query?: string;
		generatedAt?: string;
		timezone?: string;
		editionHref?: string | null;
		editionLabel?: string | null;
	}

	let {
		story,
		query = '',
		generatedAt,
		timezone = 'Europe/Berlin',
		editionHref = null,
		editionLabel = null
	}: Props = $props();

	let expanded = $state(false);
	let imgFailed = $state(false);

	const weight = $derived(story.weight || 'normal');
	const facts = $derived(story.facts ?? []);
	const hiddenCount = $derived(Math.max(0, facts.length - VISIBLE_FACTS));
	const visibleFacts = $derived(expanded ? facts : facts.slice(0, VISIBLE_FACTS));
	const sources = $derived(
		(story.sources ?? [])
			.map((s) => ({ ...s, href: safeHref(s.url) }))
			.filter((s) => s.href)
	);

	const ph = $derived(
		gradientFor(
			story.id || story.title,
			typeof document !== 'undefined' &&
				document.documentElement.getAttribute('data-theme') === 'light'
		)
	);
</script>

<article class="story" data-weight={weight} id={story.id}>
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
		<div class="why">
			<div class="why__label">Why it matters</div>
			<p>{story.whyItMatters}</p>
		</div>
	{/if}

	{#if sources.length}
		<nav class="sources" aria-label="Sources">
			<ul>
				{#each sources as src (src.href + src.label)}
					<li>
						<a class="source" href={src.href!} rel="noopener noreferrer" target="_blank">
							<span class="kind" data-kind={src.kind}>{KIND_LABELS[src.kind] ?? src.kind}</span>
							<span class="source__label">{src.label}</span>
							{#if src.time}
								<time class="source__time" datetime={src.time}>
									{formatSourceTime(src.time, generatedAt, timezone)}
								</time>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</article>
