# Cloudflare operations

## Resources

| Environment | Worker | D1 | R2 private / media |
|---|---|---|---|
| Local | limit-local | local SQLite | local emulated buckets |
| Preview | limit-preview | limit-preview | limit-preview-private / limit-preview-media |
| Production | limit | limit-production | limit-production-private / limit-production-media |

Each Worker owns separate AccountCoordinator and LimitCoach SQLite Durable Object namespaces. `wrangler.jsonc` records the actual D1 IDs and binding names. Preview URL: https://limit-preview.limit-dylanlasensky.workers.dev. Production target: https://limit.limit-dylanlasensky.workers.dev. A configured URL alone is not deployment evidence; see release validation notes.

## Configuration

| Name | Location | Meaning |
|---|---|---|
| BETTER_AUTH_SECRET | Worker secret / local .dev.vars | Random 32+ character session-signing secret; unique per environment |
| RESEND_API_KEY | Worker secret | Optional transactional email key |
| EMAIL_FROM | Wrangler variable | Verified sender address |
| EMAIL_ENABLED | Wrangler variable | Enable verification on signup and password-reset delivery after sender/key setup |
| APP_ORIGIN | Wrangler variable | Exact web origin, also Better Auth base URL |
| SOURCE_REVISION | Deployment variable | Exact Git SHA stamped by the promotion helper |
| CF_VERSION_METADATA | Worker version binding | Cloudflare version ID/tag for health evidence |
| ENVIRONMENT | Wrangler variable | local, preview or production |
| AI_ENABLED | Wrangler variable | Enable Workers AI classification/import; false uses deterministic coach fallback |
| VITE_LIMIT_PRIVACY_URL / TERMS_URL / SUPPORT_URL | Build variables | Optional approved public policy/support destinations |
| EXPO_PUBLIC_API_URL | Expo build variable | Public HTTPS API origin, never a credential |

Configure secrets with `npx wrangler secret put BETTER_AUTH_SECRET --env preview` and the corresponding production command. Set the Resend key similarly. Rotate secrets deliberately: existing sessions may be invalidated. Google/Apple can be added through Better Auth `socialProviders`; only show buttons after both server credentials and native callbacks are configured.

## Deploy

Existing R2/D1/Worker resources are already provisioned; do not create new paid services. Testing is the existing `preview` Wrangler environment. GitHub's manual `Promote Cloudflare release` workflow only accepts main, reruns the complete reusable CI gate, deploys testing, runs real API/browser/media acceptance, then optionally promotes the same SHA to the `production` environment. Production depends on successful testing; concurrency prevents simultaneous promotions. Configure owner-controlled environment protections and scoped `CLOUDFLARE_API_TOKEN` secrets plus `CLOUDFLARE_ACCOUNT_ID` variables in GitHub `testing` and `production`. No credentials are created by this repository.

A currently authorized Wrangler operator can use the same helper after verifying green CI on the exact clean main revision:

```sh
npm run build
npm run worker:types
node scripts/deploy-release.mjs preview
node scripts/deploy-release.mjs production
```

The helper applies migrations and repeatable catalog seeds, stamps `SOURCE_REVISION` and version metadata, verifies health, and fails if hosted API, browser or media checks fail. Production checks testing's health SHA and, outside CI, the matching passed `release-evidence/preview.json`. No production user data is copied to testing. Upload a changed media manifest to testing, verify it, and publish the identical content to production before promotion. Normal code-only releases reuse the existing immutable R2 assets. Hosted email-enabled acceptance requires owned test mailboxes; see [email setup](email-setup.md).

Evidence includes exact SHA, environment, URL, Worker metadata and timestamps in ignored `release-evidence/*.json`; CI uploads it as version-labeled artifacts. Link the final evidence from the release PR/completion ledger. Never put account tokens or private exports in evidence. A failed smoke test leaves a failed record and blocks promotion; use the rollback procedure if a production smoke fails.

## Rollback and operations

Use `npx wrangler deployments list --env production` then `npx wrangler rollback <VERSION_ID> --env production` for compatible code rollback. D1 schema changes must be backward compatible; do not roll back code across an incompatible migration. D1 Time Travel can recover data, but test recovery in preview before using it on production. Keep versioned media instead of overwriting published keys.

Inspect Workers observability for error rates and latency; never add request bodies/cookies to logs. Monitor D1 rows read/written, R2 operations/storage and Workers AI usage. Authentication hashing runs inside a SQLite Durable Object and signup has been verified on Workers Free. Do not enable unbounded model output or automatic recurring AI calls.

## Free-plan guardrails

The owner requires no paid overages. Workers Free was verified in the Cloudflare billing dashboard on 2026-09-27; do not upgrade it. D1, SQLite Durable Objects and Workers AI stop at their free limits. Authentication hashing runs in a Durable Object so it does not rely on the Worker Free 10 ms CPU allowance.

R2 is a usage-billed subscription with free Standard-storage allowances, not an account-wide hard spending cap. All LIMIT buckets stay private with no r2.dev/custom-domain bypass. The application reserves usage before R2 operations: each environment allows at most 256 MiB of lifetime private uploads, 1,000 lifetime uploaded objects and 20,000 storage requests per calendar month. Failed/retried uploads consume the conservative reservation; it is never automatically reset. Across preview and production, private bytes stay below 512 MiB. Published media must be manually budgeted below 500 MiB per environment. Do not enable Infrequent Access, Images, Stream, paid Workers or external paid AI.

The agent permits 10 model calls per environment per UTC day, then uses deterministic guidance. No auto-upgrade or paid provider fallback exists. Owner-created buckets, direct uploads or other applications share the account's R2 allowance and are outside these application limits. Recheck account usage before importing exercise media. R2 has no confirmed account-wide zero-dollar hard cap; do not claim otherwise.

See [incident, backup/restore and secret rotation instructions](operations.md), [email activation](email-setup.md), and [completion ledger](completion-ledger.md).
