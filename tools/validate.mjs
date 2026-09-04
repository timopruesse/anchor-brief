#!/usr/bin/env bun
/**
 * Soft-validate main/GME briefing JSON under data/.
 * Accepts string facts and { text, sourceIndexes? } objects.
 * Warns on out-of-range sourceIndexes; string-only roundups remain valid.
 *
 * Usage: bun tools/validate.mjs [dataDir]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = process.argv[2] || join(process.cwd(), 'data');

/** @typedef {{ level: 'error' | 'warn'; message: string }} Issue */

/**
 * @param {unknown} raw
 * @param {number} sourcesLength
 * @param {string} path
 * @returns {Issue[]}
 */
function validateFact(raw, sourcesLength, path) {
	/** @type {Issue[]} */
	const issues = [];

	if (typeof raw === 'string') return issues;

	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		issues.push({ level: 'error', message: `${path}: expected string or { text, sourceIndexes? }` });
		return issues;
	}

	const obj = /** @type {Record<string, unknown>} */ (raw);
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

/**
 * @param {unknown} data
 * @param {string} file
 * @returns {Issue[]}
 */
function validateBriefing(data, file) {
	/** @type {Issue[]} */
	const issues = [];
	if (!data || typeof data !== 'object') {
		issues.push({ level: 'error', message: `${file}: expected object` });
		return issues;
	}
	const brief = /** @type {Record<string, unknown>} */ (data);
	if (typeof brief.id !== 'string' || !brief.id) {
		issues.push({ level: 'error', message: `${file}: missing id` });
	}
	if (!Array.isArray(brief.stories)) {
		issues.push({ level: 'error', message: `${file}: stories must be an array` });
		return issues;
	}

	brief.stories.forEach((story, si) => {
		if (!story || typeof story !== 'object') {
			issues.push({ level: 'error', message: `${file} stories[${si}]: expected object` });
			return;
		}
		const s = /** @type {Record<string, unknown>} */ (story);
		const sources = Array.isArray(s.sources) ? s.sources : [];
		const facts = Array.isArray(s.facts) ? s.facts : null;
		if (facts === null) {
			issues.push({ level: 'error', message: `${file} stories[${si}].facts: expected array` });
			return;
		}
		facts.forEach((fact, fi) => {
			issues.push(
				...validateFact(fact, sources.length, `${file} stories[${si}].facts[${fi}]`)
			);
		});
	});

	return issues;
}

let files;
try {
	files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
} catch (err) {
	console.error(`Cannot read ${dataDir}:`, err);
	process.exit(1);
}

/** @type {Issue[]} */
const allIssues = [];
for (const file of files) {
	try {
		const raw = readFileSync(join(dataDir, file), 'utf8');
		const data = JSON.parse(raw);
		allIssues.push(...validateBriefing(data, file));
	} catch (err) {
		allIssues.push({
			level: 'error',
			message: `${file}: ${err instanceof Error ? err.message : String(err)}`
		});
	}
}

const errors = allIssues.filter((i) => i.level === 'error');
const warnings = allIssues.filter((i) => i.level === 'warn');

for (const w of warnings) console.warn(`warn: ${w.message}`);
for (const e of errors) console.error(`error: ${e.message}`);

console.log(
	`Validated ${files.length} file(s): ${errors.length} error(s), ${warnings.length} warning(s)`
);

if (errors.length) process.exit(1);
