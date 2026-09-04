export const THEME_KEY = 'anchor-brief:theme';

export type Theme = 'dark' | 'light';

export function readStoredTheme(): Theme | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const stored = localStorage.getItem(THEME_KEY);
		if (stored === 'dark' || stored === 'light') return stored;
	} catch {
		/* private mode */
	}
	return null;
}

export function preferLight(): boolean {
	if (typeof window === 'undefined') return false;
	return Boolean(window.matchMedia?.('(prefers-color-scheme: light)').matches);
}

export class ThemeController {
	current = $state<Theme>('dark');
	isLight = $derived(this.current === 'light');

	init(): Theme {
		if (typeof document === 'undefined') return 'dark';
		const attr = document.documentElement.getAttribute('data-theme') as Theme | null;
		const stored = readStoredTheme();
		const t = attr ?? stored ?? (preferLight() ? 'light' : 'dark');
		this.current = t;
		this.apply(t, false);

		if (!stored && typeof window !== 'undefined' && window.matchMedia) {
			const mql = window.matchMedia('(prefers-color-scheme: light)');
			mql.addEventListener('change', (e) => {
				if (!readStoredTheme()) {
					const next = e.matches ? 'light' : 'dark';
					this.apply(next, false);
				}
			});
		}

		return t;
	}

	apply(theme: Theme, persist = false) {
		this.current = theme;
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', theme);
		}
		if (persist && typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(THEME_KEY, theme);
			} catch {
				/* ignore */
			}
		}
	}

	toggle() {
		const next = this.current === 'light' ? 'dark' : 'light';
		this.apply(next, true);
	}
}

export const theme = new ThemeController();
