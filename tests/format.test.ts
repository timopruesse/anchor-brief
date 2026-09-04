import { describe, expect, it } from 'bun:test';
import {
	editionLabel,
	fold,
	safeHref,
	toDate,
	sortStoriesByWeight,
	formatMoney,
	formatPct,
	formatSigned,
	domainFromUrl,
	faviconUrl
} from '../src/lib/format';

describe('format utilities', () => {
	it('formats edition labels', () => {
		expect(editionLabel('morning')).toBe('Morning edition');
		expect(editionLabel('afternoon')).toBe('Afternoon edition');
		expect(editionLabel('evening')).toBe('Evening edition');
		expect(editionLabel(undefined)).toBe('Briefing');
	});

	it('folds strings by lowercasing, normalizing diacritics, and sharp-s', () => {
		expect(fold('Groß')).toBe('gross');
		expect(fold('Élysée')).toBe('elysee');
		expect(fold('   OpenAI   ')).toBe('openai');
	});

	it('validates safe http(s) hrefs', () => {
		expect(safeHref('https://example.com')).toBe('https://example.com');
		expect(safeHref('http://example.com')).toBe('http://example.com');
		expect(safeHref('javascript:alert(1)')).toBeNull();
		expect(safeHref('data:text/html,evil')).toBeNull();
		expect(safeHref('')).toBeNull();
		expect(safeHref(null)).toBeNull();
	});

	it('parses ISO date strings safely', () => {
		const d = toDate('2026-09-04T08:50:00+02:00');
		expect(d).not.toBeNull();
		expect(d?.getUTCFullYear()).toBe(2026);
		expect(toDate('invalid-date')).toBeNull();
		expect(toDate(null)).toBeNull();
	});

	it('sorts stories stably by weight hierarchy: lead, normal, brief', () => {
		const input = [
			{ id: '1', weight: 'brief' },
			{ id: '2', weight: 'lead' },
			{ id: '3', weight: 'normal' }
		];
		const sorted = sortStoriesByWeight(input);
		expect(sorted.map((s) => s.id)).toEqual(['2', '3', '1']);
	});

	it('formats currencies, percentages and signed deltas', () => {
		expect(formatMoney(19.23, 'USD')).toBe('$19.23');
		expect(formatPct(1.371)).toBe('+1.37%');
		expect(formatPct(-2.5)).toBe('-2.50%');
		expect(formatSigned(0.42, 2)).toBe('+0.42');
		expect(formatSigned(-0.15, 2)).toBe('-0.15');
	});

	it('extracts domains from URLs and generates favicon URLs', () => {
		expect(domainFromUrl('https://www.zeit.de/news/2026-09')).toBe('zeit.de');
		expect(domainFromUrl('https://x.com/derspiegel/status/123')).toBe('x.com');
		expect(domainFromUrl('https://berlin.de/news')).toBe('berlin.de');
		expect(domainFromUrl('invalid-url')).toBeNull();
		expect(domainFromUrl(null)).toBeNull();

		expect(faviconUrl('zeit.de')).toBe('https://www.google.com/s2/favicons?domain=zeit.de&sz=32');
		expect(faviconUrl(null)).toBeNull();
	});
});
