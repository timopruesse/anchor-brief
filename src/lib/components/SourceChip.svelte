<script lang="ts">
	import { formatSourceTime, domainFromUrl, faviconUrl } from '$lib/format';
	import type { Source } from '$lib/types';

	interface Props {
		src: Source & { href: string };
		generatedAt?: string;
		timezone?: string;
		/** Tighter chip for per-fact inline citations. */
		compact?: boolean;
		onFaviconError?: (e: Event) => void;
	}

	let {
		src,
		generatedAt,
		timezone = 'Europe/Berlin',
		compact = false,
		onFaviconError
	}: Props = $props();

	const domain = $derived(domainFromUrl(src.href));
	const isX = $derived(src.kind === 'x' || domain === 'x.com' || domain === 'twitter.com');
	const fav = $derived(isX ? null : faviconUrl(domain));
	const timeStr = $derived(
		!compact && src.time ? formatSourceTime(src.time, generatedAt, timezone) : null
	);

	function handleFaviconError(e: Event) {
		onFaviconError?.(e);
		const img = e.currentTarget as HTMLImageElement | null;
		if (img) {
			img.style.display = 'none';
			const fb = img.nextElementSibling as HTMLElement | null;
			if (fb) fb.style.display = 'inline-flex';
		}
	}
</script>

<a
	class="source-chip"
	class:source-chip--compact={compact}
	data-kind={src.kind}
	href={src.href}
	rel="noopener noreferrer"
	target="_blank"
	aria-label={src.label}
>
	{#if isX}
		<span class="source-chip__badge source-chip__badge--x" title="Post on X" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true">
				<path
					d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
				/>
			</svg>
		</span>
	{:else if fav}
		<span class="source-chip__icon-wrap">
			<img
				class="source-chip__favicon"
				src={fav}
				alt=""
				width="14"
				height="14"
				loading="lazy"
				decoding="async"
				onerror={handleFaviconError}
			/>
			<span class="source-chip__fallback" style="display: none;" aria-hidden="true">
				<svg
					viewBox="0 0 24 24"
					width="10"
					height="10"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
					<path d="M8 7h8M8 11h8M8 15h5" />
				</svg>
			</span>
		</span>
	{:else}
		<span class="source-chip__fallback" aria-hidden="true">
			<svg
				viewBox="0 0 24 24"
				width="10"
				height="10"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
				<path d="M8 7h8M8 11h8M8 15h5" />
			</svg>
		</span>
	{/if}

	{#if !compact && src.kind === 'primary'}
		<span class="source-chip__badge source-chip__badge--primary" title="Primary reporting or filing">
			<span class="primary-dot" aria-hidden="true"></span>
			<span>Primary</span>
		</span>
	{/if}

	<span class="source-chip__label">{src.label}</span>

	{#if timeStr}
		<time class="source-chip__time" datetime={src.time} title="Published {src.time}">
			{timeStr}
		</time>
	{/if}

	<svg
		class="source-chip__outbound"
		viewBox="0 0 12 12"
		width="8"
		height="8"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" />
	</svg>
</a>
