<script lang="ts">
	import { splitHighlight, type HighlightPart } from '$lib/highlight';

	interface Props {
		text: string;
		query?: string;
	}

	let { text, query = '' }: Props = $props();

	const parts = $derived<HighlightPart[]>(splitHighlight(text, query));
</script>

{#each parts as part, i (i)}
	{#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}
{/each}
