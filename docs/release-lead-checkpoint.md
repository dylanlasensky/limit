# Release lead checkpoint — October 12, 2026

The initial October 12 GitHub and live health snapshot confirmed main `bd9306ecb252e6d879d3dfd2ea540980a49eb4bf`, testing Worker `dbdee017-2c1e-4a91-83f6-6bf3d90a1edf`, and production Worker `d44e4c5c-42c1-4418-a9e4-587168a43733`. These are inspected identities, not a new full acceptance result.

The integrated product release is tracked in [PR #89](https://github.com/dylanlasensky/limit/pull/89). Its final release comment is the authority for merged source, exact preview/production versions and hosted acceptance; the earlier baseline below is historical evidence. Recovery corrections and the supported unsigned simulator workflow are included, while real prior-binary upgrade and physical-device acceptance remain separate. Existing worktrees and unrelated uncommitted native-history work are preserved.

## Immediate release work

The previous production media run failed without naming the exercise. The hosted runner now reports each exact catalog key before and after normal-speed playback, wraps initial play/decode errors with media diagnostics, bounds stalled starts, and releases the video resource after each clip. Every full run still requires all checksum, byte-range, duration, dimensions, frame-count, public-page and playback assertions. There are no automatic retries that could conceal a failed run.

Each invocation creates a unique append-only `release-evidence/media-<timestamp>-<UUID>.jsonl`. It records the runner and manifest hashes, source SHA, initial Worker version, per-clip progress, failures and final result. Final health must match the initial source and version. A stopped run has no passed event. Diagnostic replays do not overwrite the earlier deployment evidence. The local harness regression covers valid full playback, HTTP 404, stalled initial playback, wrong expected dimensions, and video cleanup.

The baseline production replay passed at 2026-10-13T01:28:59.210Z: all 326 checksums, all 326 complete browser playbacks, six public pages and unchanged bd9306e/d44e4c5c source/version. The append-only record is `media-2026-10-13T00-39-47.137Z-4a772a0f-c815-4590-992e-d0ac8bee372f.jsonl`, SHA-256 `7ffd5653da6ea463e293ac8a3bda47ca8034f23532eb3a5f9140e66c92ca96f6`. The October 8 failed evidence is preserved. This accepts the prior production baseline, not the newer feature integration. PR #90 and recovery PR #91 subsequently passed exact-head CI and merged; the combined feature release requires its own CI and hosted testing/production gates.

PR #90's first CI run stopped at Expo compatibility before API/browser checks. The five SDK 57 patch updates recommended by Expo are now aligned through `expo install --fix`; a clean install, Expo Doctor 21/21, mobile lint/types, web/Worker types, formatting/lint, 487 unit tests, two native bridge tests, security gate and production build pass locally. The library's initial play/pause check now also has a bounded timeout and media-state diagnostics, with browser regressions for valid, stalled and unexpected-autoplay states. The test server is cleaned up even if Chromium launch fails. Both quality checks on head `2dd13674133fd174ffd83455d4e7d131f14891d0` subsequently passed.

## Security assessment

On October 12 the registry still reports node-forge 1.4.0 and the [GitHub advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched release. Fresh audit found the same four root dependency nodes under this one advisory and zero Worker findings. Keep the existing October 15 expiry and signed/OTA native release restriction. The npm suggestion to downgrade Expo to 44 is not a compatible remedy. No exception was broadened or extended.

## Product comparison and next acceptance criteria

These are observations from official documentation, not installed competitor-app testing:

- [Hevy workout tracking](https://www.hevyapp.com/features/track-workouts/) keeps exercise/set entry and automatic rest timing central. Measure LIMIT's repeat-set entry, previous-value copying and complete-set action together, including the keyboard-open state.
- [Fitbod personalization](https://fitbod.me/faqs/) considers available equipment and desired workout length. Assess the draft equipment/time-budget controls by whether users can understand and undo a session change; do not infer equivalent personalization or recovery accuracy.

For LIMIT, measure first, repeated and interrupted workouts at the same screen sizes before and after changes. Starting today's workout should require at most two deliberate navigation actions when onboarding is complete. Preserve editable weights/reps, visible previous values, accessible completion controls, persistent rest timing, explicit save/offline state, and accurate finish summaries. Add controls only where they remove a demonstrated obstacle.

Review nutrition entry for fast correction and idempotent save; muscle diagrams for readable labels and a text equivalent; imports for preview and preservation of existing plans. Compare matched screenshots, task steps and failure behavior. Do not copy social feeds or add unsupported photo/allergy assurances.

Owner-controlled email sender/key, legal publisher identity, signing and real-device acceptance remain separate from implementation. Existing support contact is already recorded in known limitations. No paid service or account change is authorized.
