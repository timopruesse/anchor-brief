import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import {
	buildVoteRequestUrl,
	nextVote,
	parseStoredVotes,
	voteStorageKey,
	VOTES_STORAGE_KEY,
	type StoredVote,
	type VotePayload,
	type VoteValue
} from './votes';

/**
 * Public HTTPS vote endpoint (set PUBLIC_VOTE_URL at build time).
 * Soft-fails when unset — local votes still persist. See docs/votes.md.
 */
function voteEndpoint(): string | undefined {
	const url = env.PUBLIC_VOTE_URL?.trim();
	return url || undefined;
}

function persist(map: Record<string, VoteValue>) {
	if (!browser) return;
	try {
		localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(map));
	} catch {
		/* private mode / quota */
	}
}

/**
 * Fire-and-forget GET with query params + no-cors.
 * Apps Script `/exec` often 302s; browser follow-up of POST becomes GET and drops the body,
 * so `doPost` never runs. Query params survive redirects; `doGet` (owned by Anchor) will
 * accept them. Opaque response is expected — soft-fail remains. See docs/votes.md.
 */
function sendVote(payload: VotePayload) {
	const base = voteEndpoint();
	if (!base) return;
	try {
		const url = buildVoteRequestUrl(base, payload);
		void fetch(url, {
			method: 'GET',
			mode: 'no-cors',
			keepalive: true
		}).catch(() => {
			/* soft-fail */
		});
	} catch {
		/* soft-fail */
	}
}

export class VoteController {
	map = $state<Record<string, VoteValue>>({});
	#hydrated = false;

	ensureHydrated() {
		if (this.#hydrated || !browser) return;
		this.#hydrated = true;
		try {
			this.map = parseStoredVotes(localStorage.getItem(VOTES_STORAGE_KEY));
		} catch {
			this.map = {};
		}
	}

	get(briefId: string, itemId: string): StoredVote {
		return this.map[voteStorageKey(briefId, itemId)] ?? 0;
	}

	/**
	 * Optimistic cast: update localStorage immediately; send only when vote is 1/-1.
	 * Clearing a vote stays local-only (append-only sink has no delete).
	 */
	cast(briefId: string, itemId: string, clicked: VoteValue): StoredVote {
		this.ensureHydrated();
		const key = voteStorageKey(briefId, itemId);
		const current = this.map[key] ?? 0;
		const next = nextVote(current, clicked);

		if (next === 0) {
			const { [key]: _, ...rest } = this.map;
			this.map = rest;
		} else {
			this.map = { ...this.map, [key]: next };
		}

		persist(this.map);

		if (next === 1 || next === -1) {
			sendVote({ briefId, itemId, vote: next, ts: Date.now() });
		}

		return next;
	}
}

export const votes = new VoteController();
if (browser) votes.ensureHydrated();
