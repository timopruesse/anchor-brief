# Anchor Brief — briefing JSON schema

Source of truth for editions published under `data/<id>.json`.
The SvelteKit site loads every `data/**/*.json` file at build time and prerenders pages from them.

Anchor (or any producer) should **write JSON only** — stop generating HTML once this site is live on GitHub Pages.

## File layout

| Path | Purpose |
|------|---------|
| `data/<id>.json` | One edition per file. Filename **must** match the JSON `id` field. |
| `data/` | Never delete or overwrite unrelated editions; only add/update the edition being published. |

### Naming

| Desk | `id` shape | Example filename |
|------|------------|------------------|
| Main briefing | `YYYY-MM-DD-{morning\|afternoon\|evening}` | `data/2026-09-03-evening.json` |
| GME desk | `{parentId}-gme` | `data/2026-09-03-evening-gme.json` |

GME editions are detected by any of: `id` ending in `-gme`, presence of `parentId`, or presence of `quote` / `stance`.

## Shared story shape

Used by both main and GME editions.

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
  gmeHref?: string;           // legacy HTML relative link; ignored by SvelteKit (routes to /gme or /brief/{id}-gme)
  stories: Story[];
}
```

## GME desk

Extends the shared story list with market / community fields.

```ts
interface QuoteSource {
  label: string;
  url: string;
}

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  currency: string;
  dayHigh: number;
  dayLow: number;
  prevClose: number;
  volume: number;
  week52High: number;
  week52Low: number;
  asOf: string;
  source: QuoteSource;
}

interface SparkPoint {
  t: string;   // date YYYY-MM-DD
  c: number;   // close
}

interface Cohen {
  handle: string;
  userId: string;
  lastPostAt: string;
  lastPostUrl: string;
  lastPostText: string;
  quiet?: boolean | string;
}

interface CommunityPost {
  title: string;
  subreddit: string;
  permalink: string;
  url: string | null;
  updated: string;
}

interface GmeBriefing {
  id: string;                 // e.g. "2026-09-03-evening-gme"
  parentId: string;           // matching main briefing id
  edition: string;
  generatedAt: string;
  timezone?: string;
  coverage?: string;
  headline: string;
  stance: string;             // e.g. "mixed" | "bullish" | "bearish"
  stanceWhy: string;
  disclaimer?: string;
  quote: Quote;
  sparkline: SparkPoint[];
  cohen?: Cohen;
  community?: CommunityPost[];
  stories: Story[];
}
```

## Publishing workflow (for Anchor)

1. Write `data/<id>.json` (and the paired `data/<id>-gme.json` when publishing a GME desk).
2. Commit and push to `main`.
3. GitHub Actions builds the SvelteKit static site and deploys to GitHub Pages.
4. Do **not** regenerate `index.html`, `gme.html`, or `archive/*.html` — those are legacy and will be removed in a follow-up once JSON coverage is complete.

## Routes produced from JSON

| Route | Source |
|-------|--------|
| `/` | Latest main briefing (by `generatedAt`) |
| `/gme` | Latest GME desk edition |
| `/archive` | Index of all editions + cross-day search/filters |
| `/brief/[id]` | Single edition page |
