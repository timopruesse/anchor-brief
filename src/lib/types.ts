/** Shared briefing wire types — match schema.md / embedded HTML JSON exactly. */

export type Weight = 'lead' | 'normal' | 'brief';
export type SourceKind = 'article' | 'x' | 'primary';

/** Citation link fields shared by a source and its optional discovery trail. */
export interface SourceLink {
	kind: SourceKind | string;
	label: string;
	url: string;
	time?: string;
}

/**
 * Story citation. Optional `via` is the discovery trail (e.g. X post that
 * linked an outbound article). Soft-fail when missing — UI stays single-chip.
 */
export interface Source extends SourceLink {
	via?: SourceLink;
}

export interface StoryImage {
	url: string;
	alt?: string;
	credit?: string;
	creditUrl?: string;
}

/** Plain string (lead/normal) or object with per-fact source links (roundups). */
export type Fact = string | { text: string; sourceIndexes?: number[] };

export interface FactObject {
	text: string;
	sourceIndexes?: number[];
}

export interface Story {
	id: string;
	title: string;
	topics: string[];
	weight: Weight | string;
	facts: Fact[];
	whyItMatters: string;
	image: StoryImage | null;
	sources: Source[];
}

export interface MainBriefing {
	id: string;
	edition: string;
	generatedAt: string;
	timezone?: string;
	coverage?: string;
	headline: string;
	gmeHref?: string;
	stories: Story[];
}

export interface QuoteSource {
	label: string;
	url: string;
	/** Present on some IR / citation payloads (e.g. earnings.source). */
	kind?: SourceKind | string;
}

export interface Quote {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePct: number;
	currency: string;
	dayHigh: number;
	dayLow: number;
	prevClose: number;
	volume: number;
	week52High: number;
	week52Low: number;
	asOf: string;
	source: QuoteSource;
}

export interface SparkPoint {
	t: string;
	c: number;
}

/** One X account on the GME desk watchlist. */
export interface GmeVoice {
	handle: string;
	userId: string;
	name?: string;
	role?: string;
	lastPostAt: string;
	lastPostUrl: string;
	lastPostText: string;
	quiet?: boolean | string;
}

/** Ryan Cohen mirror for older JSON — prefer `voices` when present. */
export interface Cohen {
	handle: string;
	userId: string;
	lastPostAt: string;
	lastPostUrl: string;
	lastPostText: string;
	quiet?: boolean | string;
}

/** Superstonk / community post classification. */
export type CommunityKind = 'dd' | 'daily' | 'news' | 'junk';

export interface CommunityPost {
	title: string;
	kind: CommunityKind;
	subreddit: string;
	permalink: string;
	/** Outbound article URL only — null for Reddit-native threads. */
	url: string | null;
	updated: string;
}

/** One Berlin calendar day of community volume. */
export interface CommunityDay {
	date: string; // YYYY-MM-DD Berlin
	posts: number;
	dd: number;
	daily: number;
	news: number;
	junk: number;
}

/**
 * Community snapshot on a GME desk edition.
 * Breaking change: was `CommunityPost[]`; now a single object with history for charts.
 */
export interface CommunitySnapshot {
	asOf: string;
	windowHours: number;
	totals: { posts: number; withOutbound: number };
	byKind: Record<CommunityKind, number>;
	/** High-signal first; junk capped. */
	posts: CommunityPost[];
	/** Rolling ~14 days — chart series. */
	history: CommunityDay[];
}

/** Earnings comparison period (YoY / QoQ). */
export interface EarningsPeriod {
	id: string;
	label: string;
	end?: string;
}

/** One metric series keyed by period id. */
export interface EarningsMetric {
	id: string;
	label: string;
	unit: string; // e.g. USD_M | USD_B | pct
	values: Record<string, number>;
	note?: string;
}

export interface EarningsComparison {
	label: string;
	periods: EarningsPeriod[];
	metrics: EarningsMetric[];
	sources?: QuoteSource[];
	note?: string;
}

export interface EarningsMixSegment {
	id: string;
	label: string;
	value: number;
}

export interface EarningsMix {
	label: string;
	unit: string; // typically pct
	segments: EarningsMixSegment[];
	note?: string;
}

/**
 * Optional IR earnings block on a GME desk edition.
 * Soft-absent on older editions — desk must not crash when missing.
 */
export interface GmeEarnings {
	asOf: string;
	/** Primary IR release URL. */
	source: QuoteSource;
	comparisons: {
		yoy?: EarningsComparison;
		qoq?: EarningsComparison;
	};
	mix?: EarningsMix;
	/** Free-form outlook (e.g. adj EBITDA guidance). */
	outlook?: Record<string, unknown>;
}

export interface GmeBriefing {
	id: string;
	parentId: string;
	edition: string;
	generatedAt: string;
	timezone?: string;
	coverage?: string;
	headline: string;
	stance: string;
	stanceWhy: string;
	disclaimer?: string;
	quote: Quote;
	sparkline: SparkPoint[];
	/** Multi-account X watchlist — Anchor fills from X at briefing time. */
	voices?: GmeVoice[];
	/** Ryan Cohen mirror for older JSON / backward compatibility. */
	cohen?: Cohen;
	/** Prefer CommunitySnapshot. Legacy editions may still ship a bare posts array — soft-handled at render. */
	community?: CommunitySnapshot | CommunityPost[];
	/** Optional IR earnings charts — absent on older editions. */
	earnings?: GmeEarnings;
	stories: Story[];
}

export type Briefing = MainBriefing | GmeBriefing;

export interface EditionSummary {
	id: string;
	edition: string;
	generatedAt: string;
	headline: string;
	desk: 'main' | 'gme';
	parentId?: string;
	storyCount: number;
	topics: string[];
}

/** Flat story row for cross-day search. */
export interface IndexedStory {
	editionId: string;
	edition: string;
	generatedAt: string;
	desk: 'main' | 'gme';
	headline: string;
	story: Story;
}

export function isGmeBriefing(b: Briefing): b is GmeBriefing {
	return (
		Boolean((b as GmeBriefing).parentId) ||
		Boolean((b as GmeBriefing).quote) ||
		Boolean((b as GmeBriefing).stance) ||
		b.id.endsWith('-gme')
	);
}
