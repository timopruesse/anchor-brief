import { fold } from './format';

export interface TopicFacet {
	topic: string;
	count: number;
}

export interface FilterItemsOptions<T> {
	extractTopics?: (item: T) => string[];
	extractSearchFields: (item: T) => string[];
}

export function filterItems<T>(
	items: T[],
	query: string,
	activeTopic: string | null,
	options: FilterItemsOptions<T>
): T[] {
	const q = query.trim();
	const tokens = q ? fold(q).split(/\s+/).filter(Boolean) : [];

	return items.filter((item) => {
		if (activeTopic) {
			const topics = options.extractTopics ? options.extractTopics(item) : [];
			if (!topics.includes(activeTopic)) return false;
		}

		if (tokens.length > 0) {
			const fields = options.extractSearchFields(item);
			const hay = fold(fields.filter(Boolean).join(' '));
			for (const token of tokens) {
				if (!hay.includes(token)) return false;
			}
		}

		return true;
	});
}

export function computeTopicFacets<T>(
	items: T[],
	extractTopics?: (item: T) => string[],
	sortByFrequency = false
): TopicFacet[] {
	if (!extractTopics) return [];
	const map = new Map<string, number>();
	for (const item of items) {
		for (const t of extractTopics(item) ?? []) {
			map.set(t, (map.get(t) ?? 0) + 1);
		}
	}

	const facets = [...map.entries()].map(([topic, count]) => ({ topic, count }));
	if (sortByFrequency) {
		return facets.sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
	}
	return facets.sort((a, b) => a.topic.localeCompare(b.topic));
}

export function formatFilterStatus(
	filteredCount: number,
	totalCount: number,
	hasFilters: boolean,
	customFormatter?: (filteredCount: number, totalCount: number, hasFilters: boolean) => string
): string {
	if (customFormatter) {
		return customFormatter(filteredCount, totalCount, hasFilters);
	}
	if (!hasFilters) {
		return `${totalCount} stor${totalCount === 1 ? 'y' : 'ies'}`;
	}
	return `Showing ${filteredCount} of ${totalCount}`;
}
