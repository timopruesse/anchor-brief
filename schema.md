# Anchor Brief — main briefing JSON schema

Source of truth for **main desk** editions published under `data/<id>.json`.

The SvelteKit site loads these at build time and prerenders `/`, `/archive` (main story search), and `/brief/[id]` for main ids.

For the GME desk contract, see **[schema-gme.md](./schema-gme.md)** — that format must **not** be folded into the main feed or rendered with main story components.

Anchor should **write JSON only** once this site is live on GitHub Pages.

## File layout

| Path | Purpose |
|------|---------|
| `data/<id>.json` | One main edition per file. Filename **must** match the JSON `id` field. |
| `data/` | Never delete or overwrite unrelated editions; only add/update the edition being published. |

### Naming (main)

| Desk | `id` shape | Example filename |
|------|------------|------------------|
| Main briefing | `YYYY-MM-DD-{morning\|afternoon\|evening}` | `data/2026-09-03-evening.json` |

Do **not** put GME desk files under a main id. GME files use `{parentId}-gme` — see `schema-gme.md`.

## Story shape

```ts
type Weight = 'lead' | 'normal' | 'brief';
type SourceKind = 'article' | 'x' | 'primary';

interface Source {
  kind: SourceKind;
  label: string;
  url: string;          // http(s) only; others ignored at render
  time?: string;        // ISO-8601 timestamp
}

interface StoryImage {
  url: string;
  alt?: string;
  credit?: string;
  creditUrl?: string;
}

interface Story {
  id: string;
  title: string;
  topics: string[];
  weight: Weight;
  facts: string[];
  whyItMatters: string;
  image: StoryImage | null;
  sources: Source[];
}
```

## Main briefing

```ts
interface MainBriefing {
  id: string;                 // e.g. "2026-09-03-evening"
  edition: 'morning' | 'afternoon' | 'evening' | string;
  generatedAt: string;        // ISO-8601 with offset
  timezone?: string;          // default Europe/Berlin
  coverage?: string;          // human coverage window label
  headline: string;
  gmeHref?: string;           // legacy HTML relative link; ignored by SvelteKit
  stories: Story[];
}
```

## Publishing workflow (for Anchor)

1. Write `data/<id>.json` for the main desk (and the paired GME file per `schema-gme.md` when publishing a GME desk).
2. Commit and push to `main`.
3. GitHub Actions builds the SvelteKit static site and deploys to GitHub Pages.
4. Do **not** regenerate `index.html`, `gme.html`, or `archive/*.html`.

## Routes (main)

| Route | Source |
|-------|--------|
| `/` | Latest **main** briefing (by `generatedAt`) |
| `/archive` | Main edition list + cross-day search over **main** stories only |
| `/brief/[id]` | Single main edition (GME ids use the GME renderer — see `schema-gme.md`) |
