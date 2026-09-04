import { describe, expect, it } from 'bun:test';
import { EditionRepository, type StorageAdapter } from '../src/lib/server/briefs';

class MockStorageAdapter implements StorageAdapter {
	constructor(private files: Record<string, string>) {}

	readdir(): string[] {
		return Object.keys(this.files);
	}

	readFile(path: string): string {
		const filename = path.split('/').pop() || path;
		const content = this.files[filename];
		if (!content) throw new Error(`File not found: ${path}`);
		return content;
	}
}

describe('EditionRepository with mock storage adapter', () => {
	const mockData: Record<string, string> = {
		'2026-09-04-morning.json': JSON.stringify({
			id: '2026-09-04-morning',
			edition: 'morning',
			generatedAt: '2026-09-04T08:00:00Z',
			headline: 'Main morning brief',
			stories: [
				{
					id: 'story-1',
					title: 'Tech story',
					topics: ['Tech'],
					weight: 'lead',
					facts: ['Fact A'],
					sources: []
				}
			]
		}),
		'2026-09-04-morning-gme.json': JSON.stringify({
			id: '2026-09-04-morning-gme',
			parentId: '2026-09-04-morning',
			edition: 'morning',
			generatedAt: '2026-09-04T08:00:00Z',
			headline: 'GME morning brief',
			stance: 'bullish',
			stanceWhy: 'Clean close',
			quote: {
				symbol: 'GME',
				name: 'GameStop',
				price: 20.0,
				change: 1.0,
				changePct: 5.0,
				currency: 'USD'
			},
			sparkline: [],
			stories: []
		}),
		'2026-09-03-evening.json': JSON.stringify({
			id: '2026-09-03-evening',
			edition: 'evening',
			generatedAt: '2026-09-03T18:00:00Z',
			headline: 'Main evening brief',
			stories: [
				{
					id: 'story-2',
					title: 'Defense story',
					topics: ['Defense'],
					weight: 'normal',
					facts: ['Fact B'],
					sources: []
				}
			]
		})
	};

	it('loads and sorts editions chronologically descending', () => {
		const repo = new EditionRepository(new MockStorageAdapter(mockData), '/mock/dir');
		const all = repo.getAll();
		expect(all.length).toBe(3);
		expect(all[0].id).toBe('2026-09-04-morning');
		expect(all[2].id).toBe('2026-09-03-evening');
	});

	it('separates main briefings from GME desk briefings', () => {
		const repo = new EditionRepository(new MockStorageAdapter(mockData), '/mock/dir');
		const main = repo.getMainBriefings();
		const gme = repo.getGmeBriefings();
		expect(main.length).toBe(2);
		expect(gme.length).toBe(1);
		expect(gme[0].id).toBe('2026-09-04-morning-gme');
	});

	it('locates paired GME sibling for a main brief', () => {
		const repo = new EditionRepository(new MockStorageAdapter(mockData), '/mock/dir');
		expect(repo.findGmeSibling('2026-09-04-morning')).toBe('2026-09-04-morning-gme');
		expect(repo.findGmeSibling('2026-09-03-evening')).toBeUndefined();
	});

	it('indexes main-desk stories only without GME pollution', () => {
		const repo = new EditionRepository(new MockStorageAdapter(mockData), '/mock/dir');
		const indexed = repo.getIndexedStories();
		expect(indexed.length).toBe(2);
		expect(indexed.every((r) => r.desk === 'main')).toBe(true);
	});
});
