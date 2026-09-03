<script lang="ts">
	import Masthead from './Masthead.svelte';
	import {
		editionLabel,
		formatMoney,
		formatPct,
		formatSigned,
		safeHref,
		sortStoriesByWeight,
		toDate,
		makeFormatters
	} from '$lib/format';
	import type { GmeBriefing, SparkPoint } from '$lib/types';

	interface Props {
		briefing: GmeBriefing;
	}

	let { briefing }: Props = $props();

	const quote = $derived(briefing.quote);
	const up = $derived((quote?.change ?? 0) >= 0);
	const stories = $derived(sortStoriesByWeight(briefing.stories));
	const fmt = $derived(makeFormatters(briefing.timezone ?? 'Europe/Berlin'));
	const asOf = $derived(toDate(quote?.asOf));

	function sparkPath(points: SparkPoint[]): string {
		if (!points?.length) return '';
		const w = 300;
		const h = 72;
		const pad = 4;
		const vals = points.map((p) => p.c);
		const min = Math.min(...vals);
		const max = Math.max(...vals);
		const span = max - min || 1;
		return points
			.map((p, i) => {
				const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
				const y = pad + (1 - (p.c - min) / span) * (h - pad * 2);
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
			})
			.join(' ');
	}

	const path = $derived(sparkPath(briefing.sparkline ?? []));
	const community = $derived(briefing.community ?? []);
	const cohen = $derived(briefing.cohen);
</script>

<svelte:head>
	<title>Anchor Brief — GME desk · {editionLabel(briefing.edition)}</title>
	<meta name="description" content={briefing.headline} />
</svelte:head>

<Masthead
	edition={briefing.edition}
	generatedAt={briefing.generatedAt}
	timezone={briefing.timezone}
	coverage={briefing.coverage}
	parentId={briefing.parentId}
	desk="gme"
/>

<main class="wrap" id="main">
	<section class="hero" style="padding-bottom: 0.4rem;">
		<div class="gme-quote">
			<div class="gme-price">
				{quote ? formatMoney(quote.price, quote.currency) : '—'}
			</div>
			{#if quote}
				<div class="gme-chg" class:up class:down={!up}>
					{formatSigned(quote.change)} ({formatPct(quote.changePct)})
				</div>
			{/if}
		</div>
		<p class="gme-qmeta">
			{briefing.headline}
			{#if asOf}
				· as of {fmt.dayTime(asOf)}
			{/if}
			{#if quote?.source?.url && safeHref(quote.source.url)}
				· <a href={safeHref(quote.source.url)!} rel="noopener noreferrer" target="_blank"
					>{quote.source.label}</a
				>
			{/if}
		</p>

		{#if path}
			<svg class="gme-spark" viewBox="0 0 300 72" preserveAspectRatio="none" aria-hidden="true">
				<line x1="0" y1="36" x2="300" y2="36"></line>
				<path d={path}></path>
			</svg>
		{/if}

		{#if briefing.stance || briefing.stanceWhy}
			<div class="stance">
				<strong>Stance · {briefing.stance || 'n/a'}</strong>
				<p>{briefing.stanceWhy}</p>
			</div>
		{/if}
	</section>

	<section class="gme-stories" aria-label="GME stories">
		{#each stories as story (story.id)}
			<article class="gme-story">
				{#if story.weight === 'lead'}
					<div class="flag">Lead</div>
				{/if}
				<h2>{story.title}</h2>
				{#if story.facts?.length}
					<ul>
						{#each story.facts as fact (fact)}
							<li>{fact}</li>
						{/each}
					</ul>
				{/if}
				{#if story.whyItMatters}
					<p class="why" style="border:0;background:transparent;padding:0;margin-top:0.7rem;color:var(--ink-3);font-size:0.9rem;">
						{story.whyItMatters}
					</p>
				{/if}
				{#if story.sources?.length}
					<nav class="sources" aria-label="Sources">
						<ul>
							{#each story.sources as src (src.url + src.label)}
								{#if safeHref(src.url)}
									<li>
										<a
											class="source"
											class:primary={src.kind === 'primary'}
											href={safeHref(src.url)!}
											rel="noopener noreferrer"
											target="_blank"
										>
											{src.label}
										</a>
									</li>
								{/if}
							{/each}
						</ul>
					</nav>
				{/if}
			</article>
		{/each}
	</section>

	{#if community.length || cohen}
		<section class="community">
			<h2>Community — not reporting</h2>
			<p class="note">
				Superstonk and $GME chatter. Sentiment only. Nothing here is a fact until a filing or a
				reporter says so.
			</p>
			{#if community.length}
				<ul>
					{#each community as post (post.permalink || post.title)}
						<li>
							{#if safeHref(post.permalink) || safeHref(post.url)}
								<a
									href={safeHref(post.permalink) ?? safeHref(post.url)!}
									rel="noopener noreferrer"
									target="_blank"
								>
									{post.title}
								</a>
							{:else}
								{post.title}
							{/if}
							<span style="color:var(--ink-4);font-size:0.8rem;"> · r/{post.subreddit}</span>
						</li>
					{/each}
				</ul>
			{/if}
			{#if cohen}
				<div class="cohen">
					{#if cohen.quiet}
						<div class="quiet">Quiet since last post</div>
					{/if}
					<p style="margin:0.35rem 0;">
						@{cohen.handle}
						{#if safeHref(cohen.lastPostUrl)}
							— <a href={safeHref(cohen.lastPostUrl)!} rel="noopener noreferrer" target="_blank"
								>last post</a
							>
						{/if}
					</p>
					{#if cohen.lastPostText}
						<p style="margin:0;color:var(--ink-2);font-size:0.9rem;">{cohen.lastPostText}</p>
					{/if}
				</div>
			{/if}
		</section>
	{/if}

	<footer class="foot" style="margin-top:0;">
		<p>{briefing.disclaimer || "Today's read from the news, not investment advice."}</p>
		<p>Quote via Yahoo Finance, delayed. Desk page is self-contained — no tracking.</p>
	</footer>
</main>
