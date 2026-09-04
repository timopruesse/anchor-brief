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

export interface StorageAdapter {
	readdir(dir: string): string[];
	readFile(path: string): string;
}

export class NodeFsAdapter implements StorageAdapter {
	readdir(dir: string): string[] {
		return readdirSync(dir);
	}
	readFile(path: string): string {
		return readFileSync(path, 'utf8');
	}
}

export class EditionRepository {
	private cache: Briefing[] | null = null;

	constructor(
		private adapter: StorageAdapter = new NodeFsAdapter(),
		private dataDir: string = join(process.cwd(), 'data')
	) {}

	clearCache() {
		this.cache = null;
	}

	getAll(): Briefing[] {
		if (!this.cache) {
			this.cache = this.loadAll();
		}
		return this.cache;
	}

	private loadAll(): Briefing[] {
		let files: string[];
		try {
			files = this.adapter.readdir(this.dataDir).filter((f) => f.endsWith('.json'));
		} catch {
			return [];
		}

		const briefs: Briefing[] = [];
		for (const file of files) {
			try {
				const raw = this.adapter.readFile(join(this.dataDir, file));
				const data = JSON.parse(raw) as Briefing;
				if (!data?.id || !Array.isArray(data.stories)) continue;
				briefs.push(data);
			} catch {
				continue;
			}
		}

		return briefs.sort(
			(a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
		);
	}

	get(id: string): Briefing | undefined {
		return this.getAll().find((b) => b.id === id);
	}

	getMainBriefings(): MainBriefing[] {
		return this.getAll().filter((b): b is MainBriefing => !isGmeBriefing(b));
	}

	getGmeBriefings(): GmeBriefing[] {
		return this.getAll().filter((b): b is GmeBriefing => isGmeBriefing(b));
	}

	getLatestMain(): MainBriefing | undefined {
		return this.getMainBriefings()[0];
	}

	getLatestGme(): GmeBriefing | undefined {
		return this.getGmeBriefings()[0];
	}

	getEditionSummaries(): EditionSummary[] {
		return this.getAll().map((b) => {
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

	getIndexedStories(): IndexedStory[] {
		/** Main-desk stories only — GME must not enter cross-day main search. */
		const rows: IndexedStory[] = [];
		for (const b of this.getMainBriefings()) {
			for (const story of b.stories) {
				rows.push({
					editionId: b.id,
					edition: b.edition,
					generatedAt: b.generatedAt,
					desk: 'main',
					headline: b.headline,
					story
				});
			}
		}
		return rows;
	}

	getAllIds(): string[] {
		return this.getAll().map((b) => b.id);
	}

	findGmeSibling(mainId: string): string | undefined {
		const gme = this.getGmeBriefings().find(
			(g) => g.parentId === mainId || g.id === `${mainId}-gme`
		);
		return gme?.id;
	}
}

export const defaultRepository = new EditionRepository();

export const getAllBriefings = () => defaultRepository.getAll();
export const getBriefing = (id: string) => defaultRepository.get(id);
export const getMainBriefings = () => defaultRepository.getMainBriefings();
export const getGmeBriefings = () => defaultRepository.getGmeBriefings();
export const getLatestMain = () => defaultRepository.getLatestMain();
export const getLatestGme = () => defaultRepository.getLatestGme();
export const getEditionSummaries = () => defaultRepository.getEditionSummaries();
export const getIndexedStories = () => defaultRepository.getIndexedStories();
export const getAllBriefingIds = () => defaultRepository.getAllIds();
export const findGmeSibling = (mainId: string) => defaultRepository.findGmeSibling(mainId);
