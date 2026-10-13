import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_VOTE_URL: {
		public: true,
		static: true,
		schema: (value) => value,
		description: 'Optional public HTTPS endpoint that accepts GET ?briefId&itemId&vote&ts.'
	}
});
