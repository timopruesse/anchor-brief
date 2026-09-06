import { describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const validatePath = join(import.meta.dir, '../tools/validate.mjs');

function runValidate(dataDir: string) {
	return spawnSync('bun', [validatePath, dataDir], {
		encoding: 'utf8',
		cwd: join(import.meta.dir, '..')
	});
}

describe('source.via soft validation', () => {
	it('accepts sources with optional via and exits 0', () => {
		const dir = mkdtempSync(join(tmpdir(), 'anchor-via-'));
		try {
			writeFileSync(
				join(dir, '2026-09-06-via.json'),
				JSON.stringify({
					id: '2026-09-06-via',
					edition: 'morning',
					generatedAt: '2026-09-06T08:00:00+02:00',
					headline: 'Via chip fixture',
					stories: [
						{
							id: 'sample',
							title: 'Outbound article discovered on X',
							topics: ['Tech'],
							weight: 'normal',
							facts: ['Article landed after an X expand'],
							whyItMatters: 'Discovery trail stays visible',
							image: null,
							sources: [
								{
									kind: 'article',
									label: 'DER SPIEGEL',
									url: 'https://www.spiegel.de/example',
									via: {
										kind: 'x',
										label: 'DER SPIEGEL on X',
										url: 'https://x.com/derspiegel/status/1'
									}
								},
								{
									kind: 'article',
									label: 'Plain article',
									url: 'https://example.com/plain'
								}
							]
						}
					]
				})
			);

			const result = runValidate(dir);
			expect(result.status).toBe(0);
			expect(result.stderr).not.toContain('error:');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('soft-warns on malformed via without failing', () => {
		const dir = mkdtempSync(join(tmpdir(), 'anchor-via-bad-'));
		try {
			writeFileSync(
				join(dir, '2026-09-06-via-bad.json'),
				JSON.stringify({
					id: '2026-09-06-via-bad',
					edition: 'morning',
					generatedAt: '2026-09-06T08:00:00+02:00',
					headline: 'Malformed via fixture',
					stories: [
						{
							id: 'sample',
							title: 'Broken via',
							topics: ['Tech'],
							weight: 'brief',
							facts: [{ text: 'Still valid story', sourceIndexes: [0] }],
							whyItMatters: 'Soft fail',
							image: null,
							sources: [
								{
									kind: 'article',
									label: 'Example',
									url: 'https://example.com/a',
									via: 'not-an-object'
								}
							]
						}
					]
				})
			);

			const result = runValidate(dir);
			expect(result.status).toBe(0);
			const out = `${result.stdout}\n${result.stderr}`;
			expect(out).toContain('via: expected object');
			expect(out).toContain('0 error(s)');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
