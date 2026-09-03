<script lang="ts">
	import MainBrief from '$lib/components/MainBrief.svelte';
	import GmeDesk from '$lib/components/GmeDesk.svelte';
	import type { GmeBriefing, MainBriefing } from '$lib/types';

	let { data } = $props();
</script>

{#if data.desk === 'gme'}
	<GmeDesk briefing={data.briefing as GmeBriefing} />
{:else}
	<MainBrief briefing={data.briefing as MainBriefing} gmeId={data.gmeId} />
{/if}
