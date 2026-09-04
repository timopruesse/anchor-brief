import { describe, expect, it } from 'bun:test';
import {
	factText,
	isFactObject,
	normalizeFact,
	validateFact
} from '../src/lib/facts';

describe('normalizeFact', () => {
	it('treats plain strings as { text }', () => {
		expect(normalizeFact('Hello')).toEqual({ text: 'Hello' });
	});

	it('passes through object facts with sourceIndexes', () => {
		expect(normalizeFact({ text: 'Tip', sourceIndexes: [0, 2] })).toEqual({
			text: 'Tip',
			sourceIndexes: [0, 2]
		});
	});

	it('drops empty or non-integer sourceIndexes', () => {
		expect(normalizeFact({ text: 'A', sourceIndexes: [] })).toEqual({ text: 'A' });
		expect(
			normalizeFact({ text: 'B', sourceIndexes: [1.5, 'x', 0] as unknown as number[] })
		).toEqual({
			text: 'B',
			sourceIndexes: [0]
		});
	});

	it('soft-fails on invalid values', () => {
		expect(normalizeFact(null)).toEqual({ text: '' });
		expect(normalizeFact(42)).toEqual({ text: '' });
		expect(normalizeFact({ label: 'nope' })).toEqual({ text: '' });
	});
});

describe('factText / isFactObject', () => {
	it('extracts searchable text from both shapes', () => {
		expect(factText('plain')).toBe('plain');
		expect(factText({ text: 'obj', sourceIndexes: [1] })).toBe('obj');
	});

	it('narrows object facts', () => {
		expect(isFactObject('x')).toBe(false);
		expect(isFactObject({ text: 'y' })).toBe(true);
	});
});

describe('validateFact', () => {
	it('accepts string-only facts', () => {
		expect(validateFact('ok', 3)).toEqual([]);
	});

	it('accepts object facts with in-range indexes', () => {
		expect(validateFact({ text: 'ok', sourceIndexes: [0, 2] }, 3)).toEqual([]);
	});

	it('warns on out-of-range sourceIndexes', () => {
		const issues = validateFact({ text: 'x', sourceIndexes: [5] }, 2);
		expect(issues).toHaveLength(1);
		expect(issues[0].level).toBe('warn');
		expect(issues[0].message).toContain('out of range');
	});

	it('errors on malformed shapes', () => {
		expect(validateFact({ sourceIndexes: [0] }, 1)[0].level).toBe('error');
		expect(validateFact(null, 0)[0].level).toBe('error');
		expect(validateFact({ text: 'a', sourceIndexes: 'bad' }, 1)[0].level).toBe('error');
	});
});
