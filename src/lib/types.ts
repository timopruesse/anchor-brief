/** Shared briefing wire types — match schema.md / embedded HTML JSON exactly. */

export type Weight = 'lead' | 'normal' | 'brief';
export type SourceKind = 'article' | 'x' | 'primary';

export interface Source {
	kind: SourceKind | string;
	label: string;
	url: string;
	time?: string;
}

export interface StoryImage {
	url: string;
	alt?: string;
	credit?: string;
	creditUrl?: string;
}

export interface Story {
	id: string;
	title: string;
	topics: string[];
	weight: Weight | string;
	facts: string[];
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
	cohen?: Cohen;
	/** Prefer CommunitySnapshot. Legacy editions may still ship a bare posts array — soft-handled at render. */
	community?: CommunitySnapshot | CommunityPost[];
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
