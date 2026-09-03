<script lang="ts">
	import { fold } from '$lib/format';

	interface Props {
		text: string;
		query?: string;
	}

	let { text, query = '' }: Props = $props();

	interface Part {
		t: string;
		hit: boolean;
	}

	const parts = $derived.by((): Part[] => {
		const raw = text ?? '';
		if (!query) return [{ t: raw, hit: false }];
		const haystack = fold(raw);
		const needle = fold(query);
		if (!needle || haystack.length !== raw.length) return [{ t: raw, hit: false }];
		const out: Part[] = [];
		let from = 0;
		let at = haystack.indexOf(needle, from);
		if (at === -1) return [{ t: raw, hit: false }];
		while (at !== -1) {
			if (at > from) out.push({ t: raw.slice(from, at), hit: false });
			out.push({ t: raw.slice(at, at + needle.length), hit: true });
			from = at + needle.length;
			at = haystack.indexOf(needle, from);
		}
		if (from < raw.length) out.push({ t: raw.slice(from), hit: false });
		return out;
	});
</script>

{#each parts as part, i (i)}
	{#if part.hit}<mark>{part.t}</mark>{:else}{part.t}{/if}
{/each}
