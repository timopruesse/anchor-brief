# Anchor Brief

Static SvelteKit site for the [Anchor Brief](https://timopruesse.github.io/anchor-brief/) homepage.
Editions are plain JSON under `data/`; GitHub Actions builds and deploys to GitHub Pages.

## Quick start

Requires [Bun](https://bun.sh/).

```sh
bun install
bun run dev
```

Production build (uses `paths.base = /anchor-brief` for GitHub Pages):

```sh
bun run build
bun run preview
```

Type-check:

```sh
bun run check
```

For a root-relative local preview without the Pages base path:

```sh
BASE_PATH= bun run build && BASE_PATH= bun run preview
```

## Publishing workflow (for Anchor)

1. **Write JSON only** — the site is built from `data/*.json` via SvelteKit. Do not add hand-rolled HTML pages.
2. Drop each edition under `data/`:
   - Main (`schema.md`): `data/2026-09-03-evening.json`
   - GME (`schema-gme.md`): `data/2026-09-03-evening-gme.json` (`id` ends with `-gme`, include `parentId`)
3. Commit and push to `main`. The [Deploy GitHub Pages](.github/workflows/deploy.yml) workflow rebuilds the site.
4. **Do not** fold GME JSON into the main feed — `/` and archive story search use main editions only; `/gme` uses the GME schema/UI.

Do **not** delete or overwrite unrelated files in `data/` — other editions (and in-flight publishes) live there.

## Routes

| Path | Content |
|------|---------|
| `/` | Latest **main** briefing |
| `/gme` | Latest **GME** desk (separate schema) |
| `/archive` | Main edition list + cross-day search over **main** stories |
| `/brief/[id]` | Single edition (main or GME renderer by id) |

## GME live quote (client-side)

The `/gme` desk always renders the briefing JSON snapshot first. After load, the browser polls TradingView’s public America scanner (`POST /america/scan` with a `text/plain` JSON body) for a more current delayed price. Yahoo Finance is **not** used from the browser — those endpoints lack usable CORS (and often 429).

If the poll is blocked or fails, the snapshot quote stays on screen (soft fail). This is a delayed poll, not a websocket tick feed.

## Story votes

Story cards (and brief-roundup bullets) show quiet thumbs up/down. Votes are optimistic and stored in `localStorage` (one vote per item; click again to clear, or the opposite thumb to switch). When `PUBLIC_VOTE_URL` is set at **build** time, the client also `POST`s JSON `{ briefId, itemId, vote, ts }` (`vote` ∈ `{1, -1}`) as `text/plain` (skips CORS preflight to Apps Script). Soft-fail if unset or the request fails — no client secrets.

**Sink (this repo):** do **not** use a Cloudflare Worker. Deploy the Google Apps Script template in [`tools/vote-apps-script.gs`](./tools/vote-apps-script.gs) as a web app and set:

```sh
# .env / GitHub Actions build env (repository variable)
PUBLIC_VOTE_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

Setup steps, token property, and recorder workflow: **[docs/votes.md](./docs/votes.md)**. Votes append to `data/votes.jsonl` via `repository_dispatch` → [`.github/workflows/record-vote.yml`](./.github/workflows/record-vote.yml). Summarize for gather:

```sh
python3 tools/votes.py --help
python3 tools/votes.py --since-hours 72 --json
```

## Stack

- SvelteKit 2 + Svelte 5 + TypeScript
- Bun (package manager + CI)
- `@sveltejs/adapter-static`
- `paths.base = '/anchor-brief'`
- Dependabot (weekly npm + GitHub Actions updates)
