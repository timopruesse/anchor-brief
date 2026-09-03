<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	import ReadingProgress from '$lib/components/ReadingProgress.svelte';
	import BackToTop from '$lib/components/BackToTop.svelte';
	import { bootTheme } from '$lib/theme';

	let { children } = $props();

	onMount(() => {
		bootTheme();
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<link rel="icon" href={favicon} />
</svelte:head>

<ReadingProgress />
{@render children()}
<BackToTop />
