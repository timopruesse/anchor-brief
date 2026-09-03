<script lang="ts">
	import MainBrief from '$lib/components/MainBrief.svelte';

	let { data } = $props();
</script>

<MainBrief briefing={data.briefing} gmeId={data.gmeId} />
