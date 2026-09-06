<script lang="ts">
	import { formatSourceTime, domainFromUrl, faviconUrl, formatVia } from '$lib/format';
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
	const isPrimary = $derived(src.kind === 'primary');
	const fav = $derived(isX ? null : faviconUrl(domain));
	const formattedTime = $derived(
		src.time ? formatSourceTime(src.time, generatedAt, timezone) : null
	);
	const timeStr = $derived(!compact && formattedTime ? formattedTime : null);

	/** Soft-fail: only show discovery trail when via.url is a safe http(s) link. */
	const viaInfo = $derived(formatVia(src.label, src.via));

	const mainAria = $derived(
		viaInfo ? `${src.label} (opens article in new tab)` : src.label
	);

	const mainTooltip = $derived.by(() => {
		const parts = [src.label];
		if (isPrimary) parts.push('Primary reporting');
		if (formattedTime) parts.push(formattedTime);
		if (domain) parts.push(`(${domain})`);
		if (compact && viaInfo) {
			if (viaInfo.viaIsX) {
				parts.push(viaInfo.curator ? `via ${viaInfo.curator} on X` : 'via X');
			} else {
				parts.push(`via ${viaInfo.viaLabel}`);
			}
		}
		return parts.join(' · ');
	});

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

<span
	class="source-chip-group"
	class:source-chip-group--compact={compact}
	class:source-chip-group--combined={Boolean(viaInfo)}
	data-kind={src.kind}
	role={viaInfo ? 'group' : undefined}
	aria-label={viaInfo ? `${src.label} citation with discovery trail` : undefined}
>
	<a
		class="source-chip"
		class:source-chip--compact={compact}
		class:source-chip--combined-main={Boolean(viaInfo)}
		data-kind={src.kind}
		href={src.href}
		rel="noopener noreferrer"
		target="_blank"
		aria-label={mainAria}
		title={mainTooltip}
	>
		{#if compact && isPrimary}
			<span class="source-chip__primary-dot" aria-hidden="true"></span>
		{/if}
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

	{#if viaInfo}
		<a
			class="source-via source-via--combined"
			class:source-via--compact={compact}
			class:source-via--x={viaInfo.viaIsX}
			href={viaInfo.viaHref}
			rel="noopener noreferrer"
			target="_blank"
			aria-label={viaInfo.ariaLabel}
			title={viaInfo.ariaLabel}
		>
			{#if viaInfo.viaIsX}
				{#if !compact}
					<span class="source-via__prefix">via</span>
					{#if viaInfo.curator}
						<span class="source-via__curator">{viaInfo.curator}</span>
					{/if}
				{/if}
				<svg
					class="source-via__x"
					viewBox="0 0 24 24"
					width={compact ? '8.5' : '9.5'}
					height={compact ? '8.5' : '9.5'}
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
					/>
				</svg>
			{:else}
				<span class="source-via__prefix">via</span>
				<span class="source-via__label">{compact ? (viaInfo.curator ?? viaInfo.viaLabel) : viaInfo.viaLabel}</span>
				{#if !compact}
					<svg
						class="source-via__outbound"
						viewBox="0 0 12 12"
						width="7"
						height="7"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" />
					</svg>
				{/if}
			{/if}
		</a>
	{/if}
</span>
