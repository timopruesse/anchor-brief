// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
		interface PublicEnv {
			/** Optional public HTTPS endpoint that accepts GET ?briefId&itemId&vote&ts. */
			PUBLIC_VOTE_URL?: string;
		}
	}
}

export {};
