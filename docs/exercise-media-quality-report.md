# Local exercise media quality report

This report verifies technical media evidence. It does not record human fitness approval.

- Exact catalog entries: **365**; technical videos: **326**; blocked: **39**; human fitness approvals: **0**.
- Poster file hashes verified: **365/365**; video file hashes and checksum-bound full-decode records verified: **326/326**, **62,592 frames**.
- Fresh normal-speed headless Chromium playback: **326/326** videos reached eight seconds with at least 180 rendered frames and matching current SHA-256; **62,592** browser frames were reported.
- Catalog, worker seed and manifest names/instructions match on **365/365** exact keys.

## Content identities

- Manifest SHA-256: `7179d8905a8b6534c569a6e48f7d01e7ba085c5e6e2ae2dce5be49be5bb335f5`
- Technical evidence SHA-256: `2352516c6037649cdde30705af02d833b137c05e1d948adcf21c8a74c5f9550a`
- Catalog SHA-256: `841da704aa74b469fa2105f415456c63587eb2de840230b831236edd7799b0b0`
- Worker seed SHA-256: `d47d5ded2f35e1c3680224e20a038853bfa34939f186b7ec873a492795488824`
- Renderer SHA-256: `d8847dad66ee64badda12dfeb952d221477ae50720ea14c3e5f625c8d77fe34b`
- Browser playback evidence SHA-256: `2a7c66ab5265cdaa60f89bcc3b8d458cac3956dcb0eb454b33169e19ec160747`

## Coverage and limits

- Browser playback keys still needing a fresh replay: **0**.
- The renderer checks all complete cue text layouts at startup. Exact-key catalog, seed and manifest equality does not establish that coaching cues or biomechanics are medically reviewed.
- Visual contact sheets and geometry guards cover accepted variants; visual inspection cannot prove safe technique for every body or setup.
- The blocked inventory keeps explosive pulls, swings, catches, jumps, throws and plyometric push-ups unavailable as videos until their dynamic phases and equipment contacts are modeled and reviewed.

## Reproduce locally

Run `node scripts/media/catalog.mjs media-output`, then `python scripts/media/render.py --output media-output --check-cues`, `FFMPEG=<ffmpeg> node scripts/media/probe.mjs --write`, and `FFMPEG=<ffmpeg> node scripts/media/validate.mjs --files`. Replay videos sequentially with `node scripts/media/browser-playback.mjs --start <offset> --count 25` after installing declared Playwright dependencies. Then run `python scripts/media/quality-report.py --finalize-playback media-output/browser-playback.jsonl` to bind the browser ledger to current manifest hashes and regenerate this report.
