import type { Fact, FactObject } from './types';

const FACT_TEXT_SOFT_MAX = 220;
const FACT_OBJECT_KEYS = new Set(['text', 'sourceIndexes']);

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

function unknownKeys(
	obj: Record<string, unknown>,
	allowed: Set<string>,
	path: string
): FactValidationIssue[] {
	const issues: FactValidationIssue[] = [];
	for (const key of Object.keys(obj)) {
		if (!allowed.has(key)) {
			issues.push({
				level: 'warn',
				message: `${path}: unknown key "${key}" (ignored)`
			});
		}
	}
	return issues;
}

function validateFactText(text: string, path: string): FactValidationIssue[] {
	const issues: FactValidationIssue[] = [];
	if (!text.trim()) {
		issues.push({ level: 'error', message: `${path}: expected non-empty string` });
		return issues;
	}
	if (text.length > FACT_TEXT_SOFT_MAX) {
		issues.push({
			level: 'warn',
			message: `${path}: text length ${text.length} > ${FACT_TEXT_SOFT_MAX}`
		});
	}
	return issues;
}

/**
 * Validate one fact against a story's sources length.
 * Accepts plain non-empty strings or `{ text, sourceIndexes? }`.
 * Out-of-range indexes and unknown keys warn; negatives / empty text error.
 */
export function validateFact(
	raw: unknown,
	sourcesLength: number,
	path = 'fact'
): FactValidationIssue[] {
	const issues: FactValidationIssue[] = [];

	if (typeof raw === 'string') {
		return validateFactText(raw, path);
	}

	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		issues.push({
			level: 'error',
			message: `${path}: expected string or { text, sourceIndexes? }`
		});
		return issues;
	}

	const obj = raw as Record<string, unknown>;
	issues.push(...unknownKeys(obj, FACT_OBJECT_KEYS, path));

	if (typeof obj.text !== 'string') {
		issues.push({ level: 'error', message: `${path}.text: expected non-empty string` });
	} else {
		issues.push(...validateFactText(obj.text, `${path}.text`));
	}

	if (obj.sourceIndexes !== undefined) {
		if (!Array.isArray(obj.sourceIndexes)) {
			issues.push({ level: 'error', message: `${path}.sourceIndexes: expected number[]` });
		} else {
			obj.sourceIndexes.forEach((idx, j) => {
				if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0) {
					issues.push({
						level: 'error',
						message: `${path}.sourceIndexes[${j}]: expected non-negative integer`
					});
					return;
				}
				if (idx >= sourcesLength) {
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
