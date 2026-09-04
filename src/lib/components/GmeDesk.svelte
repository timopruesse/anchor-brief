<script lang="ts">
	import { onMount } from 'svelte';
	import Masthead from './Masthead.svelte';
	import CommunityChart from './CommunityChart.svelte';
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
	import {
		COMMUNITY_KINDS,
		COMMUNITY_KIND_LABELS,
		normalizeCommunity
	} from '$lib/community';
	import {
		fetchLiveQuote,
		LIVE_QUOTE_POLL_MS,
		type LiveQuote
	} from '$lib/gmeLiveQuote';
	import type { GmeBriefing, GmeVoice, SparkPoint } from '$lib/types';

	interface Props {
		briefing: GmeBriefing;
	}

	let { briefing }: Props = $props();

	const snapshot = $derived(briefing.quote);
	const stories = $derived(sortStoriesByWeight(briefing.stories));
	const fmt = $derived(makeFormatters(briefing.timezone ?? 'Europe/Berlin'));
	const snapshotAsOf = $derived(toDate(snapshot?.asOf));
	const community = $derived(normalizeCommunity(briefing.community));

	/** Prefer `voices`; else wrap legacy `cohen` as a single Ryan Cohen voice. */
	const voices = $derived.by((): GmeVoice[] => {
		if (briefing.voices?.length) return briefing.voices;
		const cohen = briefing.cohen;
		if (!cohen) return [];
		return [
			{
				handle: cohen.handle || 'ryancohen',
				userId: cohen.userId,
				name: 'Ryan Cohen',
				lastPostAt: cohen.lastPostAt,
				lastPostUrl: cohen.lastPostUrl,
				lastPostText: cohen.lastPostText,
				quiet: cohen.quiet
			}
		];
	});
	const showCommunity = $derived(Boolean(community) || voices.length > 0);

	function truncateText(text: string, max = 160): string {
		const t = text?.trim() ?? '';
		if (t.length <= max) return t;
		return `${t.slice(0, max - 1).trimEnd()}…`;
	}

	function isQuiet(quiet: GmeVoice['quiet']): boolean {
		return Boolean(quiet) && quiet !== 'false' && quiet !== '0';
	}

	let live = $state.raw<LiveQuote | null>(null);
	let liveStatus = $state<'idle' | 'loading' | 'ok' | 'error'>('idle');

	const display = $derived(live ?? snapshot);
	const up = $derived((display?.change ?? 0) >= 0);
	const liveAsOf = $derived(toDate(live?.fetchedAt));
	const showingLive = $derived(live != null);

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

	onMount(() => {
		const symbol = snapshot?.symbol || 'GME';
		let cancelled = false;
		let timer: ReturnType<typeof setInterval> | undefined;
		const controller = new AbortController();

		async function poll() {
			if (cancelled) return;
			liveStatus = live ? 'ok' : 'loading';
			try {
				const next = await fetchLiveQuote(symbol, controller.signal);
				if (cancelled) return;
				live = next;
				liveStatus = 'ok';
			} catch {
				if (cancelled) return;
				// Soft-fail: keep snapshot price; never blank the desk.
				liveStatus = live ? 'ok' : 'error';
			}
		}

		void poll();
		timer = setInterval(() => void poll(), LIVE_QUOTE_POLL_MS);

		return () => {
			cancelled = true;
			controller.abort();
			if (timer) clearInterval(timer);
		};
	});
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
	<section class="hero gme-hero">
		<div class="gme-quote">
			<div class="gme-price">
				{display ? formatMoney(display.price, display.currency) : '—'}
			</div>
			{#if display}
				<div class="gme-chg" class:up class:down={!up}>
					{formatSigned(display.change)} ({formatPct(display.changePct)})
				</div>
			{/if}
			{#if showingLive}
				<span class="quote-badge quote-badge--live">Polled</span>
			{:else if liveStatus === 'loading'}
				<span class="quote-badge">Refreshing…</span>
			{:else}
				<span class="quote-badge">As of briefing</span>
			{/if}
		</div>

		<p class="gme-qmeta">{briefing.headline}</p>

		<div class="gme-quote-sources" aria-live="polite">
			{#if live && liveAsOf}
				<p class="quote-line quote-line--live">
					<span class="quote-label">Live</span>
					{formatMoney(live.price, live.currency)}
					· delayed poll · {fmt.dayTime(liveAsOf)}
					{#if safeHref(live.source.url)}
						· <a href={safeHref(live.source.url)!} rel="noopener noreferrer" target="_blank"
							>{live.source.label}</a
						>
					{/if}
				</p>
			{:else if liveStatus === 'error'}
				<p class="quote-line quote-line--muted">
					<span class="quote-label">Live</span>
					unavailable — showing briefing snapshot
				</p>
			{/if}
			{#if snapshot}
				<p class="quote-line" class:quote-line--muted={showingLive}>
					<span class="quote-label">As of briefing</span>
					{formatMoney(snapshot.price, snapshot.currency)}
					{#if snapshotAsOf}
						· {fmt.dayTime(snapshotAsOf)}
					{/if}
					{#if snapshot.source?.url && safeHref(snapshot.source.url)}
						· <a href={safeHref(snapshot.source.url)!} rel="noopener noreferrer" target="_blank"
							>{snapshot.source.label}</a
						>
					{/if}
				</p>
			{/if}
		</div>

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
					<p class="gme-why">{story.whyItMatters}</p>
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

	{#if showCommunity}
		<section class="community">
			<h2>Community — not reporting</h2>
			<p class="note">
				Superstonk and $GME chatter. Sentiment only. Nothing here is a fact until a filing or a
				reporter says so.
			</p>

			{#if community}
				{#if community.history.length}
					<CommunityChart history={community.history} />
				{/if}

				{#if community.totals.posts > 0 || COMMUNITY_KINDS.some((k) => community.byKind[k] > 0)}
					<div class="comm-summary" aria-label="Community totals">
						<span class="comm-total"
							>{community.totals.posts}
							{community.totals.posts === 1 ? 'post' : 'posts'}
							{#if community.windowHours > 0}
								· {community.windowHours}h window
							{/if}
						</span>
						{#if community.totals.withOutbound > 0}
							<span class="comm-meta">{community.totals.withOutbound} with outbound</span>
						{/if}
						<ul class="comm-kinds">
							{#each COMMUNITY_KINDS as kind (kind)}
								{#if community.byKind[kind] > 0}
									<li data-kind={kind}>
										<span class="k">{COMMUNITY_KIND_LABELS[kind]}</span>
										<span class="n">{community.byKind[kind]}</span>
									</li>
								{/if}
							{/each}
						</ul>
					</div>
				{/if}

				{#if community.posts.length}
					<ul class="comm-posts">
						{#each community.posts as post (post.permalink || post.title)}
							<li data-kind={post.kind}>
								<span class="kind-pill">{COMMUNITY_KIND_LABELS[post.kind]}</span>
								<span class="comm-post__body">
									{#if safeHref(post.permalink)}
										<a href={safeHref(post.permalink)!} rel="noopener noreferrer" target="_blank">
											{post.title}
										</a>
									{:else}
										{post.title}
									{/if}
									<span class="meta">r/{post.subreddit}</span>
									{#if safeHref(post.url)}
										<a
											class="outbound"
											href={safeHref(post.url)!}
											rel="noopener noreferrer"
											target="_blank"
										>
											outbound
										</a>
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}

			{#if voices.length}
				<div class="voices">
					<h3 class="voices-label">X voices</h3>
					<ul class="voices-list">
						{#each voices as voice (voice.userId || voice.handle)}
							<li class="voice">
								<div class="voice-head">
									<span class="voice-name">
										{voice.name?.trim() || `@${voice.handle}`}
									</span>
									{#if voice.role?.trim()}
										<span class="voice-role">{voice.role.trim()}</span>
									{/if}
									{#if isQuiet(voice.quiet)}
										<span class="quiet">Quiet</span>
									{/if}
								</div>
								{#if voice.name?.trim()}
									<p class="voice-handle">@{voice.handle}</p>
								{/if}
								{#if safeHref(voice.lastPostUrl)}
									<p class="voice-post">
										<a href={safeHref(voice.lastPostUrl)!} rel="noopener noreferrer" target="_blank"
											>last post</a
										>
										{#if voice.lastPostText}
											<span class="voice-text"> — {truncateText(voice.lastPostText)}</span>
										{/if}
									</p>
								{:else if voice.lastPostText}
									<p class="voice-post">
										<span class="voice-text">{truncateText(voice.lastPostText)}</span>
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
	{/if}

	<footer class="foot gme-foot">
		<p>{briefing.disclaimer || "Today's read from the news, not investment advice."}</p>
		<p>
			Briefing quote via Yahoo Finance (snapshot). Live price is a delayed client-side poll of
			TradingView's public scanner — not a websocket tick feed. Desk page is self-contained — no
			tracking.
		</p>
	</footer>
</main>
