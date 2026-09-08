import type {
	EarningsComparison,
	EarningsMetric,
	EarningsMix,
	EarningsMixSegment,
	EarningsPeriod,
	GmeEarnings,
	QuoteSource
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function coerceSource(raw: unknown): QuoteSource | null {
	if (!isRecord(raw)) return null;
	const label = typeof raw.label === 'string' ? raw.label.trim() : '';
	const url = typeof raw.url === 'string' ? raw.url.trim() : '';
	if (!label && !url) return null;
	const kind = typeof raw.kind === 'string' ? raw.kind : undefined;
	return kind ? { label: label || 'IR', url, kind } : { label: label || 'IR', url };
}

function coercePeriod(raw: unknown): EarningsPeriod | null {
	if (!isRecord(raw)) return null;
	const id = typeof raw.id === 'string' ? raw.id.trim() : '';
	const label = typeof raw.label === 'string' ? raw.label.trim() : '';
	if (!id || !label) return null;
	const end = typeof raw.end === 'string' ? raw.end : undefined;
	return end ? { id, label, end } : { id, label };
}

function coerceMetric(raw: unknown): EarningsMetric | null {
	if (!isRecord(raw)) return null;
	const id = typeof raw.id === 'string' ? raw.id.trim() : '';
	const label = typeof raw.label === 'string' ? raw.label.trim() : '';
	const unit = typeof raw.unit === 'string' ? raw.unit.trim() : '';
	if (!id || !label || !unit || !isRecord(raw.values)) return null;

	const values: Record<string, number> = {};
	for (const [key, val] of Object.entries(raw.values)) {
		const n = asFiniteNumber(val);
		if (n != null) values[key] = n;
	}
	if (!Object.keys(values).length) return null;

	const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined;
	return note ? { id, label, unit, values, note } : { id, label, unit, values };
}

function coerceComparison(raw: unknown): EarningsComparison | null {
	if (!isRecord(raw)) return null;
	const label = typeof raw.label === 'string' ? raw.label.trim() : '';
	const periods = Array.isArray(raw.periods)
		? raw.periods.map(coercePeriod).filter((p): p is EarningsPeriod => Boolean(p))
		: [];
	const metrics = Array.isArray(raw.metrics)
		? raw.metrics.map(coerceMetric).filter((m): m is EarningsMetric => Boolean(m))
		: [];
	if (!label || periods.length < 1 || metrics.length < 1) return null;

	const sources = Array.isArray(raw.sources)
		? raw.sources.map(coerceSource).filter((s): s is QuoteSource => Boolean(s))
		: undefined;
	const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined;

	const out: EarningsComparison = { label, periods, metrics };
	if (sources?.length) out.sources = sources;
	if (note) out.note = note;
	return out;
}

function coerceMixSegment(raw: unknown): EarningsMixSegment | null {
	if (!isRecord(raw)) return null;
	const id = typeof raw.id === 'string' ? raw.id.trim() : '';
	const label = typeof raw.label === 'string' ? raw.label.trim() : '';
	const value = asFiniteNumber(raw.value);
	if (!id || !label || value == null) return null;
	return { id, label, value };
}

function coerceMix(raw: unknown): EarningsMix | null {
	if (!isRecord(raw)) return null;
	const label = typeof raw.label === 'string' ? raw.label.trim() : '';
	const unit = typeof raw.unit === 'string' ? raw.unit.trim() : 'pct';
	const segments = Array.isArray(raw.segments)
		? raw.segments.map(coerceMixSegment).filter((s): s is EarningsMixSegment => Boolean(s))
		: [];
	if (!label || !segments.length) return null;
	const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined;
	return note ? { label, unit, segments, note } : { label, unit, segments };
}

/**
 * Soft-normalize optional `earnings` from GME JSON.
 * Returns null when missing or when there is nothing useful to chart.
 */
export function normalizeEarnings(raw: unknown): GmeEarnings | null {
	if (!isRecord(raw)) return null;

	const source = coerceSource(raw.source);
	const comparisonsRaw = isRecord(raw.comparisons) ? raw.comparisons : null;
	const yoy = comparisonsRaw ? coerceComparison(comparisonsRaw.yoy) : null;
	const qoq = comparisonsRaw ? coerceComparison(comparisonsRaw.qoq) : null;
	const mix = coerceMix(raw.mix);
	const asOf = typeof raw.asOf === 'string' ? raw.asOf.trim() : '';

	if (!source || (!yoy && !qoq && !mix)) return null;

	const comparisons: GmeEarnings['comparisons'] = {};
	if (yoy) comparisons.yoy = yoy;
	if (qoq) comparisons.qoq = qoq;

	const outlook = isRecord(raw.outlook) ? raw.outlook : undefined;

	const out: GmeEarnings = {
		asOf,
		source,
		comparisons
	};
	if (mix) out.mix = mix;
	if (outlook) out.outlook = outlook;
	return out;
}

/** Format an earnings metric value for display (USD_M / USD_B / pct / fallback). */
export function formatEarningsValue(value: number, unit: string): string {
	const u = unit.trim().toUpperCase();
	if (u === 'USD_M' || u === 'USDM') {
		return `$${trimTrailingZero(value)}M`;
	}
	if (u === 'USD_B' || u === 'USDB') {
		return `$${trimTrailingZero(value)}B`;
	}
	if (u === 'PCT' || u === 'PERCENT' || u === '%') {
		return `${trimTrailingZero(value)}%`;
	}
	return trimTrailingZero(value);
}

function trimTrailingZero(n: number): string {
	if (!Number.isFinite(n)) return '—';
	// IR figures are usually one decimal; strip trailing .0 for whole numbers.
	return n.toFixed(1).replace(/\.0$/, '');
}

export interface OutlookChip {
	label: string;
	detail: string;
}

/**
 * Quiet chip for known outlook shapes (adj EBITDA guidance). Soft-fails otherwise.
 */
export function formatOutlookChip(outlook: Record<string, unknown> | undefined): OutlookChip | null {
	if (!outlook) return null;
	const raw = outlook.adjEbitdaFy2026;
	if (!isRecord(raw)) return null;
	const value = asFiniteNumber(raw.value);
	const unit = typeof raw.unit === 'string' ? raw.unit : 'USD_M';
	if (value == null) return null;
	const op = typeof raw.op === 'string' ? raw.op.trim() : '';
	const prior = asFiniteNumber(raw.prior);
	const formatted = formatEarningsValue(value, unit);
	const detail =
		prior != null
			? `${op ? `${op} ` : ''}${formatted} · prior ${formatEarningsValue(prior, unit)}`
			: `${op ? `${op} ` : ''}${formatted}`;
	return { label: 'FY26 adj. EBITDA', detail };
}

export type ComparisonMode = 'yoy' | 'qoq';

/** Prefer YoY when both exist; otherwise whichever is present. */
export function defaultComparisonMode(earnings: GmeEarnings): ComparisonMode | null {
	if (earnings.comparisons.yoy) return 'yoy';
	if (earnings.comparisons.qoq) return 'qoq';
	return null;
}
