<script lang="ts">
	import { resolve } from '$app/paths';
	import ArchiveView from '$lib/components/ArchiveView.svelte';
	import Masthead from '$lib/components/Masthead.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Anchor Brief — Archive</title>
	<meta
		name="description"
		content="Browse past Anchor Brief editions and search stories across days."
	/>
</svelte:head>

<a class="skip-link" href="#archive-main">Skip to archive</a>

<Masthead showArchive={false} />

<div class="wrap" style="padding-top:1rem;" id="archive-main">
	<p style="margin:0;">
		<a class="nav-link nav-link--ghost" href={resolve('/')}>← Latest briefing</a>
	</p>
</div>

<ArchiveView editions={data.editions} indexed={data.indexed} />

<footer class="foot">
	<div class="wrap">
		<p>Editions are loaded from <code>data/*.json</code> at build time.</p>
	</div>
</footer>
