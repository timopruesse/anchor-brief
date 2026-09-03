<script lang="ts">
	import Masthead from './Masthead.svelte';
	import BriefStories from './BriefStories.svelte';
	import { editionLabel } from '$lib/format';
	import type { MainBriefing } from '$lib/types';

	interface Props {
		briefing: MainBriefing;
		gmeId?: string | null;
	}

	let { briefing, gmeId = null }: Props = $props();

	const sourceCount = $derived(
		briefing.stories.reduce((n, s) => n + (s.sources?.length ?? 0), 0)
	);
	const label = $derived(editionLabel(briefing.edition));
</script>

<svelte:head>
	<title>Anchor Brief — {label}</title>
	<meta name="description" content={briefing.headline} />
</svelte:head>

<a class="skip-link" href="#stories">Skip to stories</a>

<Masthead
	edition={briefing.edition}
	generatedAt={briefing.generatedAt}
	timezone={briefing.timezone}
	coverage={briefing.coverage}
	{gmeId}
	desk="main"
/>

<main id="main">
	<section class="hero wrap" aria-labelledby="hero-headline">
		<p class="hero__kicker">What matters</p>
		<h1 class="hero__headline" id="hero-headline">{briefing.headline}</h1>
		<hr class="hero__rule" />
	</section>

	<BriefStories
		stories={briefing.stories}
		generatedAt={briefing.generatedAt}
		timezone={briefing.timezone}
	/>

	<footer class="foot">
		<div class="wrap">
			<p class="foot__meta">
				<span>{label}</span>
				<span class="dot" aria-hidden="true">&middot;</span>
				<span
					>{briefing.stories.length}
					{briefing.stories.length === 1 ? 'story' : 'stories'}</span
				>
				<span class="dot" aria-hidden="true">&middot;</span>
				<span>{sourceCount} {sourceCount === 1 ? 'source' : 'sources'}</span>
			</p>
			<p>
				Throwaway briefing page. Self-contained, no network calls, no tracking. Source links open in
				a new tab.
			</p>
		</div>
	</footer>
</main>
