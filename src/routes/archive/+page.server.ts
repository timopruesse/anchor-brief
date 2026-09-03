import { getEditionSummaries, getIndexedStories } from '$lib/server/briefs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const editions = getEditionSummaries();
	return {
		editions: editions.filter((e) => e.desk === 'main'),
		gmeEditions: editions.filter((e) => e.desk === 'gme'),
		indexed: getIndexedStories()
	};
};
