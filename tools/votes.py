#!/usr/bin/env python3
"""Summarize Anchor Brief story votes from data/votes.jsonl.

Latest vote per (briefId, itemId) wins (by ts, then file order).
Optional --remote fetches the file from the GitHub Contents API.

Usage:
  python3 tools/votes.py [--remote] [--since-hours 72] [--json]
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_VOTES_PATH = REPO_ROOT / "data" / "votes.jsonl"
GITHUB_CONTENTS_URL = (
    "https://api.github.com/repos/timopruesse/anchor-brief/contents/data/votes.jsonl"
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Summarize story votes from data/votes.jsonl for the briefing gather step."
    )
    p.add_argument(
        "--remote",
        action="store_true",
        help="Fetch latest data/votes.jsonl from GitHub Contents API instead of the local file.",
    )
    p.add_argument(
        "--since-hours",
        type=float,
        default=None,
        metavar="H",
        help="Only consider votes with ts within the last H hours (ms or s timestamps).",
    )
    p.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON summary to stdout.",
    )
    p.add_argument(
        "--path",
        type=Path,
        default=DEFAULT_VOTES_PATH,
        help=f"Local votes.jsonl path (default: {DEFAULT_VOTES_PATH})",
    )
    return p.parse_args(argv)


def fetch_remote_votes() -> str:
    req = urllib.request.Request(
        GITHUB_CONTENTS_URL,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "anchor-brief-votes-py",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return ""
        raise SystemExit(f"GitHub Contents API error: HTTP {e.code}") from e
    except urllib.error.URLError as e:
        raise SystemExit(f"GitHub Contents API request failed: {e}") from e

    encoding = data.get("encoding")
    content = data.get("content") or ""
    if encoding == "base64":
        return base64.b64decode(content).decode("utf-8")
    if isinstance(content, str):
        return content
    return ""


def load_votes_text(path: Path, remote: bool) -> str:
    if remote:
        return fetch_remote_votes()
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def normalize_ts(ts: Any) -> float | None:
    """Return timestamp in milliseconds for comparison, or None if invalid."""
    if isinstance(ts, bool) or not isinstance(ts, (int, float)):
        return None
    if not (ts == ts):  # NaN
        return None
    # Heuristic: values before year ~2001 in ms are likely seconds.
    if ts < 1e12:
        return float(ts) * 1000.0
    return float(ts)


def parse_jsonl(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as e:
            print(f"warning: skip line {line_no}: {e}", file=sys.stderr)
            continue
        if not isinstance(obj, dict):
            print(f"warning: skip line {line_no}: not an object", file=sys.stderr)
            continue
        rows.append(obj)
    return rows


def filter_since(rows: list[dict[str, Any]], since_hours: float | None) -> list[dict[str, Any]]:
    if since_hours is None:
        return rows
    cutoff_ms = time.time() * 1000.0 - since_hours * 3600.0 * 1000.0
    out: list[dict[str, Any]] = []
    for row in rows:
        ts_ms = normalize_ts(row.get("ts"))
        if ts_ms is None:
            continue
        if ts_ms >= cutoff_ms:
            out.append(row)
    return out


def latest_per_item(rows: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    """Latest vote wins by ts, then file order (later lines win when ts ties)."""
    winners: dict[tuple[str, str], dict[str, Any]] = {}
    winner_ts: dict[tuple[str, str], float] = {}
    for idx, row in enumerate(rows):
        brief_id = row.get("briefId")
        item_id = row.get("itemId")
        vote = row.get("vote")
        if not isinstance(brief_id, str) or not brief_id:
            continue
        if not isinstance(item_id, str) or not item_id:
            continue
        if vote not in (1, -1) and vote not in (1.0, -1.0):
            continue
        vote_i = int(vote)
        ts_ms = normalize_ts(row.get("ts"))
        if ts_ms is None:
            ts_ms = float(idx)  # fall back to file order only
        key = (brief_id, item_id)
        prev = winner_ts.get(key)
        # Strictly greater ts wins; equal ts → later file order wins.
        if prev is None or ts_ms > prev or (ts_ms == prev):
            winner_ts[key] = ts_ms
            winners[key] = {
                "briefId": brief_id,
                "itemId": item_id,
                "vote": vote_i,
                "ts": row.get("ts"),
                "receivedAt": row.get("receivedAt"),
            }
    return winners


def load_story_topics(brief_id: str) -> dict[str, list[str]]:
    """Map story id → topics from data/<briefId>.json when present."""
    path = REPO_ROOT / "data" / f"{brief_id}.json"
    if not path.exists():
        return {}
    try:
        brief = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    stories = brief.get("stories") if isinstance(brief, dict) else None
    if not isinstance(stories, list):
        return {}
    out: dict[str, list[str]] = {}
    for story in stories:
        if not isinstance(story, dict):
            continue
        sid = story.get("id")
        topics = story.get("topics")
        if isinstance(sid, str) and isinstance(topics, list):
            out[sid] = [t for t in topics if isinstance(t, str)]
    return out


def story_id_from_item(item_id: str) -> str:
    """Roundup bullets use `{storyId}:fact:…`; otherwise itemId is the story id."""
    marker = ":fact:"
    if marker in item_id:
        return item_id.split(marker, 1)[0]
    return item_id


def build_summary(winners: dict[tuple[str, str], dict[str, Any]]) -> dict[str, Any]:
    by_item: dict[str, int] = defaultdict(int)
    upvoted: list[str] = []
    downvoted: list[str] = []
    by_brief: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"upvoted": [], "downvoted": [], "scores": {}, "topicHints": {}}
    )

    for (brief_id, item_id), row in sorted(winners.items()):
        vote = int(row["vote"])
        by_item[item_id] += vote
        if vote == 1:
            upvoted.append(item_id)
            by_brief[brief_id]["upvoted"].append(item_id)
        else:
            downvoted.append(item_id)
            by_brief[brief_id]["downvoted"].append(item_id)
        by_brief[brief_id]["scores"][item_id] = vote

    # Topic hints: join story ids against brief JSON when available.
    for brief_id, bucket in by_brief.items():
        topics_map = load_story_topics(brief_id)
        if not topics_map:
            continue
        hints: dict[str, list[str]] = {}
        for item_id in list(bucket["upvoted"]) + list(bucket["downvoted"]):
            sid = story_id_from_item(item_id)
            if sid in topics_map and sid not in hints:
                hints[sid] = topics_map[sid]
        bucket["topicHints"] = hints

    return {
        "totalLatestVotes": len(winners),
        "scores": dict(sorted(by_item.items(), key=lambda kv: (-kv[1], kv[0]))),
        "upvoted": sorted(set(upvoted)),
        "downvoted": sorted(set(downvoted)),
        "byBrief": dict(sorted(by_brief.items())),
        "latest": [
            winners[k]
            for k in sorted(winners.keys(), key=lambda k: (k[0], k[1]))
        ],
    }


def print_human(summary: dict[str, Any]) -> None:
    print(f"Latest votes: {summary['totalLatestVotes']}")
    print()
    print("Net score by itemId:")
    scores = summary["scores"]
    if not scores:
        print("  (none)")
    else:
        for item_id, score in scores.items():
            sign = "+" if score > 0 else ""
            print(f"  {sign}{score}\t{item_id}")
    print()
    print(f"Upvoted ({len(summary['upvoted'])}):")
    for item_id in summary["upvoted"]:
        print(f"  + {item_id}")
    if not summary["upvoted"]:
        print("  (none)")
    print()
    print(f"Downvoted ({len(summary['downvoted'])}):")
    for item_id in summary["downvoted"]:
        print(f"  - {item_id}")
    if not summary["downvoted"]:
        print("  (none)")

    for brief_id, bucket in summary["byBrief"].items():
        hints = bucket.get("topicHints") or {}
        if not hints:
            continue
        print()
        print(f"Topic hints ({brief_id}):")
        for sid, topics in sorted(hints.items()):
            print(f"  {sid}: {', '.join(topics)}")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    text = load_votes_text(args.path, args.remote)
    rows = filter_since(parse_jsonl(text), args.since_hours)
    winners = latest_per_item(rows)
    summary = build_summary(winners)
    if args.json:
        json.dump(summary, sys.stdout, indent=2, sort_keys=True)
        sys.stdout.write("\n")
    else:
        print_human(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
