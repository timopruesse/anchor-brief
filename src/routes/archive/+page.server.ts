import { getEditionSummaries, getIndexedStories } from '$lib/server/briefs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		editions: getEditionSummaries(),
		indexed: getIndexedStories()
	};
};
