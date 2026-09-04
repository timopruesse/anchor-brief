import type { Fact, FactObject } from './types';

/**
 * Soft-normalize a fact wire value to `{ text, sourceIndexes? }`.
 * Strings become `{ text }`; invalid values yield `{ text: '' }`.
 */
export function normalizeFact(raw: unknown): FactObject {
	if (typeof raw === 'string') {
		return { text: raw };
	}
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		const obj = raw as Record<string, unknown>;
		const text = typeof obj.text === 'string' ? obj.text : '';
		const indexes = Array.isArray(obj.sourceIndexes)
			? obj.sourceIndexes.filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
			: undefined;
		return indexes?.length ? { text, sourceIndexes: indexes } : { text };
	}
	return { text: '' };
}

/** Search / highlight text for a fact (string or object). */
export function factText(raw: unknown): string {
	return normalizeFact(raw).text;
}

export function isFactObject(raw: Fact): raw is FactObject {
	return typeof raw === 'object' && raw !== null && typeof (raw as FactObject).text === 'string';
}

export interface FactValidationIssue {
	level: 'error' | 'warn';
	message: string;
}

/**
 * Validate one fact against a story's sources length.
 * Strings are always valid. Objects need a string `text`; out-of-range indexes warn.
 */
export function validateFact(
	raw: unknown,
	sourcesLength: number,
	path = 'fact'
): FactValidationIssue[] {
	const issues: FactValidationIssue[] = [];

	if (typeof raw === 'string') {
		return issues;
	}

	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		issues.push({ level: 'error', message: `${path}: expected string or { text, sourceIndexes? }` });
		return issues;
	}

	const obj = raw as Record<string, unknown>;
	if (typeof obj.text !== 'string') {
		issues.push({ level: 'error', message: `${path}.text: expected string` });
	}

	if (obj.sourceIndexes !== undefined) {
		if (!Array.isArray(obj.sourceIndexes)) {
			issues.push({ level: 'error', message: `${path}.sourceIndexes: expected number[]` });
		} else {
			obj.sourceIndexes.forEach((idx, j) => {
				if (typeof idx !== 'number' || !Number.isInteger(idx)) {
					issues.push({
						level: 'error',
						message: `${path}.sourceIndexes[${j}]: expected integer`
					});
					return;
				}
				if (idx < 0 || idx >= sourcesLength) {
					issues.push({
						level: 'warn',
						message: `${path}.sourceIndexes[${j}]=${idx} out of range (sources length ${sourcesLength})`
					});
				}
			});
		}
	}

	return issues;
}
