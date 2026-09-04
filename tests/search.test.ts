import { describe, expect, it } from 'bun:test';
import {
	computeTopicFacets,
	filterItems,
	formatFilterStatus
} from '../src/lib/search';

interface MockStory {
	id: string;
	title: string;
	topics: string[];
	facts: string[];
	whyItMatters?: string;
}

const mockStories: MockStory[] = [
	{
		id: '1',
		title: 'OpenAI launches GPT-6 Astra with Critical cyber designation',
		topics: ['AI', 'Tech'],
		facts: ['Greg Brockman frames as AGI era', 'Critical cybersecurity Preparedness label'],
		whyItMatters: 'Convergence of race and safety politics'
	},
	{
		id: '2',
		title: 'NVIDIA acquires Hugging Face for $12.93B cash and stock',
		topics: ['Tech', 'Markets'],
		facts: ['Consolidates open weights hub into CUDA stack'],
		whyItMatters: 'Antitrust review expected in EU'
	},
	{
		id: '3',
		title: 'Berlin municipal infrastructure targeted in ransomware wave',
		topics: ['Security', 'Europe'],
		facts: ['Critical services disrupted overnight in Groß-Berlin'],
		whyItMatters: 'Attribution points to state-backed actor'
	}
];

describe('pure search module', () => {
	const options = {
		extractTopics: (s: MockStory) => s.topics,
		extractSearchFields: (s: MockStory) => [
			s.title,
			...s.facts,
			s.whyItMatters ?? '',
			...s.topics
		]
	};

	it('returns all items when query and topic are empty', () => {
		const res = filterItems(mockStories, '', null, options);
		expect(res.length).toBe(3);
	});

	it('filters by active topic', () => {
		const res = filterItems(mockStories, '', 'AI', options);
		expect(res.length).toBe(1);
		expect(res[0].id).toBe('1');
	});

	it('performs multi-token search matching across title and facts', () => {
		const res = filterItems(mockStories, 'openai astra', null, options);
		expect(res.length).toBe(1);
		expect(res[0].id).toBe('1');
	});

	it('performs multi-token search matching German diacritics', () => {
		// "gross" in query matches "Groß-Berlin" in facts
		const res = filterItems(mockStories, 'gross berlin', null, options);
		expect(res.length).toBe(1);
		expect(res[0].id).toBe('3');
	});

	it('intersects topic filter and text query', () => {
		const res1 = filterItems(mockStories, 'tech', 'AI', options);
		expect(res1.length).toBe(1);
		expect(res1[0].id).toBe('1');

		const res2 = filterItems(mockStories, 'nvidia', 'AI', options);
		expect(res2.length).toBe(0);
	});

	it('computes topic facets with alphabetical sorting', () => {
		const facets = computeTopicFacets(mockStories, (s) => s.topics, false);
		expect(facets).toEqual([
			{ topic: 'AI', count: 1 },
			{ topic: 'Europe', count: 1 },
			{ topic: 'Markets', count: 1 },
			{ topic: 'Security', count: 1 },
			{ topic: 'Tech', count: 2 }
		]);
	});

	it('computes topic facets with frequency sorting', () => {
		const facets = computeTopicFacets(mockStories, (s) => s.topics, true);
		expect(facets[0]).toEqual({ topic: 'Tech', count: 2 });
	});

	it('formats default filter status strings', () => {
		expect(formatFilterStatus(3, 3, false)).toBe('3 stories');
		expect(formatFilterStatus(1, 3, true)).toBe('Showing 1 of 3');
	});
});
