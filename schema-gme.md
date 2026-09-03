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

type Kind = "dd" | "daily" | "news" | "junk";

interface CommunityPost {
  title: string;
  kind: Kind;
  subreddit: string;          // Superstonk
  permalink: string;          // reddit thread
  url: string | null;         // outbound article only
  updated: string;            // ISO
}

interface CommunityDay {
  date: string;               // YYYY-MM-DD Berlin
  posts: number;
  dd: number;
  daily: number;
  news: number;
  junk: number;
}

/**
 * Community snapshot — breaking change from the former CommunityPost[] array.
 * Publisher (Anchor) owns this shape; the site soft-handles missing/partial/legacy array forms.
 */
interface CommunitySnapshot {
  asOf: string;
  windowHours: number;
  totals: { posts: number; withOutbound: number };
  byKind: Record<Kind, number>;
  posts: CommunityPost[];     // high-signal first; junk capped
  history: CommunityDay[];    // rolling ~14 days — chart series
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
  community?: CommunitySnapshot;
  stories: Story[];           // desk bullets only — not main-feed stories
}
```

## Community notes

- `history` is the series for the Superstonk volume chart (stacked by kind over ~14 Berlin days).
- `posts` is a curated list for the desk UI — high-signal first, junk capped — not necessarily every counted post.
- Older editions may still ship `community` as a bare `CommunityPost[]` (without `kind`). The site normalizes that to a posts-only view and skips the chart when `history` is absent.

## Routes (GME)

| Route | Source |
|-------|--------|
| `/gme` | Latest GME desk edition (by `generatedAt`) |
| `/brief/[id]` | When `id` is a GME edition, renders the GME desk UI |

Archive lists may link to GME siblings; cross-day **story** search on `/archive` indexes **main** editions only.
