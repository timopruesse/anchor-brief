<script lang="ts">
	import { resolve } from '$app/paths';
	import ThemeToggle from './ThemeToggle.svelte';
	import { editionLabel, makeFormatters, toDate } from '$lib/format';

	interface Props {
		edition?: string;
		generatedAt?: string;
		timezone?: string;
		coverage?: string;
		gmeId?: string | null;
		parentId?: string | null;
		desk?: 'main' | 'gme';
		showArchive?: boolean;
	}

	let {
		edition,
		generatedAt,
		timezone = 'Europe/Berlin',
		coverage,
		gmeId = null,
		parentId = null,
		desk = 'main',
		showArchive = true
	}: Props = $props();

	const fmt = $derived(makeFormatters(timezone));
	const generated = $derived(toDate(generatedAt));
	const label = $derived(
		desk === 'gme' ? 'GME desk' : editionLabel(edition)
	);
</script>

<header class="masthead">
	<div class="wrap">
		<div class="masthead__row">
			<a class="brand" href={resolve('/')}>
				<span class="brand__mark" aria-hidden="true"></span>
				<span class="brand__name">Anchor&nbsp;Brief</span>
			</a>
			<div class="masthead__actions">
				{#if showArchive}
					<a class="nav-link nav-link--ghost" href={resolve('/archive')}>Archive</a>
				{/if}
				{#if desk === 'main' && gmeId}
					<a class="desk-link" href={resolve(`/brief/${gmeId}`)}>GME desk</a>
				{:else if desk === 'gme'}
					<a class="nav-link nav-link--ghost" href={resolve(parentId ? `/brief/${parentId}` : '/')}>
						← Briefing
					</a>
				{/if}
				<ThemeToggle />
			</div>
		</div>
		{#if edition || generatedAt || coverage}
			<p class="masthead__meta">
				<span class="edition">{label}</span>
				{#if generated}
					<span class="dot" aria-hidden="true">&middot;</span>
					<time datetime={generatedAt} title="Generated {generatedAt} ({timezone})">
						{fmt.stamp(generated)}
					</time>
				{/if}
				{#if coverage}
					<span class="dot" aria-hidden="true">&middot;</span>
					<span class="coverage">Coverage: {coverage}</span>
				{/if}
			</p>
		{/if}
	</div>
</header>
