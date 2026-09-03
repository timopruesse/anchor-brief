import type {
	CommunityDay,
	CommunityKind,
	CommunityPost,
	CommunitySnapshot
} from './types';

export const COMMUNITY_KINDS: CommunityKind[] = ['dd', 'daily', 'news', 'junk'];

export const COMMUNITY_KIND_LABELS: Record<CommunityKind, string> = {
	dd: 'DD',
	daily: 'Daily',
	news: 'News',
	junk: 'Junk'
};

const EMPTY_BY_KIND: Record<CommunityKind, number> = {
	dd: 0,
	daily: 0,
	news: 0,
	junk: 0
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asKind(value: unknown): CommunityKind | null {
	return value === 'dd' || value === 'daily' || value === 'news' || value === 'junk'
		? value
		: null;
}

function coercePost(raw: unknown): CommunityPost | null {
	if (!isRecord(raw)) return null;
	const title = typeof raw.title === 'string' ? raw.title.trim() : '';
	if (!title) return null;
	const subreddit = typeof raw.subreddit === 'string' ? raw.subreddit : 'Superstonk';
	const permalink = typeof raw.permalink === 'string' ? raw.permalink : '';
	const updated = typeof raw.updated === 'string' ? raw.updated : '';
	const url = typeof raw.url === 'string' && raw.url.trim() ? raw.url : null;
	const kind = asKind(raw.kind) ?? 'junk';
	return { title, kind, subreddit, permalink, url, updated };
}

function coerceDay(raw: unknown): CommunityDay | null {
	if (!isRecord(raw)) return null;
	const date = typeof raw.date === 'string' ? raw.date : '';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
	const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
	const dd = n(raw.dd);
	const daily = n(raw.daily);
	const news = n(raw.news);
	const junk = n(raw.junk);
	const posts = n(raw.posts) || dd + daily + news + junk;
	return { date, posts, dd, daily, news, junk };
}

function emptySnapshot(partial?: Partial<CommunitySnapshot>): CommunitySnapshot {
	return {
		asOf: partial?.asOf ?? '',
		windowHours: partial?.windowHours ?? 0,
		totals: partial?.totals ?? { posts: 0, withOutbound: 0 },
		byKind: { ...EMPTY_BY_KIND, ...(partial?.byKind ?? {}) },
		posts: partial?.posts ?? [],
		history: partial?.history ?? []
	};
}

/**
 * Soft-normalize `community` from GME JSON.
 * Accepts the new CommunitySnapshot object, a legacy posts array, or partial/missing data.
 * Returns null when there is nothing useful to render.
 */
export function normalizeCommunity(raw: unknown): CommunitySnapshot | null {
	if (raw == null) return null;

	// Legacy: bare posts array
	if (Array.isArray(raw)) {
		const posts = raw.map(coercePost).filter((p): p is CommunityPost => Boolean(p));
		if (!posts.length) return null;
		const byKind = { ...EMPTY_BY_KIND };
		for (const p of posts) byKind[p.kind] += 1;
		return emptySnapshot({
			asOf: posts[0]?.updated ?? '',
			windowHours: 0,
			totals: {
				posts: posts.length,
				withOutbound: posts.filter((p) => p.url).length
			},
			byKind,
			posts,
			history: []
		});
	}

	if (!isRecord(raw)) return null;

	const posts = Array.isArray(raw.posts)
		? raw.posts.map(coercePost).filter((p): p is CommunityPost => Boolean(p))
		: [];
	const history = Array.isArray(raw.history)
		? raw.history.map(coerceDay).filter((d): d is CommunityDay => Boolean(d))
		: [];

	const byKindRaw = isRecord(raw.byKind) ? raw.byKind : {};
	const byKind: Record<CommunityKind, number> = { ...EMPTY_BY_KIND };
	for (const k of COMMUNITY_KINDS) {
		const v = byKindRaw[k];
		byKind[k] = typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
	}

	const totalsRaw = isRecord(raw.totals) ? raw.totals : {};
	const postsTotal =
		typeof totalsRaw.posts === 'number' && Number.isFinite(totalsRaw.posts)
			? Math.max(0, totalsRaw.posts)
			: posts.length || COMMUNITY_KINDS.reduce((s, k) => s + byKind[k], 0);
	const withOutbound =
		typeof totalsRaw.withOutbound === 'number' && Number.isFinite(totalsRaw.withOutbound)
			? Math.max(0, totalsRaw.withOutbound)
			: posts.filter((p) => p.url).length;

	const snapshot = emptySnapshot({
		asOf: typeof raw.asOf === 'string' ? raw.asOf : '',
		windowHours:
			typeof raw.windowHours === 'number' && Number.isFinite(raw.windowHours)
				? Math.max(0, raw.windowHours)
				: 0,
		totals: { posts: postsTotal, withOutbound },
		byKind,
		posts,
		history
	});

	const hasSignal =
		snapshot.posts.length > 0 ||
		snapshot.history.length > 0 ||
		snapshot.totals.posts > 0 ||
		COMMUNITY_KINDS.some((k) => snapshot.byKind[k] > 0);

	return hasSignal ? snapshot : null;
}

export function shortBerlinDate(date: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!m) return date;
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const month = months[Number(m[2]) - 1] ?? m[2];
	return `${Number(m[3])} ${month}`;
}
