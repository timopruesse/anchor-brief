const EDITION_LABELS: Record<string, string> = {
	morning: 'Morning edition',
	afternoon: 'Afternoon edition',
	evening: 'Evening edition'
};

export const WEIGHT_RANK: Record<string, number> = {
	lead: 0,
	normal: 1,
	brief: 2
};

export const KIND_LABELS: Record<string, string> = {
	article: 'Article',
	x: 'X',
	primary: 'Primary'
};

export function editionLabel(edition: string | undefined): string {
	if (!edition) return 'Briefing';
	return EDITION_LABELS[edition] ?? `${edition.charAt(0).toUpperCase()}${edition.slice(1)} edition`;
}

export function fold(value: unknown): string {
	return String(value ?? '')
		.toLowerCase()
		.replace(/\u00df/g, 'ss')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

export function safeHref(url: string | undefined | null): string | null {
	const s = String(url ?? '').trim();
	return /^https?:\/\//i.test(s) ? s : null;
}

export function toDate(iso: string | undefined | null): Date | null {
	if (!iso) return null;
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function makeFormatters(timezone = 'Europe/Berlin') {
	function dtf(options: Intl.DateTimeFormatOptions) {
		try {
			return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, ...options });
		} catch {
			return new Intl.DateTimeFormat('en-GB', options);
		}
	}

	const stamp = dtf({
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	});
	const time = dtf({ hour: '2-digit', minute: '2-digit' });
	const dayTime = dtf({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const dayKey = dtf({ year: 'numeric', month: '2-digit', day: '2-digit' });

	return {
		stamp: (d: Date) => stamp.format(d).replace(/\u202f/g, ' '),
		time: (d: Date) => time.format(d).replace(/\u202f/g, ' '),
		dayTime: (d: Date) => dayTime.format(d).replace(/\u202f/g, ' '),
		dayKey: (d: Date) => dayKey.format(d)
	};
}

export function formatSourceTime(
	iso: string | undefined,
	generatedAt: string | undefined,
	timezone = 'Europe/Berlin'
): string | null {
	const d = toDate(iso);
	if (!d) return null;
	const fmt = makeFormatters(timezone);
	const generated = toDate(generatedAt);
	const sameDay = generated && fmt.dayKey(d) === fmt.dayKey(generated);
	return sameDay ? fmt.time(d) : fmt.dayTime(d);
}

export function hueFrom(seed: string): number {
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
	return h;
}

export function gradientFor(seed: string, light: boolean): string {
	const h = hueFrom(seed);
	const h2 = (h + 38) % 360;
	return light
		? `linear-gradient(135deg, hsl(${h} 34% 88%), hsl(${h2} 26% 78%))`
		: `linear-gradient(135deg, hsl(${h} 26% 22%), hsl(${h2} 22% 12%))`;
}

export function sortStoriesByWeight<T extends { weight?: string }>(stories: T[]): T[] {
	return [...stories].sort((a, b) => {
		const ra = WEIGHT_RANK[a.weight ?? ''] ?? 1;
		const rb = WEIGHT_RANK[b.weight ?? ''] ?? 1;
		return ra - rb;
	});
}

export function formatMoney(n: number, currency = 'USD'): string {
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			maximumFractionDigits: 2
		}).format(n);
	} catch {
		return `$${n.toFixed(2)}`;
	}
}

export function formatPct(n: number): string {
	const sign = n > 0 ? '+' : '';
	return `${sign}${n.toFixed(2)}%`;
}

export function formatSigned(n: number, digits = 3): string {
	const sign = n > 0 ? '+' : '';
	return `${sign}${n.toFixed(digits)}`;
}
