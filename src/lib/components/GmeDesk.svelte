<script lang="ts">
	import { onMount } from 'svelte';
	import Masthead from './Masthead.svelte';
	import CommunityChart from './CommunityChart.svelte';
	import GmeSparkline from './GmeSparkline.svelte';
	import StoryCard from './StoryCard.svelte';
	import {
		editionLabel,
		formatMoney,
		formatPct,
		formatSigned,
		formatVolume,
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
	import type { GmeBriefing, GmeVoice } from '$lib/types';

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

	function isQuiet(quiet: GmeVoice['quiet']): boolean {
		return Boolean(quiet) && quiet !== 'false' && quiet !== '0';
	}

	function getDaysSilent(lastPostAt: string | undefined): number | null {
		const postDate = toDate(lastPostAt);
		const genDate = toDate(briefing.generatedAt) ?? new Date();
		if (!postDate) return null;
		const diffMs = genDate.getTime() - postDate.getTime();
		if (diffMs < 0) return 0;
		return Math.floor(diffMs / 86_400_000);
	}

	let live = $state.raw<LiveQuote | null>(null);
	let liveStatus = $state<'idle' | 'loading' | 'ok' | 'error'>('idle');

	const display = $derived(live ?? snapshot);
	const up = $derived((display?.change ?? 0) >= 0);
	const liveAsOf = $derived(toDate(live?.fetchedAt));
	const showingLive = $derived(live != null);

	const dayHigh = $derived(display?.dayHigh ?? snapshot?.dayHigh);
	const dayLow = $derived(display?.dayLow ?? snapshot?.dayLow);
	const prevClose = $derived(snapshot?.prevClose ?? (display ? display.price - display.change : undefined));
	const volume = $derived(display?.volume ?? snapshot?.volume);
	const week52High = $derived(display?.week52High ?? snapshot?.week52High);
	const week52Low = $derived(display?.week52Low ?? snapshot?.week52Low);

	const dayRangePct = $derived.by(() => {
		const p = display?.price;
		if (p == null || dayLow == null || dayHigh == null || dayHigh <= dayLow) return null;
		return Math.max(0, Math.min(100, ((p - dayLow) / (dayHigh - dayLow)) * 100));
	});

	const week52Pct = $derived.by(() => {
		const p = display?.price;
		if (p == null || week52Low == null || week52High == null || week52High <= week52Low) return null;
		return Math.max(0, Math.min(100, ((p - week52Low) / (week52High - week52Low)) * 100));
	});

	const stanceTone = $derived.by((): 'up' | 'down' | 'mixed' => {
		const s = (briefing.stance ?? '').toLowerCase();
		if (s.includes('bull') || s.includes('pos') || s.includes('long')) return 'up';
		if (s.includes('bear') || s.includes('neg') || s.includes('short')) return 'down';
		return 'mixed';
	});

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
	<title>Anchor Brief — GME Market Desk · {editionLabel(briefing.edition)}</title>
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

<main class="wrap gme-wrap" id="main">
	<!-- Top Ticker & Market Board -->
	<section class="gme-market-board" aria-label="GME market overview">
		<!-- Strip: Symbol, exchange, currency, feed status -->
		<div class="board-top-strip">
			<div class="ticker-identity">
				<span class="ticker-symbol">{display?.symbol || 'GME'}</span>
				<span class="ticker-exchange">NYSE</span>
				<span class="ticker-dot" aria-hidden="true">&middot;</span>
				<span class="ticker-name">{display?.name || 'GameStop Corporation'}</span>
				<span class="ticker-dot" aria-hidden="true">&middot;</span>
				<span class="ticker-currency">{display?.currency || 'USD'}</span>
			</div>

			<div class="board-feed-status">
				{#if showingLive}
					<span class="feed-pill feed-pill--live" title="Client-side delayed scanner poll (~15 min delayed)">
						<span class="feed-pulse" aria-hidden="true"></span>
						<span>Delayed Poll (~15m)</span>
					</span>
				{:else if liveStatus === 'loading'}
					<span class="feed-pill feed-pill--loading">
						<span class="feed-spinner" aria-hidden="true"></span>
						<span>Refreshing feed…</span>
					</span>
				{:else}
					<span class="feed-pill">
						<span>Session Snapshot</span>
					</span>
				{/if}
			</div>
		</div>

		<!-- Main Hero Quote & Headline -->
		<div class="gme-price-block">
			<div class="price-primary">
				<div class="price-figure">
					{display ? formatMoney(display.price, display.currency) : '—'}
				</div>
				{#if display}
					<div class="price-delta-badge" class:up class:down={!up}>
						<span class="delta-arrow" aria-hidden="true">{up ? '▲' : '▼'}</span>
						<span class="delta-val">{formatSigned(display.change, 2)}</span>
						<span class="delta-pct">({formatPct(display.changePct)})</span>
					</div>
				{/if}
			</div>

			<p class="gme-headline">{briefing.headline}</p>
		</div>

		<!-- Financial Stats Matrix Ribbon -->
		<div class="market-matrix" aria-label="Key trading metrics">
			<!-- Day Range -->
			<div class="matrix-cell">
				<div class="matrix-head">
					<span class="matrix-label">Day Range</span>
					{#if dayRangePct != null}
						<span class="matrix-pct">{dayRangePct.toFixed(0)}%</span>
					{/if}
				</div>
				<div class="matrix-range-vals">
					<span class="range-val">{dayLow != null ? formatMoney(dayLow, display?.currency) : '—'}</span>
					<span class="range-dash">—</span>
					<span class="range-val">{dayHigh != null ? formatMoney(dayHigh, display?.currency) : '—'}</span>
				</div>
				<div class="range-track" aria-hidden="true">
					{#if dayRangePct != null}
						<div class="range-fill" style:width="{dayRangePct}%"></div>
						<div class="range-marker" style:left="{dayRangePct}%"></div>
					{/if}
				</div>
			</div>

			<!-- 52-Week Range -->
			<div class="matrix-cell">
				<div class="matrix-head">
					<span class="matrix-label">52-Week Range</span>
					{#if week52Pct != null}
						<span class="matrix-pct">{week52Pct.toFixed(0)}%</span>
					{/if}
				</div>
				<div class="matrix-range-vals">
					<span class="range-val">{week52Low != null ? formatMoney(week52Low, display?.currency) : '—'}</span>
					<span class="range-dash">—</span>
					<span class="range-val">{week52High != null ? formatMoney(week52High, display?.currency) : '—'}</span>
				</div>
				<div class="range-track" aria-hidden="true">
					{#if week52Pct != null}
						<div class="range-fill" style:width="{week52Pct}%"></div>
						<div class="range-marker" style:left="{week52Pct}%"></div>
					{/if}
				</div>
			</div>

			<!-- Volume -->
			<div class="matrix-cell">
				<span class="matrix-label">Volume</span>
				<div class="matrix-single">
					<span class="matrix-single-val">{formatVolume(volume)}</span>
					{#if volume}
						<span class="matrix-single-sub">{volume.toLocaleString('en-US')} shares</span>
					{/if}
				</div>
			</div>

			<!-- Previous Close -->
			<div class="matrix-cell">
				<span class="matrix-label">Previous Close</span>
				<div class="matrix-single">
					<span class="matrix-single-val">{prevClose != null ? formatMoney(prevClose, display?.currency) : '—'}</span>
					{#if display && prevClose != null}
						<span class="matrix-single-sub" class:up class:down={!up}>
							{formatSigned(display.price - prevClose, 2)} vs close
						</span>
					{/if}
				</div>
			</div>

			<!-- Feed Provenance -->
			<div class="matrix-cell matrix-cell--provenance">
				<span class="matrix-label">Data Feeds</span>
				<div class="provenance-lines">
					{#if live && liveAsOf}
						<div class="prov-line prov-line--live">
							<span class="prov-badge">Live poll</span>
							<span class="prov-time">{fmt.time(liveAsOf)}</span>
							{#if safeHref(live.source.url)}
								<a class="prov-link" href={safeHref(live.source.url)!} rel="noopener noreferrer" target="_blank">
									{live.source.label}
								</a>
							{/if}
						</div>
					{:else if liveStatus === 'error'}
						<div class="prov-line prov-line--error">
							<span class="prov-badge">Scanner</span>
							<span class="prov-muted">Unavailable · using snapshot</span>
						</div>
					{/if}
					{#if snapshot}
						<div class="prov-line">
							<span class="prov-badge">Snapshot</span>
							{#if snapshotAsOf}
								<span class="prov-time">{fmt.time(snapshotAsOf)}</span>
							{/if}
							{#if snapshot.source?.url && safeHref(snapshot.source.url)}
								<a class="prov-link" href={safeHref(snapshot.source.url)!} rel="noopener noreferrer" target="_blank">
									{snapshot.source.label}
								</a>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Interactive Sparkline Chart Panel -->
		<div class="board-chart-wrap">
			<GmeSparkline
				points={briefing.sparkline ?? []}
				currency={display?.currency ?? snapshot?.currency ?? 'USD'}
			/>
		</div>

		<!-- Desk Stance Callout -->
		{#if briefing.stance || briefing.stanceWhy}
			<div class="desk-stance" class:stance--up={stanceTone === 'up'} class:stance--down={stanceTone === 'down'} class:stance--mixed={stanceTone === 'mixed'}>
				<div class="stance-header">
					<span class="stance-label">Analyst Desk Stance</span>
					<span class="stance-pill">{briefing.stance || 'Neutral'}</span>
				</div>
				<p class="stance-text">{briefing.stanceWhy}</p>
			</div>
		{/if}
	</section>

	<!-- Market Intelligence Dossier & Filings -->
	<section class="gme-stories-section" aria-label="GME market intelligence">
		<header class="dossier-head">
			<div class="dossier-head__title-group">
				<span class="desk-section-badge">Market Intelligence</span>
				<h2 class="dossier-head__title">Intelligence & Filings</h2>
			</div>
			<span class="dossier-head__count">
				{stories.length} {stories.length === 1 ? 'brief' : 'briefs'}
			</span>
		</header>

		<div class="gme-stories stories">
			{#each stories as story (story.id)}
				<StoryCard
					{story}
					desk="gme"
					generatedAt={briefing.generatedAt}
					timezone={briefing.timezone}
				/>
			{/each}
		</div>
	</section>

	<!-- Community & Retail Flow Section -->
	{#if showCommunity}
		<section class="community-desk" aria-label="Community flow and intelligence">
			<header class="community-head">
				<div class="community-head__title-group">
					<span class="desk-section-badge">Alternative Data · Flow</span>
					<h2 class="community-head__title">Community Flow & Sentiment</h2>
				</div>
				<p class="community-head__note">
					Superstonk retail velocity & insider activity. Tracked as market sentiment only — unverified until confirmed by regulatory filings or audited disclosures.
				</p>
			</header>

			<div class="community-grid">
				<!-- Main Column: Chart + Summary + Posts -->
				<div class="community-main">
					{#if community}
						{#if community.history.length}
							<div class="community-chart-panel">
								<div class="panel-header">
									<span class="panel-title">14-Day Velocity by Category</span>
									{#if community.windowHours > 0}
										<span class="panel-meta">{community.windowHours}h active window</span>
									{/if}
								</div>
								<CommunityChart history={community.history} />
							</div>
						{/if}

						{#if community.totals.posts > 0 || COMMUNITY_KINDS.some((k) => community.byKind[k] > 0)}
							<div class="comm-summary-strip" aria-label="Community totals">
								<div class="comm-summary-stat">
									<span class="comm-summary-num">{community.totals.posts}</span>
									<span class="comm-summary-label">{community.totals.posts === 1 ? 'post' : 'posts'}</span>
								</div>
								{#if community.totals.withOutbound > 0}
									<div class="comm-summary-stat">
										<span class="comm-summary-num">{community.totals.withOutbound}</span>
										<span class="comm-summary-label">with citations</span>
									</div>
								{/if}
								<div class="comm-kinds-bar">
									{#each COMMUNITY_KINDS as kind (kind)}
										{#if community.byKind[kind] > 0}
											<div class="comm-kind-tag" data-kind={kind}>
												<span class="k">{COMMUNITY_KIND_LABELS[kind]}</span>
												<span class="n">{community.byKind[kind]}</span>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/if}

						{#if community.posts.length}
							<div class="comm-posts-panel">
								<div class="panel-header">
									<span class="panel-title">Retail Chatter Stream</span>
									<span class="panel-meta">{community.posts.length} posts</span>
								</div>
								<ul class="comm-posts">
									{#each community.posts as post (post.permalink || post.title)}
										<li class="comm-post-row" data-kind={post.kind}>
											<span class="kind-pill kind-pill--{post.kind}">{COMMUNITY_KIND_LABELS[post.kind]}</span>
											<div class="comm-post__body">
												{#if safeHref(post.permalink)}
													<a class="comm-post__title" href={safeHref(post.permalink)!} rel="noopener noreferrer" target="_blank">
														{post.title}
													</a>
												{:else}
													<span class="comm-post__title">{post.title}</span>
												{/if}
												<div class="comm-post__meta-bar">
													<span class="comm-post__sub">r/{post.subreddit}</span>
													{#if safeHref(post.url)}
														<a class="comm-post__outbound" href={safeHref(post.url)!} rel="noopener noreferrer" target="_blank">
															<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
																<path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8"/>
															</svg>
															<span>Source Doc</span>
														</a>
													{/if}
												</div>
											</div>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					{/if}
				</div>

				<!-- Sidebar Column: Executive Watchlist (Ryan Cohen / Insiders) -->
				{#if voices.length}
					<aside class="community-side" aria-label="Executive watchlist">
						<div class="voices-panel">
							<div class="panel-header">
								<span class="panel-title">Executive Watchlist</span>
								<span class="panel-meta">{voices.length} {voices.length === 1 ? 'insider' : 'insiders'}</span>
							</div>
							<ul class="voices-list">
								{#each voices as voice (voice.userId || voice.handle)}
									{@const quiet = isQuiet(voice.quiet)}
									{@const daysSilent = getDaysSilent(voice.lastPostAt)}
									{@const postDate = toDate(voice.lastPostAt)}
									<li class="voice-card">
										<div class="voice-card__top">
											<div class="voice-card__identity">
												<span class="voice-card__name">{voice.name?.trim() || `@${voice.handle}`}</span>
												<span class="voice-card__handle">@{voice.handle}</span>
												{#if voice.role?.trim()}
													<span class="voice-card__role">{voice.role.trim()}</span>
												{/if}
											</div>
											<span class="voice-status-pill" class:voice-status-pill--quiet={quiet} class:voice-status-pill--active={!quiet}>
												<span class="status-indicator"></span>
												{#if quiet}
													{#if daysSilent != null && daysSilent > 0}
														<span>{daysSilent}d Quiet</span>
													{:else}
														<span>Quiet</span>
													{/if}
												{:else}
													<span>Active</span>
												{/if}
											</span>
										</div>

										{#if postDate}
											<div class="voice-card__date">
												<span>Last transmission: {fmt.dayTime(postDate)}</span>
											</div>
										{/if}

										{#if voice.lastPostText}
											<blockquote class="voice-card__quote">
												<p>"{voice.lastPostText}"</p>
											</blockquote>
										{/if}

										{#if safeHref(voice.lastPostUrl)}
											<div class="voice-card__action">
												<a class="voice-link" href={safeHref(voice.lastPostUrl)!} rel="noopener noreferrer" target="_blank">
													<span>View transmission on X</span>
													<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
														<path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8"/>
													</svg>
												</a>
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					</aside>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Desk Footer & Provenance -->
	<footer class="foot gme-foot">
		<p>{briefing.disclaimer || "Today's read from the news, not investment advice."}</p>
		<p>
			Briefing quote via Yahoo Finance (session snapshot). Live price is a delayed client-side poll of
			TradingView's public scanner — not a websocket tick stream. Desk page is self-contained — no
			tracking.
		</p>
	</footer>
</main>
