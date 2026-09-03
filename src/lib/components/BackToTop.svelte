<script lang="ts">
	import { onMount } from 'svelte';

	let visible = $state(false);

	onMount(() => {
		function update() {
			visible = window.scrollY > 480;
		}
		update();
		window.addEventListener('scroll', update, { passive: true });
		return () => window.removeEventListener('scroll', update);
	});
</script>

<button
	type="button"
	class="totop"
	data-visible={visible ? 'true' : 'false'}
	aria-label="Back to top"
	onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
>
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M12 19V5"></path>
		<path d="M6 11l6-6 6 6"></path>
	</svg>
</button>
