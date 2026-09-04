export interface HighlightPart {
	text: string;
	hit: boolean;
}

/**
 * Split text into matching and non-matching parts based on query tokens.
 * Preserves original casing, punctuation, and character indices.
 * Matches German diacritics and umlauts (e.g. ss <-> ß, ä <-> ae).
 */
export function splitHighlight(raw: string, query: string): HighlightPart[] {
	if (!raw) return [];
	const q = query.trim();
	if (!q) return [{ text: raw, hit: false }];

	const tokens = q.split(/\s+/).filter((t) => t.length > 0);
	if (tokens.length === 0) return [{ text: raw, hit: false }];

	const patterns = tokens.map((token) => {
		let escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		escaped = escaped
			.replace(/ss|ß/gi, '(?:ss|ß)')
			.replace(/ä|ae/gi, '(?:ä|ae)')
			.replace(/ö|oe/gi, '(?:ö|oe)')
			.replace(/ü|ue/gi, '(?:ü|ue)');
		return escaped;
	});

	const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
	const out: HighlightPart[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(raw)) !== null) {
		if (match.index > lastIndex) {
			out.push({ text: raw.slice(lastIndex, match.index), hit: false });
		}
		out.push({ text: match[0], hit: true });
		lastIndex = regex.lastIndex;
		if (match[0].length === 0) regex.lastIndex++;
	}

	if (lastIndex < raw.length) {
		out.push({ text: raw.slice(lastIndex), hit: false });
	}

	return out.length > 0 ? out : [{ text: raw, hit: false }];
}
