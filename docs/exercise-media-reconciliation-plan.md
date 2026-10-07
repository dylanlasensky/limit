# Local media reconciliation plan

This records the historical read-only comparison. The later owner approval resolved the scoped media transfer hold. The integrated result is now committed and backed up in [draft PR #72](https://github.com/dylanlasensky/limit/pull/72); fresh CI, hosted acceptance and free-usage checks still gate release.

## Compared revisions

- Common base: `6d24100465218acaf17a3465ba7c09cb28b010cf`.
- Accepted main, testing and production: `ab3b76bf63f3d3afa1fb7237a527372729cf5dc0` (PR 64). The first-party braces fork had shipped through PR 60. Braces is not the current general release blocker; node-forge still blocks signing and OTA.
- Isolated media branch: `codex/media-quadruped-hip-extension`; use its latest clean checkpoint when reconciliation is authorized. It retains 326 technical videos, 39 blocked variants and zero human fitness approvals.

## Local conflict inventory

The media branch changes 166 paths from the common base: 158 under `docs`, three under `media`, three under `scripts`, `packages/domain/exerciseCatalog.js`, and `worker/seed.sql`. The accepted main revision changes 36 paths from the same base, concentrated in mobile UI, release/security tooling, dependencies and worker implementation. The path intersection is **zero**. A read-only `git merge-tree` comparison of these three revisions showed no merge conflict markers. This does not establish that the combined build or release gates pass.

Media catalog and seed changes must remain paired so captions match the app and worker data. Preserve the accepted main's vendor braces fork and lockfile, native history/privacy fixes, release diagnostics and worker changes. Existing worktrees, especially `app` on `codex/native-history`, remain untouched.

## Completed integration steps and remaining release gates

1. Completed: the separate `media-main-integration` worktree integrated accepted main and media at `bbd707d` without changing other worktrees.
2. Completed: catalog, seed, manifest and technical evidence agree for 326 technical videos, 39 blocked variants and zero human approvals.
3. Run cue fit, full-file hash/decode checks, formatting, lint, web and worker type checks, unit and local API tests, browser checks and the production build required by `AGENTS.md`. Recheck the accepted braces fork and release/security gates on the integrated tree.
4. Completed: draft PR #72 backs up the combined diff. Before merge, check fresh CI, current remote state, account-wide Cloudflare usage, immutable media publication and exact-source hosted acceptance. Signing and OTA remain separately blocked by node-forge.

The branch comparison can be reproduced with `git merge-base <media-head> ab3b76bf63f3d3afa1fb7237a527372729cf5dc0`, `git diff --name-only <base> <media-head>`, `git diff --name-only <base> ab3b76bf63f3d3afa1fb7237a527372729cf5dc0`, and `git merge-tree <base> <media-head> ab3b76bf63f3d3afa1fb7237a527372729cf5dc0`. These commands only read local history.
