# Anchor Brief

Static SvelteKit site for the [Anchor Brief](https://timopruesse.github.io/anchor-brief/) homepage.
Editions are plain JSON under `data/`; GitHub Actions builds and deploys to GitHub Pages.

## Quick start

```sh
npm install
npm run dev
```

Production build (uses `paths.base = /anchor-brief` for GitHub Pages):

```sh
npm run build
npm run preview
```

For a root-relative local preview without the Pages base path:

```sh
BASE_PATH= npm run build && BASE_PATH= npm run preview
```

## Publishing workflow (for Anchor)

1. **Write JSON only** — stop generating `index.html` / `gme.html` / `archive/*.html`.
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

## Coexistence with legacy HTML

Root `index.html`, `gme.html`, and `archive/*.html` remain in the repo until JSON coverage is complete and Anchor has switched over. Once GitHub Pages is set to deploy from Actions (this workflow), those files are no longer served — safe to delete in a follow-up PR.

## Stack

- SvelteKit 2 + Svelte 5 + TypeScript
- `@sveltejs/adapter-static`
- `paths.base = '/anchor-brief'`
