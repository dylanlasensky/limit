# Exercise media

The canonical inventory is `media/manifest.json`: 365 exact exercise keys. The renderer now generates 19 original side-view schematics and 365 posters with free local Pillow/FFmpeg tooling. The other 346 movements are **blocked**, not completed videos: the renderer has no reliable exact setup, grip, support and motion template for them. Each CSV/manifest row records the exact exercise, equipment, movement-family geometry gap and final catalog cue. This is an engineering assessment, not per-exercise render validation or human fitness review. Written instructions remain available. No video has human fitness approval.

The second movement-family batch adds floor, kneeling, hands-elevated bench and feet-elevated bench push-ups. Each has a fixed hand and lower-body support, fixed torso and leg segment lengths, a distinct setup and a controlled descent/return. A pre-release geometry review caught stretching in the first draft; the renderer now moves the shoulder on a fixed-radius path around its foot or knee support and checks segment lengths at every rendered frame. All four corrected exact keys must be fully decoded, played through in Chromium from 0 to 8 seconds, and checked at setup, descent, bottom and return frames before publishing. These are **technical** checks only. Close-grip, weighted, deficit, suspension, pike, handstand and plyometric push-ups remain blocked because this side-view template cannot faithfully show their grip, added load, support geometry, inverted line or ballistic flight/landing.

The [side-by-side setup and bottom frames](evidence/push-up-family.png) show the four exact variants used for visual inspection.

The third batch adds a bodyweight single-leg calf raise and a dumbbell seated calf raise. The former keeps one forefoot and a balance hand fixed while the other foot stays clear of the floor. The latter keeps the seat and forefoot fixed; constant thigh, shin and foot lengths let the loaded knee rise with the heel. [Setup and peak frames](evidence/calf-family.png) were inspected, and both exact MP4s completed eight-second Chromium playback with 192 decoded frames each. All 16 videos have checksum-bound full-decode records (3,072 frames). These checks do not establish instruction safety or human approval.

The fourth batch adds bodyweight split squat, reverse lunge and rear-foot-elevated Bulgarian split squat. The first keeps front/rear foot contacts fixed while the pelvis lowers. The reverse lunge steps the rear foot back through a lifted transfer before descent, then reverses those phases. The Bulgarian variation uses a separate raised bench contact, not the floor setup. Front/rear thigh and shin lengths are checked at every frame. [Setup, step, bottom and return frames](evidence/bodyweight-lunge-family.png) were inspected; the reverse lunge's airborne step was inspected separately. Each MP4 completed eight-second Chromium playback with 192 decoded frames. All 19 videos have checksum-bound full-decode records (3,648 frames). These remain technical checks only.

## Reproduce and inspect

Use Python 3.12+ and Node 24 from the repository root:

```sh
python3 -m venv .venv-media
.venv-media/bin/pip install -r scripts/media/requirements.txt
node scripts/media/catalog.mjs
export FFMPEG="$(.venv-media/bin/python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')"
.venv-media/bin/python scripts/media/render.py --ffmpeg "$FFMPEG"
node scripts/media/probe.mjs --write
node scripts/media/validate.mjs --files
npm run media:review
python3 -m http.server 8090 --directory media-output --bind 127.0.0.1
```

Open `http://127.0.0.1:8090/review.html`. Rendering uses Pillow's bundled font, exact-key allowlists, controlled motion phases, the approved master logo, fixed 960×540 framing, 24 fps, eight seconds, silent H.264/yuv420p and fast-start MP4. `media/technical-evidence.json` records each MP4 checksum and actual probe/full-decode result. `validate.mjs --files` repeats the decode and compares it with that checksum-bound record; the ordinary CI check verifies the recorded checksums and metadata because large binaries are ignored by Git. Encoding may vary across FFmpeg/platform builds; checksums identify the exact output, and versions derive from content hashes. Large binaries stay in ignored `media-output`, never Git. Use only the pinned tools; review tool/font licenses when redistributing the renderer or binaries.

Technical checks establish mapping, bytes and playback only. Inspect the starting, peak and return frames for every supported template before publishing. Never reuse an approximate movement for a different catalog key. Add a new exact-key template only when equipment, support, grip, limb path and comfortable range can be represented faithfully. `scripts/media/blockers.py` records movement and equipment geometry missing from the remaining exact keys, together with the catalog's final instruction; it must be refined as each family is attempted. Complex cable/machine/rotation and ballistic movements remain blocked until their actual supports and phases can be shown. Test every parameterized variation, not only its family.

The Expo workout screen now requests the same validated public media contract for each catalog key. It offers manual load/play/pause for playable assets, shows the caption and review state, and keeps written cues visible through loading or playback errors. This source implementation needs a real development build and physical-device playback check; native export and web playback alone are not device evidence.

## Genuine review

A human uses the review page to mark only videos they actually inspected, recording their name, decision and observations. Export the JSON, then run `node scripts/media/record-review.mjs /path/to/review.json`. This binds the evidence to exact video checksums and saves it under `media/reviews/`. Commit the evidence and updated manifest/checklist before publishing. Rejected videos become drafts and cannot play through the API. Rendering changed bytes invalidates review; do not transfer approval to a changed animation. Automated agents must not fill out human approval.

## R2 publishing

Check **account-wide** R2 usage, Standard storage and existing bucket sizes before every release. No paid Images/Stream, public bucket, external footage or generation API is needed. This manifest is approximately 16.0 MB and 384 referenced objects per environment; runtime requests also pass the existing monthly storage-operation guard. The publish command enforces a 500 MiB asset set and at most 1,000 entries, retries conservatively, and checkpoints successful objects. Content-addressed keys prevent overwrites. Historical versions count toward storage; keep each media bucket under 500 MiB and remove old unused versions only after rollback retention review.

```sh
node scripts/media/publish.mjs preview
# Verify testing playback, then publish the same manifest:
node scripts/media/publish.mjs production
```

The D1 manifest changes only after all referenced R2 objects upload. A failed upload keeps the prior manifest usable. The Worker validates catalog identity and review evidence, supports byte ranges, uses immutable version URLs and exposes no private upload keys. Generated videos are labeled as generated and not human fitness-reviewed. They load on demand with controls, no autoplay or audio; transcript/cues remain visible if playback fails. R2 has no account-wide zero-dollar hard cap: usage from other applications/direct uploads is outside LIMIT's application limits.
