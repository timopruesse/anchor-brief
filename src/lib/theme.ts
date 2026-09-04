export {
	THEME_KEY,
	type Theme,
	readStoredTheme,
	preferLight,
	theme
} from './theme.svelte';

import { theme, type Theme } from './theme.svelte';

export function applyTheme(t: Theme, persist = false) {
	theme.apply(t, persist);
}

export function bootTheme(): Theme {
	return theme.init();
}
