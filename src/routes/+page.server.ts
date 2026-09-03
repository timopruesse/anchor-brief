import { getLatestMain, findGmeSibling } from '$lib/server/briefs';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const briefing = getLatestMain();
	if (!briefing) {
		error(404, 'No main briefing JSON found in data/. Add data/<id>.json to publish.');
	}
	return {
		briefing,
		gmeId: findGmeSibling(briefing.id) ?? null
	};
};
