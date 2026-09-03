<script lang="ts">
	import { resolve } from '$app/paths';
	import Masthead from '$lib/components/Masthead.svelte';

	let { error } = $props();
</script>

<Masthead />

<main class="wrap" style="padding-block:3rem;">
	<h1 class="hero__headline" style="font-size:1.8rem;">Something went wrong</h1>
	<p style="color:var(--ink-3);">{error?.message ?? 'Unknown error'}</p>
	<p style="margin-top:1.5rem;">
		<a class="desk-link" href={resolve('/')}>Back to latest briefing</a>
	</p>
</main>
