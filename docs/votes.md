# Story votes — write path (no Cloudflare)

The static site (GitHub Pages) may `POST` story votes when `PUBLIC_VOTE_URL` is set at **build** time. The browser must never hold a GitHub token. This repo uses a small **Google Apps Script** web app as a public HTTPS sink that dispatches into GitHub Actions, which appends to `data/votes.jsonl`.

```
Browser  →  Apps Script (PUBLIC_VOTE_URL)  →  repository_dispatch brief-vote  →  record-vote.yml  →  data/votes.jsonl
```

## Payload contract

```json
{ "briefId": "2026-09-22-evening", "itemId": "some-story-id", "vote": 1, "ts": 1727000000000 }
```

- `vote` is `1` (up) or `-1` (down)
- `ts` is a client timestamp (number)
- The recorder may add `receivedAt` (ISO-8601 UTC) when appending

## 1. Create the Apps Script project

1. Open [script.google.com](https://script.google.com/) → **New project**.
2. Replace the default `Code.gs` with the contents of [`tools/vote-apps-script.gs`](../tools/vote-apps-script.gs).
3. Save the project (name it e.g. `anchor-brief-votes`).

## 2. Set `GITHUB_TOKEN` (Script Property — not in source)

1. Create a GitHub token that can trigger `repository_dispatch` on `timopruesse/anchor-brief`:
   - **Fine-grained PAT:** Contents (read) + Actions (or Metadata + ability to create workflow dispatches — GitHub documents “Actions: Read and write” / repository contents as needed for dispatches). Classic PAT with `repo` scope also works.
   - Prefer a fine-grained token limited to this repository.
2. In the Apps Script editor: **Project Settings** (gear) → **Script Properties** → **Add script property**:
   - Property: `GITHUB_TOKEN`
   - Value: the PAT
3. Never paste the token into `Code.gs` or commit it.

## 3. Deploy as a web app

1. **Deploy** → **New deployment** → type **Web app**.
2. **Execute as:** Me
3. **Who has access:** Anyone
4. Deploy and copy the **Web app URL** (ends with `/exec`).

### CORS notes

- The static site calls this URL with `POST` + `Content-Type: application/json` (or as the client implements).
- Apps Script `ContentService` JSON responses are generally readable cross-origin; the template also implements `doOptions` for preflight.
- Browsers sometimes follow a Google redirect on first hit — the site **soft-fails** if the request fails, so local `localStorage` votes still stick.

## 4. Point the site at the web app

Set the SvelteKit public env at **build** time (local `.env` and/or GitHub Actions / repository variable used by [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)):

```sh
PUBLIC_VOTE_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

Rebuild/redeploy Pages after changing the variable so the static bundle picks it up.

Leave unset to keep votes local-only (soft-fail).

## 5. What happens on each vote

1. Client `POST`s the JSON payload to `PUBLIC_VOTE_URL`.
2. Apps Script validates and calls  
   `POST /repos/timopruesse/anchor-brief/dispatches` with  
   `{ "event_type": "brief-vote", "client_payload": { … } }`.
3. Workflow [`.github/workflows/record-vote.yml`](../.github/workflows/record-vote.yml) validates again, appends one JSON line to `data/votes.jsonl`, and commits as `github-actions[bot]`.
4. Deploy workflow **ignores** pushes that only touch `data/votes.jsonl`, so vote commits do not rebuild Pages.

Malformed payloads are logged and the recorder exits successfully (no append) to avoid retry storms.

## Summarize votes (briefing gather)

```sh
python3 tools/votes.py --help
python3 tools/votes.py --json
python3 tools/votes.py --since-hours 72 --json
python3 tools/votes.py --remote --json   # fetch latest votes.jsonl from GitHub Contents API
```

Latest vote per `(briefId, itemId)` wins (by `ts`, then file order). Optional join against `data/<briefId>.json` adds topic hints when story ids match.
