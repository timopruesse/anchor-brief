<script lang="ts">
	import { onMount } from 'svelte';

	let width = $state(0);

	onMount(() => {
		function update() {
			const el = document.documentElement;
			const scrollTop = window.scrollY || el.scrollTop;
			const height = el.scrollHeight - el.clientHeight;
			width = height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0;
		}
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});
</script>

<div class="progress" aria-hidden="true">
	<div class="progress__bar" style:width="{width}%"></div>
</div>
