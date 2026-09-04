# Anchor Brief — Domain Context & Glossary

This document records the domain model and ubiquitous language for **Anchor Brief**. It acts as the shared vocabulary for architecture seams and module design.

---

## Domain Concepts

### 1. Main Briefing
The flagship executive intelligence briefing (`data/<id>.json`). Published on a cadence (`morning`, `afternoon`, `evening`) with a single lead headline, coverage timeframe, and a list of weighted editorial stories.

### 2. GME Desk
A paired, specialized financial intelligence desk (`data/<parentId>-gme.json`). It captures market context around GameStop ($GME), combining:
- Delayed quote snapshot & client-side delayed live scanner poll.
- Historic daily price sparkline (1M, 3M, 6M, YTD).
- Desk editorial stance (`mixed`, `bullish`, `bearish`) and rationale.
- Superstonk community sentiment distribution (DD, Daily, News, Junk) and rolling 14-day stacked history.
- Curated X voices watchlist.
- Desk-specific bullet stories.

### 3. Story
The atomic editorial reporting unit shared across both desks:
- `id`: Unique slug.
- `title`: Succinct news headline.
- `weight`: Editorial priority (`lead` | `normal` | `brief`).
- `topics`: Categorical tags (e.g. `AI`, `Tech`, `Defense`, `Worth a look`, `From Substack`, `Dev notes`).
- `facts`: Bulleted takeaways (top 3 visible, rest expandable). Plain strings for lead/normal cards; optional `{ text, sourceIndexes }` objects on brief roundups so each bullet can show which source it cites.
- `whyItMatters`: Concise analytical context explaining significance.
- `sources`: Primary or secondary citations (`article`, `x`, `primary`).
- `image`: Optional hero visual with attribution.

### 4. Edition Archive
The chronological record of past main briefings and their paired GME desk siblings, supporting cross-day story retrieval over main editions.

---

## Architectural Seams & Deep Modules

### 1. Story Filter Engine (`src/lib/storyFilter.svelte.ts`)
A deep reactive module managing story filtering, multi-field search matching, character folding (with diacritic-safe highlighting offsets), topic frequency aggregation, and search status announcements.

### 2. Story Presentation (`src/lib/components/StoryCard.svelte`)
A unified presentation module rendering stories across both main and GME desks, adapting its layout for lead broadsheet positions, standard cards, and compact desk bullets.

### 3. Theme Controller (`src/lib/theme.svelte.ts`)
A deep module providing a reactive Svelte 5 rune interface (`current`, `toggle()`) that synchronizes document attributes, OS media queries, and `localStorage`.

### 4. Edition Repository (`src/lib/server/briefs.ts`)
A server-side repository module encapsulating filesystem ingestion, schema validation, chronological sorting, and cross-edition indexing behind a swappable storage adapter.
