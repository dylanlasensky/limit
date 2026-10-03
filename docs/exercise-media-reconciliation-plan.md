# Local media reconciliation plan

This is a read-only comparison and a plan. The prior media transfer/ref action reported “aborted by user,” so no branch transfer, remote update, merge, deployment or publishing follows from this document.

## Compared revisions

- Common base: `6d24100465218acaf17a3465ba7c09cb28b010cf`.
- Accepted main, testing and production: `ab3b76bf63f3d3afa1fb7237a527372729cf5dc0` (PR 64). The first-party braces fork had shipped through PR 60. Braces is not the current general release blocker; node-forge still blocks signing and OTA.
- Isolated media branch: `codex/media-quadruped-hip-extension`; use its latest clean checkpoint when reconciliation is authorized. It retains 326 technical videos, 39 blocked variants and zero human fitness approvals.

## Local conflict inventory

The media branch changes 161 paths from the common base: 156 under `docs`, two under `media`, one under `scripts`, `packages/domain/exerciseCatalog.js`, and `worker/seed.sql`. The accepted main revision changes 36 paths from the same base, concentrated in mobile UI, release/security tooling, dependencies and worker implementation. The path intersection is **zero**. A read-only `git merge-tree` comparison of these three revisions showed no merge conflict markers. This does not establish that the combined build or release gates pass.

Media catalog and seed changes must remain paired so captions match the app and worker data. Preserve the accepted main's vendor braces fork and lockfile, native history/privacy fixes, release diagnostics and worker changes. Existing worktrees, especially `app` on `codex/native-history`, remain untouched.

## After the media hold is clarified

1. Create a new, separately named local integration worktree from the accepted main revision. Do not reuse a worktree with uncommitted changes.
2. Integrate the isolated media branch in that worktree, resolve any new conflicts there, and verify the catalog, seed, manifest and technical evidence still agree. Keep the 39 dynamic variants blocked and human approval count at zero.
3. Run cue fit, full-file hash/decode checks, formatting, lint, web and worker type checks, unit and local API tests, browser checks and the production build required by `AGENTS.md`. Recheck the accepted braces fork and release/security gates on the integrated tree.
4. Review the combined diff and current remote state before considering a focused draft PR. Do not upload media assets, push, merge or deploy while the transfer hold remains unresolved. Signing and OTA remain separately blocked by node-forge.

The branch comparison can be reproduced with `git merge-base <media-head> ab3b76bf63f3d3afa1fb7237a527372729cf5dc0`, `git diff --name-only <base> <media-head>`, `git diff --name-only <base> ab3b76bf63f3d3afa1fb7237a527372729cf5dc0`, and `git merge-tree <base> <media-head> ab3b76bf63f3d3afa1fb7237a527372729cf5dc0`. These commands only read local history.
