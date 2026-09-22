/** Client vote helpers — optional GET to PUBLIC_VOTE_URL; no secrets on the client. */

export type VoteValue = 1 | -1;
export type StoredVote = VoteValue | 0;

export interface VotePayload {
	briefId: string;
	itemId: string;
	vote: VoteValue;
	ts: number;
}

/** Append vote fields as query params for Apps Script doGet (survives /exec 302). */
export function buildVoteRequestUrl(baseUrl: string, payload: VotePayload): string {
	const url = new URL(baseUrl);
	url.searchParams.set('briefId', payload.briefId);
	url.searchParams.set('itemId', payload.itemId);
	url.searchParams.set('vote', String(payload.vote));
	url.searchParams.set('ts', String(payload.ts));
	return url.toString();
}

export const VOTES_STORAGE_KEY = 'anchor-brief:votes';

/** FNV-1a 32-bit → base36 — stable, sync, no crypto dependency. */
export function stableHash(input: string): string {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(36);
}

/**
 * Prefer schema `story.id`; if missing, hash title + first source URL.
 */
export function resolveItemId(story: {
	id?: string | null;
	title?: string | null;
	sources?: Array<{ url?: string | null }> | null;
}): string {
	const id = String(story.id ?? '').trim();
	if (id) return id;
	const title = String(story.title ?? '').trim();
	const url = String(story.sources?.[0]?.url ?? '').trim();
	return `h:${stableHash(`${title}\n${url}`)}`;
}

/** Stable id for a roundup bullet within a story. */
export function resolveFactItemId(storyId: string, factText: string, index: number): string {
	const text = factText.trim();
	if (text) return `${storyId}:fact:${stableHash(text)}`;
	return `${storyId}:fact:${index}`;
}

export function voteStorageKey(briefId: string, itemId: string): string {
	return `${briefId}\t${itemId}`;
}

export function parseStoredVotes(raw: string | null): Record<string, VoteValue> {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		const out: Record<string, VoteValue> = {};
		for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
			if (v === 1 || v === -1) out[k] = v;
		}
		return out;
	} catch {
		return {};
	}
}

/** Next vote after a thumb click — same value clears; opposite switches. */
export function nextVote(current: StoredVote, clicked: VoteValue): StoredVote {
	return current === clicked ? 0 : clicked;
}
