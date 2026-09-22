/**
 * Anchor Brief — public vote POST sink (Google Apps Script).
 *
 * Paste this into a new Apps Script project, set Script Property GITHUB_TOKEN,
 * then Deploy → Web app (Execute as: Me, Who has access: Anyone).
 * Copy the web app URL into the site build env as PUBLIC_VOTE_URL.
 *
 * See docs/votes.md for full setup.
 *
 * Payload: JSON object { "briefId": string, "itemId": string, "vote": 1 | -1, "ts": number }.
 * Anchor Brief client sends that body as text/plain (avoids CORS preflight); parseBody_
 * accepts any content type and JSON.parses e.postData.contents.
 * Proxies to GitHub repository_dispatch (event_type: brief-vote). Never embeds the token in source.
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
 * Accept a vote POST and fire repository_dispatch.
 */
function doPost(e) {
  try {
    var body = parseBody_(e);
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
  } catch (ex) {
    return jsonResponse_({ ok: false, error: String(ex && ex.message ? ex.message : ex) }, 500);
  }
}

/** Optional health check. */
function doGet() {
  return jsonResponse_({ ok: true, service: 'anchor-brief-vote' }, 200);
}

function parseBody_(e) {
  if (!e || e.postData == null || e.postData.contents == null) {
    throw new Error('empty body');
  }
  var raw = e.postData.contents;
  // Client sends text/plain (CORS simple request); still parse as JSON.
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
