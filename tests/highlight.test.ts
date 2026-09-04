import { describe, expect, it } from 'bun:test';
import { splitHighlight } from '../src/lib/highlight';

describe('splitHighlight', () => {
	it('returns original string when query is empty', () => {
		const res = splitHighlight('Hello world', '');
		expect(res).toEqual([{ text: 'Hello world', hit: false }]);
	});

	it('returns matching substring while preserving casing', () => {
		const res = splitHighlight('OpenAI launches GPT-6 Astra', 'astra');
		expect(res).toEqual([
			{ text: 'OpenAI launches GPT-6 ', hit: false },
			{ text: 'Astra', hit: true }
		]);
	});

	it('handles multiple tokens across different positions', () => {
		const res = splitHighlight('OpenAI launches GPT-6 Astra in Berlin', 'openai astra');
		expect(res).toEqual([
			{ text: 'OpenAI', hit: true },
			{ text: ' launches GPT-6 ', hit: false },
			{ text: 'Astra', hit: true },
			{ text: ' in Berlin', hit: false }
		]);
	});

	it('correctly matches German ß and ss interchangeably without length bugs', () => {
		const res = splitHighlight('Große Straße in Berlin', 'grosse strasse');
		expect(res).toEqual([
			{ text: 'Große', hit: true },
			{ text: ' ', hit: false },
			{ text: 'Straße', hit: true },
			{ text: ' in Berlin', hit: false }
		]);
	});

	it('handles special regex characters safely in query', () => {
		const res = splitHighlight('Version (v2.0) [latest] costs $10.00?', '(v2.0) $10.00?');
		expect(res).toEqual([
			{ text: 'Version ', hit: false },
			{ text: '(v2.0)', hit: true },
			{ text: ' [latest] costs ', hit: false },
			{ text: '$10.00?', hit: true }
		]);
	});
});
