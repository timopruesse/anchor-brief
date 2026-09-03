import { getAllBriefingIds, getBriefing, findGmeSibling } from '$lib/server/briefs';
import { isGmeBriefing } from '$lib/types';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => {
	return getAllBriefingIds().map((id) => ({ id }));
};

export const load: PageServerLoad = async ({ params }) => {
	const briefing = getBriefing(params.id);
	if (!briefing) error(404, `Unknown briefing id: ${params.id}`);

	const gme = isGmeBriefing(briefing);
	return {
		briefing,
		desk: gme ? ('gme' as const) : ('main' as const),
		gmeId: gme ? null : (findGmeSibling(briefing.id) ?? null)
	};
};
