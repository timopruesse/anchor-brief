# Anchor Brief — GME desk JSON schema

**Separate contract** from the main briefing (`schema.md`). GME desk editions must not be folded into the main feed or rendered with main story components — that would misrepresent market/community content as the daily brief.

The SvelteKit site renders these only on `/gme` and `/brief/<id>-gme` via the GME desk UI (quote, sparkline, stance, community, Cohen).

## File layout

| Path | Purpose |
|------|---------|
| `data/<parentId>-gme.json` | One GME desk edition per file. Filename **must** match `id`. |

### Naming

| Desk | `id` shape | Example |
|------|------------|---------|
| GME desk | `{parentId}-gme` | `data/2026-09-03-evening-gme.json` |

Detection: `id` ends with `-gme`, and/or fields `parentId`, `quote`, `stance` are present.

## Shared story bullets

GME editions may include a short `stories[]` list (same story shape as main — title, facts, weight, sources). Those bullets are rendered **inside the GME desk page**, not mixed into the homepage or main cross-day search.

```ts
// Story / Source / StoryImage — same as schema.md
```

## GME desk document

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
  stories: Story[];           // desk bullets only — not main-feed stories
}
```

## Routes (GME)

| Route | Source |
|-------|--------|
| `/gme` | Latest GME desk edition (by `generatedAt`) |
| `/brief/[id]` | When `id` is a GME edition, renders the GME desk UI |

Archive lists may link to GME siblings; cross-day **story** search on `/archive` indexes **main** editions only.
