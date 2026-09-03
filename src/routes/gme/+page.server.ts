import { getLatestGme } from '$lib/server/briefs';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const briefing = getLatestGme();
	if (!briefing) {
		error(404, 'No GME desk JSON found in data/.');
	}
	return { briefing };
};
