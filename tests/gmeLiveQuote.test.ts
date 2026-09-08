import { describe, expect, it } from 'bun:test';
import {
	TV_COLUMNS,
	TV_COLUMNS_BASE,
	inferMarketSession,
	mapScanRowToLiveQuote,
	parseExtendedSession,
	toTradingViewSymbol,
	type ExtendedSessionQuote
} from '../src/lib/gmeLiveQuote';

/** Fixture row matching TV_COLUMNS order (base + extended). */
function ethRow(overrides: {
	close?: number | null;
	change?: number | null;
	change_abs?: number | null;
	premarket_close?: number | null;
	premarket_change?: number | null;
	premarket_change_abs?: number | null;
	premarket_volume?: number | null;
	postmarket_close?: number | null;
	postmarket_change?: number | null;
	postmarket_change_abs?: number | null;
	postmarket_volume?: number | null;
} = {}): unknown[] {
	const d: unknown[] = Array.from({ length: TV_COLUMNS.length }, () => null);
	const set = (name: (typeof TV_COLUMNS)[number], value: unknown) => {
		d[TV_COLUMNS.indexOf(name)] = value;
	};

	set('close', overrides.close ?? 19.16);
	set('change', overrides.change ?? -0.364);
	set('change_abs', overrides.change_abs ?? -0.07);
	set('volume', 7_146_363);
	set('high', 19.5);
	set('low', 19.04);
	set('price_52_week_high', 28.1);
	set('price_52_week_low', 17.79);
	set('description', 'GameStop Corp. Class A');
	set('currency', 'USD');
	set('update_mode', 'delayed_streaming_900');

	if ('premarket_close' in overrides) set('premarket_close', overrides.premarket_close);
	if ('premarket_change' in overrides) set('premarket_change', overrides.premarket_change);
	if ('premarket_change_abs' in overrides) set('premarket_change_abs', overrides.premarket_change_abs);
	if ('premarket_volume' in overrides) set('premarket_volume', overrides.premarket_volume);
	if ('postmarket_close' in overrides) set('postmarket_close', overrides.postmarket_close);
	if ('postmarket_change' in overrides) set('postmarket_change', overrides.postmarket_change);
	if ('postmarket_change_abs' in overrides) set('postmarket_change_abs', overrides.postmarket_change_abs);
	if ('postmarket_volume' in overrides) set('postmarket_volume', overrides.postmarket_volume);

	return d;
}

const mapOpts = {
	symbol: 'GME',
	tvSymbol: 'NYSE:GME',
	columns: TV_COLUMNS,
	fetchedAt: '2026-09-08T12:00:00.000Z'
};

describe('toTradingViewSymbol', () => {
	it('maps bare tickers to NYSE', () => {
		expect(toTradingViewSymbol('gme')).toBe('NYSE:GME');
		expect(toTradingViewSymbol('NYSE:GME')).toBe('NYSE:GME');
	});
});

describe('parseExtendedSession', () => {
	it('returns undefined when any required field is null', () => {
		const row = ethRow({
			premarket_close: 19.4,
			premarket_change: 0.88,
			premarket_change_abs: null
		});
		expect(parseExtendedSession(row, TV_COLUMNS, 'premarket')).toBeUndefined();
	});

	it('omits volume when missing but keeps price/change', () => {
		const row = ethRow({
			premarket_close: 19.4,
			premarket_change: 0.88,
			premarket_change_abs: 0.17
		});
		expect(parseExtendedSession(row, TV_COLUMNS, 'premarket')).toEqual({
			price: 19.4,
			change: 0.17,
			changePct: 0.88
		});
	});
});

describe('mapScanRowToLiveQuote', () => {
	it('maps premarket-only fixture and omits postMarket', () => {
		const row = {
			s: 'NYSE:GME',
			d: ethRow({
				premarket_close: 19.4,
				premarket_change: 0.884,
				premarket_change_abs: 0.17,
				premarket_volume: 411_765
			})
		};
		// Tuesday 2026-09-08 08:00 UTC = 04:00 ET (premarket)
		const quote = mapScanRowToLiveQuote(row, {
			...mapOpts,
			now: new Date('2026-09-08T08:00:00.000Z')
		});

		expect(quote.price).toBe(19.16);
		expect(quote.preMarket).toEqual({
			price: 19.4,
			change: 0.17,
			changePct: 0.884,
			volume: 411_765
		});
		expect(quote.postMarket).toBeUndefined();
		expect(quote.session).toBe('pre');
	});

	it('maps postmarket-only fixture and omits preMarket', () => {
		const row = {
			s: 'NYSE:GME',
			d: ethRow({
				postmarket_close: 19.21,
				postmarket_change: 0.261,
				postmarket_change_abs: 0.05,
				postmarket_volume: 863_613
			})
		};
		// Tuesday 2026-09-08 21:00 UTC = 17:00 ET (after-hours)
		const quote = mapScanRowToLiveQuote(row, {
			...mapOpts,
			now: new Date('2026-09-08T21:00:00.000Z')
		});

		expect(quote.preMarket).toBeUndefined();
		expect(quote.postMarket).toEqual({
			price: 19.21,
			change: 0.05,
			changePct: 0.261,
			volume: 863_613
		});
		expect(quote.session).toBe('post');
	});

	it('omits both extended objects when fields are null', () => {
		const row = {
			s: 'NYSE:GME',
			d: ethRow({
				premarket_close: null,
				premarket_change: null,
				premarket_change_abs: null,
				postmarket_close: null,
				postmarket_change: null,
				postmarket_change_abs: null
			})
		};
		const quote = mapScanRowToLiveQuote(row, {
			...mapOpts,
			now: new Date('2026-09-08T15:00:00.000Z') // 11:00 ET regular
		});

		expect(quote.preMarket).toBeUndefined();
		expect(quote.postMarket).toBeUndefined();
		expect(quote.session).toBe('regular');
	});

	it('does not invent numbers when only some ETH fields are present', () => {
		const row = {
			s: 'NYSE:GME',
			d: ethRow({
				premarket_close: 19.4,
				premarket_change: null,
				premarket_change_abs: 0.17,
				postmarket_close: 19.21,
				postmarket_change: 0.26,
				postmarket_change_abs: null
			})
		};
		const quote = mapScanRowToLiveQuote(row, {
			...mapOpts,
			now: new Date('2026-09-08T15:00:00.000Z')
		});

		expect(quote.preMarket).toBeUndefined();
		expect(quote.postMarket).toBeUndefined();
	});

	it('maps base-only columns without ETH keys', () => {
		const d: unknown[] = [
			19.16,
			-0.364,
			-0.07,
			7_146_363,
			19.5,
			19.04,
			28.1,
			17.79,
			'GameStop Corp. Class A',
			'USD',
			'delayed_streaming_900'
		];
		const quote = mapScanRowToLiveQuote(
			{ s: 'NYSE:GME', d },
			{
				...mapOpts,
				columns: TV_COLUMNS_BASE,
				now: new Date('2026-09-08T15:00:00.000Z')
			}
		);
		expect(quote.preMarket).toBeUndefined();
		expect(quote.postMarket).toBeUndefined();
		expect(quote.price).toBe(19.16);
	});
});

describe('inferMarketSession', () => {
	const pre: ExtendedSessionQuote = { price: 19.4, change: 0.17, changePct: 0.88 };
	const post: ExtendedSessionQuote = { price: 19.21, change: 0.05, changePct: 0.26 };

	it('prefers post when both exist but clock is after-hours', () => {
		expect(inferMarketSession(pre, post, new Date('2026-09-08T21:30:00.000Z'))).toBe('post');
	});

	it('prefers pre when both exist but clock is premarket', () => {
		expect(inferMarketSession(pre, post, new Date('2026-09-08T12:00:00.000Z'))).toBe('pre');
	});

	it('returns closed on weekends', () => {
		expect(inferMarketSession(undefined, undefined, new Date('2026-09-05T15:00:00.000Z'))).toBe(
			'closed'
		);
	});

	it('omits session in eth window without matching quote', () => {
		expect(inferMarketSession(undefined, undefined, new Date('2026-09-08T08:30:00.000Z'))).toBeUndefined();
	});
});
