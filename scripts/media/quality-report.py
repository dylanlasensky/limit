"""Summarize checksum-bound local media evidence without assigning fitness approval."""

import argparse
import hashlib
import json
import pathlib
import re

parser = argparse.ArgumentParser()
parser.add_argument("--playback", default="media/browser-playback-evidence.json")
parser.add_argument("--finalize-playback", metavar="JSONL")
parser.add_argument("--out", default="docs/exercise-media-quality-report.md")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[2]


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


manifest_path = root / "media/manifest.json"
evidence_path = root / "media/technical-evidence.json"
catalog_path = root / "media-output/catalog.json"
seed_path = root / "worker/seed.sql"
renderer_path = root / "scripts/media/render.py"
manifest = json.loads(manifest_path.read_text())
evidence = json.loads(evidence_path.read_text())
catalog = json.loads(catalog_path.read_text())
technical = [row for row in manifest if row["reviewStatus"] == "technical"]
blocked = [row for row in manifest if row["reviewStatus"] == "blocked"]
by_key = {row["catalogKey"]: row for row in manifest}
assert len(by_key) == len(manifest) == len(catalog) == 365
assert len(technical) + len(blocked) == len(manifest)
assert all(row["reviewer"] is None for row in manifest)
assert {row["catalogKey"] for row in evidence} == {row["catalogKey"] for row in technical}
evidence_by_key = {row["catalogKey"]: row for row in evidence}
assert len(evidence_by_key) == len(evidence)

seed = {}
for line in seed_path.read_text().splitlines():
    if not line.startswith("INSERT INTO exercise "):
        continue
    match = re.search(r"VALUES \('([^']+)',NULL,'[^']+','[^']+','((?:[^']|'')*)'\)", line)
    assert match, "Unparsed exercise seed row"
    seed[match.group(1)] = json.loads(match.group(2).replace("''", "'"))
assert len(seed) == 365
for source in catalog:
    key = source["catalogKey"]
    assert key in seed and key in by_key
    for field in ("name", "instructions"):
        assert source[field] == seed[key][field], (key, field, "catalog/seed")
    row = by_key[key]
    assert row["name"] == source["name"]
    assert row["textFallback"] == source["instructions"]
    assert sha(root / "media-output" / key / "poster.png") == row["posterSha256"]
    if row["reviewStatus"] == "technical":
        assert sha(root / "media-output" / key / "movement.mp4") == row["videoSha256"]
        proof = evidence_by_key[key]
        assert proof["videoSha256"] == row["videoSha256"]
        assert proof["frames"] == 192 and proof["decodedMicros"] == 8_000_000
        assert proof["audio"] is False and proof["codec"] == "h264"
        assert proof["pixelFormat"] == "yuv420p"
    else:
        assert row["source"] is None and row["videoSha256"] is None

playback_path = root / args.playback
if args.finalize_playback:
    observations = [json.loads(line) for line in (root / args.finalize_playback).read_text().splitlines() if line]
    by_observation = {row["catalogKey"]: row for row in observations}
    assert len(observations) == len(by_observation) == len(technical)
    playback_path.write_text(json.dumps([by_observation[row["catalogKey"]] for row in technical], indent=2) + "\n")
if playback_path.suffix == ".jsonl":
    playback = [json.loads(line) for line in playback_path.read_text().splitlines() if line]
else:
    playback = json.loads(playback_path.read_text())
playback_by_key = {}
for observation in playback:
    key = observation["catalogKey"]
    assert key not in playback_by_key, (key, "duplicate browser observation")
    assert key in evidence_by_key
    assert observation["videoSha256"] == by_key[key]["videoSha256"]
    assert observation["duration"] == observation["currentTime"] == 8
    assert observation["frames"] >= 180
    assert (observation["width"], observation["height"]) == (960, 540)
    playback_by_key[key] = observation

missing_playback = sorted(set(evidence_by_key) - set(playback_by_key))
decoded_frames = sum(row["frames"] for row in evidence)
browser_frames = sum(row["frames"] for row in playback_by_key.values())
assert decoded_frames == len(technical) * 192
lines = [
    "# Local exercise media quality report",
    "",
    "This report verifies technical media evidence. It does not record human fitness approval.",
    "",
    f"- Exact catalog entries: **{len(manifest)}**; technical videos: **{len(technical)}**; blocked: **{len(blocked)}**; human fitness approvals: **0**.",
    f"- Poster file hashes verified: **{len(manifest)}/{len(manifest)}**; video file hashes and checksum-bound full-decode records verified: **{len(technical)}/{len(technical)}**, **{decoded_frames:,} frames**.",
    f"- Fresh normal-speed headless Chromium playback: **{len(playback_by_key)}/{len(technical)}** videos reached eight seconds with at least 180 rendered frames and matching current SHA-256; **{browser_frames:,}** browser frames were reported.",
    f"- Catalog, worker seed and manifest names/instructions match on **{len(manifest)}/{len(manifest)}** exact keys.",
    "",
    "## Content identities",
    "",
    f"- Manifest SHA-256: `{sha(manifest_path)}`",
    f"- Technical evidence SHA-256: `{sha(evidence_path)}`",
    f"- Catalog SHA-256: `{sha(catalog_path)}`",
    f"- Worker seed SHA-256: `{sha(seed_path)}`",
    f"- Renderer SHA-256: `{sha(renderer_path)}`",
    f"- Browser playback evidence SHA-256: `{sha(playback_path)}`",
    "",
    "## Coverage and limits",
    "",
    f"- Browser playback keys still needing a fresh replay: **{len(missing_playback)}**." if missing_playback else "- Browser playback keys still needing a fresh replay: **0**.",
    "- The renderer checks all complete cue text layouts at startup. Exact-key catalog, seed and manifest equality does not establish that coaching cues or biomechanics are medically reviewed.",
    "- Visual contact sheets and geometry guards cover accepted variants; visual inspection cannot prove safe technique for every body or setup.",
    "- The blocked inventory keeps explosive pulls, swings, catches, jumps, throws and plyometric push-ups unavailable as videos until their dynamic phases and equipment contacts are modeled and reviewed.",
    "",
    "## Reproduce locally",
    "",
    "Run `node scripts/media/catalog.mjs media-output`, then `python scripts/media/render.py --output media-output --check-cues`, `FFMPEG=<ffmpeg> node scripts/media/probe.mjs --write`, and `FFMPEG=<ffmpeg> node scripts/media/validate.mjs --files`. Replay videos sequentially with `node scripts/media/browser-playback.mjs --start <offset> --count 25` after installing declared Playwright dependencies. Then run `python scripts/media/quality-report.py --finalize-playback media-output/browser-playback.jsonl` to bind the browser ledger to current manifest hashes and regenerate this report.",
    "",
]
(root / args.out).write_text("\n".join(lines))
print(json.dumps({"catalog": len(manifest), "technical": len(technical), "blocked": len(blocked), "decodedFrames": decoded_frames, "browserPlayed": len(playback_by_key), "browserFrames": browser_frames, "browserMissing": len(missing_playback)}))
