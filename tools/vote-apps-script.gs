/**
 * Anchor Brief — public vote sink (Google Apps Script).
 *
 * Paste this into a new Apps Script project, set Script Property GITHUB_TOKEN,
 * then Deploy → Web app (Execute as: Me, Who has access: Anyone).
 * Copy the web app URL into the site build env as PUBLIC_VOTE_URL.
 *
 * Updating an existing deployment: after pasting a new Code.gs, use
 * Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.
 * Keep the same /exec URL (do not create a fresh deployment unless rotating).
 *
 * See docs/votes.md for full setup.
 *
 * Primary client path (anchor-brief site): GET /exec?briefId&itemId&vote&ts
 * with mode: 'no-cors'. Query params survive the Apps Script /exec 302 that
 * often turns follow-up POSTs into GETs and drops the body.
 *
 * Legacy: doPost still accepts a text/plain JSON body for older clients.
 * Proxies to GitHub repository_dispatch (event_type: brief-vote).
 * Never embeds the token in source — GITHUB_TOKEN is a Script Property.
 */

var GITHUB_OWNER = 'timopruesse';
var GITHUB_REPO = 'anchor-brief';
var DISPATCH_EVENT = 'brief-vote';

/**
 * CORS preflight. Apps Script ContentService responses typically get
 * Access-Control-Allow-Origin from Google; this handles OPTIONS explicitly.
 */
function doOptions() {
  return jsonResponse_({ ok: true }, 204);
}

/**
 * Accept a vote GET (query params) or serve the health-check JSON.
 *
 * Vote path: ?briefId=…&itemId=…&vote=1|-1&ts=…
 * Health check: GET with no briefId/itemId → { ok: true, service: 'anchor-brief-vote' }
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var hasVote =
      (params.briefId != null && params.briefId !== '') ||
      (params.itemId != null && params.itemId !== '');

    if (!hasVote) {
      return jsonResponse_({ ok: true, service: 'anchor-brief-vote' }, 200);
    }

    var body = {
      briefId: params.briefId != null ? String(params.briefId) : '',
      itemId: params.itemId != null ? String(params.itemId) : '',
      vote: Number(params.vote),
      ts: Number(params.ts)
    };

    return dispatchVote_(body);
  } catch (ex) {
    return jsonResponse_({ ok: false, error: String(ex && ex.message ? ex.message : ex) }, 500);
  }
}

/**
 * Accept a vote POST (legacy text/plain JSON body) and fire repository_dispatch.
 */
function doPost(e) {
  try {
    var body = parseBody_(e);
    return dispatchVote_(body);
  } catch (ex) {
    return jsonResponse_({ ok: false, error: String(ex && ex.message ? ex.message : ex) }, 500);
  }
}

/**
 * Validate and fire GitHub repository_dispatch (event_type: brief-vote).
 * Shared by doGet (query params) and doPost (JSON body).
 */
function dispatchVote_(body) {
  var err = validateVote_(body);
  if (err) {
    return jsonResponse_({ ok: false, error: err }, 400);
  }

  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    return jsonResponse_({ ok: false, error: 'GITHUB_TOKEN script property not set' }, 500);
  }

  var payload = {
    event_type: DISPATCH_EVENT,
    client_payload: {
      briefId: String(body.briefId),
      itemId: String(body.itemId),
      vote: Number(body.vote),
      ts: Number(body.ts)
    }
  };

  var url =
    'https://api.github.com/repos/' +
    GITHUB_OWNER +
    '/' +
    GITHUB_REPO +
    '/dispatches';

  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'anchor-brief-vote-apps-script'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = resp.getResponseCode();
  // GitHub returns 204 No Content on successful dispatch.
  if (code === 204 || code === 200) {
    return jsonResponse_({ ok: true }, 200);
  }

  return jsonResponse_(
    {
      ok: false,
      error: 'github_dispatch_failed',
      status: code,
      body: safeTruncate_(resp.getContentText(), 500)
    },
    502
  );
}

function parseBody_(e) {
  if (!e || e.postData == null || e.postData.contents == null) {
    throw new Error('empty body');
  }
  var raw = e.postData.contents;
  // Legacy clients send text/plain; still parse as JSON.
  return JSON.parse(raw);
}

function validateVote_(body) {
  if (!body || typeof body !== 'object') return 'body must be a JSON object';
  if (!body.briefId || typeof body.briefId !== 'string') return 'briefId required (string)';
  if (!body.itemId || typeof body.itemId !== 'string') return 'itemId required (string)';
  var vote = Number(body.vote);
  if (vote !== 1 && vote !== -1) return 'vote must be 1 or -1';
  if (typeof body.ts !== 'number' || !isFinite(body.ts)) return 'ts must be a number';
  return null;
}

/**
 * Apps Script cannot set arbitrary HTTP status on ContentService in all
 * deployment modes; clients should key off the JSON `ok` field. Soft-fail
 * on the static site remains correct either way.
 */
function jsonResponse_(obj, _status) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function safeTruncate_(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}
