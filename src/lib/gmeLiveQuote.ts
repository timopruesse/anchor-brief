/**
 * Client-side GME quote poller for the static GitHub Pages build.
 *
 * Yahoo Finance chart/quote endpoints are not usable from the browser
 * (no CORS + frequent 429). TradingView's public scanner accepts a
 * CORS-friendly POST from github.io / localhost when the body is sent as
 * `text/plain` (avoids a Content-Type preflight that TV rejects).
 *
 * This is a delayed poll (`delayed_streaming_900` ≈ 15 min), not a
 * websocket tick stream — label UI accordingly.
 *
 * Premarket / after-hours columns are requested when available; if the
 * scanner rejects unknown columns we soft-fail back to the regular set.
 */

export interface ExtendedSessionQuote {
	price: number;
	change: number;
	changePct: number;
	volume?: number;
}

export type MarketSession = 'pre' | 'regular' | 'post' | 'closed';

export interface LiveQuote {
	symbol: string;
	price: number;
	change: number;
	changePct: number;
	currency: string;
	dayHigh?: number;
	dayLow?: number;
	volume?: number;
	week52High?: number;
	week52Low?: number;
	name?: string;
	/** ISO timestamp of when *we* received the poll response. */
	fetchedAt: string;
	/** Provider update mode when present (e.g. delayed_streaming_900). */
	updateMode?: string;
	/** Premarket last — omitted when TV fields are null/missing. */
	preMarket?: ExtendedSessionQuote;
	/** After-hours last — omitted when TV fields are null/missing. */
	postMarket?: ExtendedSessionQuote;
	/**
	 * Inferred from which extended fields are present + America/New_York
	 * wall clock. Omitted when the heuristic is unsure.
	 */
	session?: MarketSession;
	source: {
		label: string;
		url: string;
	};
}

const TV_SCAN_URL = 'https://scanner.tradingview.com/america/scan';

/** Regular-session columns — always safe to request. */
export const TV_COLUMNS_BASE = [
	'close',
	'change',
	'change_abs',
	'volume',
	'high',
	'low',
	'price_52_week_high',
	'price_52_week_low',
	'description',
	'currency',
	'update_mode'
] as const;

/** Extended-hours columns — soft-fail if the scanner rejects them. */
export const TV_COLUMNS_EXTENDED = [
	'premarket_close',
	'premarket_change',
	'premarket_change_abs',
	'premarket_volume',
	'postmarket_close',
	'postmarket_change',
	'postmarket_change_abs',
	'postmarket_volume'
] as const;

export const TV_COLUMNS = [...TV_COLUMNS_BASE, ...TV_COLUMNS_EXTENDED] as const;

export type TvColumn = (typeof TV_COLUMNS)[number];

interface TvScanRow {
	s?: string;
	d?: unknown[];
}

interface TvScanResponse {
	totalCount?: number;
	data?: TvScanRow[];
}

function num(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function str(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function col(row: unknown[], columns: readonly string[], name: string): unknown {
	const idx = columns.indexOf(name);
	return idx >= 0 ? row[idx] : undefined;
}

/**
 * Build an extended-hours quote only when price + absolute change + % are
 * all real numbers. Never invent missing fields.
 */
export function parseExtendedSession(
	row: unknown[],
	columns: readonly string[],
	prefix: 'premarket' | 'postmarket'
): ExtendedSessionQuote | undefined {
	const price = num(col(row, columns, `${prefix}_close`));
	const changePct = num(col(row, columns, `${prefix}_change`));
	const change = num(col(row, columns, `${prefix}_change_abs`));
	if (price == null || changePct == null || change == null) return undefined;

	const volume = num(col(row, columns, `${prefix}_volume`));
	const quote: ExtendedSessionQuote = { price, change, changePct };
	if (volume != null) quote.volume = volume;
	return quote;
}

/** Minutes since midnight + weekday short name in America/New_York. */
export function getNyClock(now: Date = new Date()): { minutes: number; weekday: string } {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/New_York',
		hour: '2-digit',
		minute: '2-digit',
		weekday: 'short',
		hourCycle: 'h23'
	}).formatToParts(now);

	const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? NaN);
	const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? NaN);
	const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
	const minutes = Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : NaN;
	return { minutes, weekday };
}

const PRE_START = 4 * 60; // 04:00
const REGULAR_START = 9 * 60 + 30; // 09:30
const POST_START = 16 * 60; // 16:00
const POST_END = 20 * 60; // 20:00

/**
 * Infer session from ETH fields + NY wall clock.
 * - postMarket.price + 16:00–20:00 → post
 * - preMarket.price + 04:00–09:30 → pre
 * - else regular/closed when the clock is clear; omit when unsure
 */
export function inferMarketSession(
	preMarket: ExtendedSessionQuote | undefined,
	postMarket: ExtendedSessionQuote | undefined,
	now: Date = new Date()
): MarketSession | undefined {
	const { minutes, weekday } = getNyClock(now);
	if (!Number.isFinite(minutes)) return undefined;

	const weekend = weekday === 'Sat' || weekday === 'Sun';
	const inPre = minutes >= PRE_START && minutes < REGULAR_START;
	const inRegular = minutes >= REGULAR_START && minutes < POST_START;
	const inPost = minutes >= POST_START && minutes < POST_END;

	if (postMarket != null && inPost) return 'post';
	if (preMarket != null && inPre) return 'pre';

	if (weekend) return 'closed';
	if (inRegular) return 'regular';
	if (minutes < PRE_START || minutes >= POST_END) return 'closed';

	// Inside a pre/post window but missing the matching ETH quote — unsure.
	return undefined;
}

export interface MapScanRowOptions {
	symbol: string;
	tvSymbol: string;
	columns?: readonly string[];
	fetchedAt?: string;
	now?: Date;
}

/**
 * Map a TradingView scanner `d` array into a LiveQuote.
 * Exported for unit tests with fixture rows.
 */
export function mapScanRowToLiveQuote(
	row: TvScanRow | undefined,
	options: MapScanRowOptions
): LiveQuote {
	const columns = options.columns ?? TV_COLUMNS;
	const values = row?.d;
	if (!Array.isArray(values) || values.length < 3) {
		throw new Error('TradingView scan returned no quote row');
	}

	const price = num(col(values, columns, 'close'));
	const changePct = num(col(values, columns, 'change'));
	const change = num(col(values, columns, 'change_abs'));
	if (price == null || changePct == null || change == null) {
		throw new Error('TradingView scan missing price fields');
	}

	const ticker = (row?.s?.split(':').pop() || options.symbol).toUpperCase();
	const preMarket = parseExtendedSession(values, columns, 'premarket');
	const postMarket = parseExtendedSession(values, columns, 'postmarket');
	const session = inferMarketSession(preMarket, postMarket, options.now ?? new Date());

	const quote: LiveQuote = {
		symbol: ticker,
		price,
		change,
		changePct,
		currency: str(col(values, columns, 'currency')) ?? 'USD',
		dayHigh: num(col(values, columns, 'high')) ?? undefined,
		dayLow: num(col(values, columns, 'low')) ?? undefined,
		volume: num(col(values, columns, 'volume')) ?? undefined,
		week52High: num(col(values, columns, 'price_52_week_high')) ?? undefined,
		week52Low: num(col(values, columns, 'price_52_week_low')) ?? undefined,
		name: str(col(values, columns, 'description')),
		fetchedAt: options.fetchedAt ?? new Date().toISOString(),
		updateMode: str(col(values, columns, 'update_mode')),
		source: {
			label: 'TradingView',
			url: `https://www.tradingview.com/symbols/${options.tvSymbol.replace(':', '-')}/`
		}
	};

	if (preMarket) quote.preMarket = preMarket;
	if (postMarket) quote.postMarket = postMarket;
	if (session) quote.session = session;
	return quote;
}

/** Map a bare ticker (e.g. GME) to TradingView's America scanner id. */
export function toTradingViewSymbol(symbol: string): string {
	const clean = symbol.trim().toUpperCase();
	if (!clean) return 'NYSE:GME';
	if (clean.includes(':')) return clean;
	// GME desk is NYSE-listed; keep deterministic for this page.
	return `NYSE:${clean}`;
}

async function postTvScan(
	columns: readonly string[],
	tvSymbol: string,
	signal?: AbortSignal
): Promise<TvScanResponse> {
	const body = JSON.stringify({
		symbols: { tickers: [tvSymbol], query: { types: [] } },
		columns: [...columns]
	});

	const res = await fetch(TV_SCAN_URL, {
		method: 'POST',
		// text/plain keeps this a "simple" request so browsers skip the
		// Content-Type preflight; TV's ACAO reflects our Origin either way.
		headers: { 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'application/json' },
		body,
		signal,
		credentials: 'omit',
		cache: 'no-store'
	});

	if (!res.ok) {
		throw new Error(`TradingView scan HTTP ${res.status}`);
	}

	return (await res.json()) as TvScanResponse;
}

/**
 * Fetch a delayed quote for `symbol` from TradingView's public scanner.
 * Tries extended-hours columns first; on rejection falls back to the
 * regular-session column set so the desk never breaks.
 * Throws on network/CORS/parse failure — callers should catch and keep the
 * briefing snapshot.
 */
export async function fetchLiveQuote(symbol: string, signal?: AbortSignal): Promise<LiveQuote> {
	const tvSymbol = toTradingViewSymbol(symbol);
	const now = new Date();
	const fetchedAt = now.toISOString();

	try {
		const json = await postTvScan(TV_COLUMNS, tvSymbol, signal);
		return mapScanRowToLiveQuote(json.data?.[0], {
			symbol,
			tvSymbol,
			columns: TV_COLUMNS,
			fetchedAt,
			now
		});
	} catch (err) {
		if (signal?.aborted) throw err;
		// Soft-fail: unknown ETH columns (or transient parse) → base set.
		const json = await postTvScan(TV_COLUMNS_BASE, tvSymbol, signal);
		return mapScanRowToLiveQuote(json.data?.[0], {
			symbol,
			tvSymbol,
			columns: TV_COLUMNS_BASE,
			fetchedAt,
			now
		});
	}
}

/** Default poll interval — TV marks the feed as ~15 min delayed. */
export const LIVE_QUOTE_POLL_MS = 60_000;
