import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: undefined,
				precompress: false,
				strict: true
			}),
			paths: {
				// GitHub Pages project site: https://timopruesse.github.io/anchor-brief/
				base: (process.env.BASE_PATH ?? '/anchor-brief') as `/${string}` | ''
			},
			prerender: {
				handleMissingId: 'warn',
				handleHttpError: 'warn'
			}
		})
	]
});
