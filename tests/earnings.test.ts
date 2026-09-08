import { describe, expect, it } from 'bun:test';
import {
	defaultComparisonMode,
	formatEarningsValue,
	formatOutlookChip,
	normalizeEarnings
} from '../src/lib/earnings';

const sample = {
	asOf: '2026-09-08',
	source: {
		label: 'GameStop IR — Q2 2026 Results',
		url: 'https://investor.gamestop.com/news-releases/news-details/2026/GameStop-Discloses-Second-Quarter-2026-Results/default.aspx',
		kind: 'primary'
	},
	comparisons: {
		yoy: {
			label: 'Q2 FY2026 vs Q2 FY2025',
			periods: [
				{ id: 'q2-2025', label: "Q2'25", end: '2025-08-02' },
				{ id: 'q2-2026', label: "Q2'26", end: '2026-08-01' }
			],
			metrics: [
				{
					id: 'netSales',
					label: 'Net sales',
					unit: 'USD_M',
					values: { 'q2-2025': 972.2, 'q2-2026': 790.2 }
				}
			]
		},
		qoq: {
			label: 'Q2 FY2026 vs Q1 FY2026',
			periods: [
				{ id: 'q1-2026', label: "Q1'26", end: '2026-05-02' },
				{ id: 'q2-2026', label: "Q2'26", end: '2026-08-01' }
			],
			metrics: [
				{
					id: 'liquidity',
					label: 'Cash + securities + digital (+ Q1 collateral)',
					unit: 'USD_B',
					values: { 'q1-2026': 9.7, 'q2-2026': 5.4 },
					note: 'Q1 IR includes collateral — not perfectly like-for-like'
				}
			]
		}
	},
	mix: {
		label: "Q2'26 sales mix",
		unit: 'pct',
		segments: [
			{ id: 'collectibles', label: 'Collectibles', value: 45.1 },
			{ id: 'videoGames', label: 'Video Games', value: 33.3 }
		],
		note: 'From IR sales-mix table.'
	},
	outlook: {
		adjEbitdaFy2026: { op: '>', value: 650, unit: 'USD_M', prior: 600 }
	}
};

describe('normalizeEarnings', () => {
	it('returns null on missing or empty input', () => {
		expect(normalizeEarnings(null)).toBeNull();
		expect(normalizeEarnings({})).toBeNull();
		expect(normalizeEarnings({ source: { label: 'x', url: 'https://x.test' } })).toBeNull();
	});

	it('normalizes the afternoon-gme shaped payload', () => {
		const e = normalizeEarnings(sample);
		expect(e).not.toBeNull();
		expect(e?.asOf).toBe('2026-09-08');
		expect(e?.source.kind).toBe('primary');
		expect(e?.comparisons.yoy?.metrics.length).toBe(1);
		expect(e?.comparisons.qoq?.metrics[0]?.note).toContain('like-for-like');
		expect(e?.mix?.segments.length).toBe(2);
		expect(e?.outlook?.adjEbitdaFy2026).toBeTruthy();
	});

	it('keeps mix-only earnings when comparisons are absent', () => {
		const e = normalizeEarnings({
			asOf: '2026-09-08',
			source: { label: 'IR', url: 'https://example.com' },
			comparisons: {},
			mix: {
				label: 'Mix',
				unit: 'pct',
				segments: [{ id: 'a', label: 'A', value: 100 }]
			}
		});
		expect(e).not.toBeNull();
		expect(e?.comparisons.yoy).toBeUndefined();
		expect(e?.mix?.segments[0]?.value).toBe(100);
	});
});

describe('formatEarningsValue', () => {
	it('formats USD_M / USD_B / pct', () => {
		expect(formatEarningsValue(790.2, 'USD_M')).toBe('$790.2M');
		expect(formatEarningsValue(5.4, 'USD_B')).toBe('$5.4B');
		expect(formatEarningsValue(45.1, 'pct')).toBe('45.1%');
		expect(formatEarningsValue(650, 'USD_M')).toBe('$650M');
	});
});

describe('formatOutlookChip / defaultComparisonMode', () => {
	it('builds adj EBITDA chip and prefers YoY', () => {
		const e = normalizeEarnings(sample)!;
		expect(defaultComparisonMode(e)).toBe('yoy');
		const chip = formatOutlookChip(e.outlook);
		expect(chip?.label).toBe('FY26 adj. EBITDA');
		expect(chip?.detail).toContain('$650M');
		expect(chip?.detail).toContain('$600M');
	});

	it('returns null chip when outlook shape unknown', () => {
		expect(formatOutlookChip({ other: 1 })).toBeNull();
		expect(formatOutlookChip(undefined)).toBeNull();
	});
});
