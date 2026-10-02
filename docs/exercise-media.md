# Exercise media

The canonical inventory is `media/manifest.json`: 365 exact exercise keys. This release generates ten original side-view schematics and 365 posters with free local Pillow/FFmpeg tooling. The other 355 movements are **blocked**, not completed videos: the renderer has no reliable exact setup, grip, support and motion template for them. Each CSV/manifest row records the specific exercise and equipment. Written instructions remain available. No video has human fitness approval.

## Reproduce and inspect

Use Python 3.12+ and Node 24 from the repository root:

```sh
python3 -m venv .venv-media
.venv-media/bin/pip install -r scripts/media/requirements.txt
node scripts/media/catalog.mjs
.venv-media/bin/python scripts/media/render.py --ffmpeg "$(.venv-media/bin/python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')"
node scripts/media/validate.mjs --files
npm run media:review
python3 -m http.server 8090 --directory media-output --bind 127.0.0.1
```

Open `http://127.0.0.1:8090/review.html`. Rendering uses Pillow's bundled font, exact-key allowlists, controlled motion phases, the approved master logo, fixed 960×540 framing, 24 fps, eight seconds, silent H.264/yuv420p and fast-start MP4. All generated videos are fully decoded after encoding. Encoding may vary across FFmpeg/platform builds; checksums identify the exact output, and versions derive from content hashes. Large binaries stay in ignored `media-output`, never Git. Use only the pinned tools; review tool/font licenses when redistributing the renderer or binaries.

Technical checks establish mapping, bytes and playback only. Inspect the starting, peak and return frames for every supported template before publishing. Never reuse an approximate movement for a different catalog key. Add a new exact-key template only when equipment, support, grip, limb path and comfortable range can be represented faithfully. Complex cable/machine/rotation, unilateral balance and ballistic movements remain blocked until that is possible. Test every parameterized variation, not only its family.

The Expo workout screen now requests the same validated public media contract for each catalog key. It offers manual load/play/pause for playable assets, shows the caption and review state, and keeps written cues visible through loading or playback errors. This source implementation needs a real development build and physical-device playback check; native export and web playback alone are not device evidence.

## Genuine review

A human uses the review page to mark only videos they actually inspected, recording their name, decision and observations. Export the JSON, then run `node scripts/media/record-review.mjs /path/to/review.json`. This binds the evidence to exact video checksums and saves it under `media/reviews/`. Commit the evidence and updated manifest/checklist before publishing. Rejected videos become drafts and cannot play through the API. Rendering changed bytes invalidates review; do not transfer approval to a changed animation. Automated agents must not fill out human approval.

## R2 publishing

Check **account-wide** R2 usage, Standard storage and existing bucket sizes before every release. No paid Images/Stream, public bucket, external footage or generation API is needed. Each release is approximately 15 MB and 375 objects per environment; runtime requests also pass the existing monthly storage-operation guard. The publish command enforces a 500 MiB asset set and at most 1,000 entries, retries conservatively, and checkpoints successful objects. Content-addressed keys prevent overwrites. Historical versions count toward storage; keep each media bucket under 500 MiB and remove old unused versions only after rollback retention review.

```sh
node scripts/media/publish.mjs preview
# Verify testing playback, then publish the same manifest:
node scripts/media/publish.mjs production
```

The D1 manifest changes only after all referenced R2 objects upload. A failed upload keeps the prior manifest usable. The Worker validates catalog identity and review evidence, supports byte ranges, uses immutable version URLs and exposes no private upload keys. Generated videos are labeled as generated and not human fitness-reviewed. They load on demand with controls, no autoplay or audio; transcript/cues remain visible if playback fails. R2 has no account-wide zero-dollar hard cap: usage from other applications/direct uploads is outside LIMIT's application limits.
