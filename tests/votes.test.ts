import { describe, expect, it } from 'bun:test';
import {
	buildVoteRequestUrl,
	nextVote,
	parseStoredVotes,
	resolveFactItemId,
	resolveItemId,
	stableHash,
	voteStorageKey
} from '../src/lib/votes';

describe('stableHash', () => {
	it('is stable for the same input', () => {
		expect(stableHash('hello')).toBe(stableHash('hello'));
		expect(stableHash('hello')).not.toBe(stableHash('world'));
	});
});

describe('resolveItemId', () => {
	it('prefers story.id', () => {
		expect(resolveItemId({ id: 'zelenskyy-trump-un-energy', title: 'X' })).toBe(
			'zelenskyy-trump-un-energy'
		);
	});

	it('falls back to a hash of title + first source url', () => {
		const a = resolveItemId({
			title: 'Some story',
			sources: [{ url: 'https://example.com/a' }]
		});
		const b = resolveItemId({
			title: 'Some story',
			sources: [{ url: 'https://example.com/a' }]
		});
		expect(a).toMatch(/^h:/);
		expect(a).toBe(b);
		expect(a).not.toBe(
			resolveItemId({ title: 'Other', sources: [{ url: 'https://example.com/a' }] })
		);
	});
});

describe('resolveFactItemId', () => {
	it('hashes fact text under the story id', () => {
		const id = resolveFactItemId('worth-a-look', 'Neovim 0.13 ships', 0);
		expect(id).toBe(`worth-a-look:fact:${stableHash('Neovim 0.13 ships')}`);
		expect(id).toBe(resolveFactItemId('worth-a-look', 'Neovim 0.13 ships', 99));
	});

	it('falls back to index when text is empty', () => {
		expect(resolveFactItemId('dev-notes', '  ', 3)).toBe('dev-notes:fact:3');
	});
});

describe('nextVote', () => {
	it('sets, switches, and clears', () => {
		expect(nextVote(0, 1)).toBe(1);
		expect(nextVote(1, 1)).toBe(0);
		expect(nextVote(1, -1)).toBe(-1);
		expect(nextVote(-1, -1)).toBe(0);
	});
});

describe('parseStoredVotes / voteStorageKey', () => {
	it('keeps only 1 / -1 entries', () => {
		expect(parseStoredVotes(JSON.stringify({ a: 1, b: -1, c: 0, d: 'x' }))).toEqual({
			a: 1,
			b: -1
		});
		expect(parseStoredVotes('nope')).toEqual({});
		expect(voteStorageKey('2026-09-22-evening', 'story-a')).toBe('2026-09-22-evening\tstory-a');
	});
});

describe('buildVoteRequestUrl', () => {
	it('appends briefId, itemId, vote, ts as query params', () => {
		const url = buildVoteRequestUrl('https://script.google.com/macros/s/abc/exec', {
			briefId: '2026-09-22-evening',
			itemId: 'story-a',
			vote: -1,
			ts: 1727000000000
		});
		const parsed = new URL(url);
		expect(parsed.origin + parsed.pathname).toBe('https://script.google.com/macros/s/abc/exec');
		expect(parsed.searchParams.get('briefId')).toBe('2026-09-22-evening');
		expect(parsed.searchParams.get('itemId')).toBe('story-a');
		expect(parsed.searchParams.get('vote')).toBe('-1');
		expect(parsed.searchParams.get('ts')).toBe('1727000000000');
	});
});
