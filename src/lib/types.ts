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

export interface CommunityPost {
	title: string;
	subreddit: string;
	permalink: string;
	url: string | null;
	updated: string;
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
	community?: CommunityPost[];
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
