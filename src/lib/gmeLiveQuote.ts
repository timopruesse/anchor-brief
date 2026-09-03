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
 */

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
	source: {
		label: string;
		url: string;
	};
}

const TV_SCAN_URL = 'https://scanner.tradingview.com/america/scan';
const TV_COLUMNS = [
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

type TvColumn = (typeof TV_COLUMNS)[number];

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

function col(row: unknown[], name: TvColumn): unknown {
	return row[TV_COLUMNS.indexOf(name)];
}

/** Map a bare ticker (e.g. GME) to TradingView's America scanner id. */
export function toTradingViewSymbol(symbol: string): string {
	const clean = symbol.trim().toUpperCase();
	if (!clean) return 'NYSE:GME';
	if (clean.includes(':')) return clean;
	// GME desk is NYSE-listed; keep deterministic for this page.
	return `NYSE:${clean}`;
}

/**
 * Fetch a delayed quote for `symbol` from TradingView's public scanner.
 * Throws on network/CORS/parse failure — callers should catch and keep the
 * briefing snapshot.
 */
export async function fetchLiveQuote(symbol: string, signal?: AbortSignal): Promise<LiveQuote> {
	const tvSymbol = toTradingViewSymbol(symbol);
	const body = JSON.stringify({
		symbols: { tickers: [tvSymbol], query: { types: [] } },
		columns: [...TV_COLUMNS]
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

	const json = (await res.json()) as TvScanResponse;
	const row = json.data?.[0];
	const values = row?.d;
	if (!Array.isArray(values) || values.length < 3) {
		throw new Error('TradingView scan returned no quote row');
	}

	const price = num(col(values, 'close'));
	const changePct = num(col(values, 'change'));
	const change = num(col(values, 'change_abs'));
	if (price == null || changePct == null || change == null) {
		throw new Error('TradingView scan missing price fields');
	}

	const ticker = (row?.s?.split(':').pop() || symbol).toUpperCase();

	return {
		symbol: ticker,
		price,
		change,
		changePct,
		currency: str(col(values, 'currency')) ?? 'USD',
		dayHigh: num(col(values, 'high')) ?? undefined,
		dayLow: num(col(values, 'low')) ?? undefined,
		volume: num(col(values, 'volume')) ?? undefined,
		week52High: num(col(values, 'price_52_week_high')) ?? undefined,
		week52Low: num(col(values, 'price_52_week_low')) ?? undefined,
		name: str(col(values, 'description')),
		fetchedAt: new Date().toISOString(),
		updateMode: str(col(values, 'update_mode')),
		source: {
			label: 'TradingView',
			url: `https://www.tradingview.com/symbols/${tvSymbol.replace(':', '-')}/`
		}
	};
}

/** Default poll interval — TV marks the feed as ~15 min delayed. */
export const LIVE_QUOTE_POLL_MS = 60_000;
