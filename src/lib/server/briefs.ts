import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	isGmeBriefing,
	type Briefing,
	type EditionSummary,
	type IndexedStory,
	type MainBriefing,
	type GmeBriefing
} from '../types';

const DATA_DIR = join(process.cwd(), 'data');

function loadAll(): Briefing[] {
	let files: string[];
	try {
		files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
	} catch {
		return [];
	}

	const briefs: Briefing[] = [];
	for (const file of files) {
		const raw = readFileSync(join(DATA_DIR, file), 'utf8');
		const data = JSON.parse(raw) as Briefing;
		if (!data?.id || !Array.isArray(data.stories)) continue;
		briefs.push(data);
	}

	return briefs.sort(
		(a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
	);
}

let cache: Briefing[] | null = null;

export function getAllBriefings(): Briefing[] {
	if (!cache) cache = loadAll();
	return cache;
}

export function getBriefing(id: string): Briefing | undefined {
	return getAllBriefings().find((b) => b.id === id);
}

export function getMainBriefings(): MainBriefing[] {
	return getAllBriefings().filter((b): b is MainBriefing => !isGmeBriefing(b));
}

export function getGmeBriefings(): GmeBriefing[] {
	return getAllBriefings().filter((b): b is GmeBriefing => isGmeBriefing(b));
}

export function getLatestMain(): MainBriefing | undefined {
	return getMainBriefings()[0];
}

export function getLatestGme(): GmeBriefing | undefined {
	return getGmeBriefings()[0];
}

export function getEditionSummaries(): EditionSummary[] {
	return getAllBriefings().map((b) => {
		const desk = isGmeBriefing(b) ? 'gme' : 'main';
		const topics = new Set<string>();
		for (const s of b.stories) {
			for (const t of s.topics ?? []) topics.add(t);
		}
		return {
			id: b.id,
			edition: b.edition,
			generatedAt: b.generatedAt,
			headline: b.headline,
			desk,
			parentId: isGmeBriefing(b) ? b.parentId : undefined,
			storyCount: b.stories.length,
			topics: [...topics].sort()
		};
	});
}

export function getIndexedStories(): IndexedStory[] {
	const rows: IndexedStory[] = [];
	for (const b of getAllBriefings()) {
		const desk = isGmeBriefing(b) ? 'gme' : 'main';
		for (const story of b.stories) {
			rows.push({
				editionId: b.id,
				edition: b.edition,
				generatedAt: b.generatedAt,
				desk,
				headline: b.headline,
				story
			});
		}
	}
	return rows;
}

export function getAllBriefingIds(): string[] {
	return getAllBriefings().map((b) => b.id);
}

/** Paired GME id for a main briefing, if present. */
export function findGmeSibling(mainId: string): string | undefined {
	const gme = getGmeBriefings().find((g) => g.parentId === mainId || g.id === `${mainId}-gme`);
	return gme?.id;
}
