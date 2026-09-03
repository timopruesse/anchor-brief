<script lang="ts">
	import { onMount } from 'svelte';
	import { applyTheme, bootTheme, type Theme } from '$lib/theme';

	let theme = $state<Theme>('dark');

	onMount(() => {
		theme = bootTheme();
	});

	function toggle() {
		theme = theme === 'light' ? 'dark' : 'light';
		applyTheme(theme, true);
	}
</script>

<button
	type="button"
	class="iconbtn"
	onclick={toggle}
	aria-pressed={theme === 'light'}
	aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
>
	{#if theme === 'light'}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
			<path d="M20 14.4A8.2 8.2 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4z"></path>
		</svg>
		<span class="iconbtn__label">Dark</span>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
			<circle cx="12" cy="12" r="4.2"></circle>
			<path
				d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"
			></path>
		</svg>
		<span class="iconbtn__label">Light</span>
	{/if}
</button>
