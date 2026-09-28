# Cloudflare rebuild

Starting revision: `104aa32f4f431ae284b316172fad9af483ae25db` (2026-09-27 audit).

1. Extract the existing catalog, plan generation, analytics and validation into platform-neutral modules. Add Workers configuration, migrations and tests alongside the working web client.
2. Implement fresh Better Auth accounts, owner-scoped D1 repositories, typed API contracts, private R2 files and serialized workout commands. Test two-account isolation and retry behavior before switching the client.
3. Switch the React client, replace the old deployment pipeline, remove obsolete platform code and run a tracked-source/bundle/network audit.
4. Refine shared visual tokens and all main journeys. Make one exercise the workout focus with media/text guidance, beginner explanations, pause/resume and recovered drafts.
5. Add a per-account Cloudflare coaching agent. Deterministic constraints govern proposals; explicit approval activates plans. Test unsafe output and outages.
6. Create an Expo shell using the same contracts and domain modules, secure sessions and local drafts.
7. Run local and hosted acceptance checks, publish focused PRs, merge passing changes and verify production against main.

## Baseline

- Latest GitHub main and local source inspected; original checkout was behind main.
- 430 unit tests pass; lint and TypeScript pass.
- Formatting fails in 17 pre-existing files.
- Browser baseline: 142 passed, 15 failed, 8 skipped across five viewports (including tablet). Failures are three scenarios using selectOption against redesigned non-native selection controls. Preserve the assertions and update their interactions.
- Dependency install reports 2 moderate and 3 high advisories; investigate and remediate before release.
- Existing brand master: `public/brand/limit-logo.png`.
- No approved exercise video assets found in tracked files. Written catalog cues are available; video coverage must remain honest.

## External configuration

- Cloudflare account access confirmed; account initially has no D1 databases or Workers.
- Registered `limit-dylanlasensky.workers.dev` for deployment.
- R2 was enabled by the owner. Preview/production private and media buckets are provisioned with public access disabled.
- Transactional email credentials are not assumed. Recovery and verification integrations must be complete, with missing configuration visible.

Each release records its checks and remaining acceptance criteria. A partial release is not completion of this plan.
