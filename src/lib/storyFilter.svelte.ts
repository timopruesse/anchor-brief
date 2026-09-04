import {
	computeTopicFacets,
	filterItems,
	formatFilterStatus,
	type TopicFacet
} from './search';

export type { TopicFacet };

export interface StoryFilterEngineOptions<T> {
	getItems: () => T[];
	extractTopics?: (item: T) => string[];
	extractSearchFields: (item: T) => string[];
	formatStatusText?: (filteredCount: number, totalCount: number, hasFilters: boolean) => string;
	sortByTopicsFrequency?: boolean;
}

export class StoryFilterEngine<T> {
	query = $state('');
	activeTopic = $state<string | null>(null);

	constructor(private options: StoryFilterEngineOptions<T>) {}

	hasFilters = $derived(Boolean(this.activeTopic || this.query.trim()));

	filtered = $derived.by((): T[] => {
		return filterItems(
			this.options.getItems(),
			this.query,
			this.activeTopic,
			this.options
		);
	});

	topicFacets = $derived.by((): TopicFacet[] => {
		return computeTopicFacets(
			this.options.getItems(),
			this.options.extractTopics,
			this.options.sortByTopicsFrequency
		);
	});

	statusText = $derived.by((): string => {
		return formatFilterStatus(
			this.filtered.length,
			this.options.getItems().length,
			this.hasFilters,
			this.options.formatStatusText
		);
	});

	setTopic(topic: string | null) {
		this.activeTopic = this.activeTopic === topic ? null : topic;
	}

	setQuery(q: string) {
		this.query = q;
	}

	reset() {
		this.query = '';
		this.activeTopic = null;
	}
}
