export const THEME_KEY = 'anchor-brief:theme';

export type Theme = 'dark' | 'light';

export function readStoredTheme(): Theme | null {
	try {
		const stored = localStorage.getItem(THEME_KEY);
		if (stored === 'dark' || stored === 'light') return stored;
	} catch {
		/* private mode */
	}
	return null;
}

export function preferLight(): boolean {
	return Boolean(window.matchMedia?.('(prefers-color-scheme: light)').matches);
}

export function applyTheme(theme: Theme, persist = false) {
	document.documentElement.setAttribute('data-theme', theme);
	if (persist) {
		try {
			localStorage.setItem(THEME_KEY, theme);
		} catch {
			/* ignore */
		}
	}
}

export function bootTheme(): Theme {
	const stored = readStoredTheme();
	const theme = stored ?? (preferLight() ? 'light' : 'dark');
	applyTheme(theme, false);
	return theme;
}
