import { describe, expect, it } from 'bun:test';
import { normalizeCommunity, shortBerlinDate } from '../src/lib/community';

describe('normalizeCommunity', () => {
	it('returns null on null or empty input', () => {
		expect(normalizeCommunity(null)).toBeNull();
		expect(normalizeCommunity({})).toBeNull();
		expect(normalizeCommunity([])).toBeNull();
	});

	it('normalizes full modern CommunitySnapshot payload', () => {
		const raw = {
			asOf: '2026-09-04T08:41:05.205169+02:00',
			windowHours: 24,
			totals: { posts: 10, withOutbound: 3 },
			byKind: { dd: 1, daily: 2, news: 3, junk: 4 },
			posts: [
				{
					title: 'Sample post',
					kind: 'news',
					subreddit: 'Superstonk',
					permalink: 'https://reddit.com/r/Superstonk/1',
					url: 'https://news.com/article',
					updated: '2026-09-04T08:00:00Z'
				}
			],
			history: [
				{
					date: '2026-09-04',
					posts: 10,
					dd: 1,
					daily: 2,
					news: 3,
					junk: 4
				}
			]
		};

		const snap = normalizeCommunity(raw);
		expect(snap).not.toBeNull();
		expect(snap?.windowHours).toBe(24);
		expect(snap?.totals.posts).toBe(10);
		expect(snap?.byKind.news).toBe(3);
		expect(snap?.posts.length).toBe(1);
		expect(snap?.history.length).toBe(1);
	});

	it('normalizes legacy bare CommunityPost array into snapshot', () => {
		const raw = [
			{
				title: 'Old legacy post',
				kind: 'dd',
				subreddit: 'Superstonk',
				permalink: 'https://reddit.com/r/Superstonk/old',
				url: null,
				updated: '2026-08-01T00:00:00Z'
			}
		];

		const snap = normalizeCommunity(raw);
		expect(snap).not.toBeNull();
		expect(snap?.totals.posts).toBe(1);
		expect(snap?.byKind.dd).toBe(1);
		expect(snap?.history).toEqual([]);
	});

	it('formats short Berlin dates', () => {
		expect(shortBerlinDate('2026-09-04')).toBe('4 Sep');
		expect(shortBerlinDate('2026-01-15')).toBe('15 Jan');
	});
});
