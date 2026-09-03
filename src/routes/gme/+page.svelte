<script lang="ts">
	import GmeDesk from '$lib/components/GmeDesk.svelte';

	let { data } = $props();
</script>

<GmeDesk briefing={data.briefing} />
