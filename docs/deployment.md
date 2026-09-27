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
| ENVIRONMENT | Wrangler variable | local, preview or production |
| AI_ENABLED | Wrangler variable | Enable Workers AI classification/import; false uses deterministic coach fallback |
| VITE_LIMIT_PRIVACY_URL / TERMS_URL / SUPPORT_URL | Build variables | Optional approved public policy/support destinations |
| EXPO_PUBLIC_API_URL | Expo build variable | Public HTTPS API origin, never a credential |

Configure secrets with `npx wrangler secret put BETTER_AUTH_SECRET --env preview` and the corresponding production command. Set the Resend key similarly. Rotate secrets deliberately: existing sessions may be invalidated. Google/Apple can be added through Better Auth `socialProviders`; only show buttons after both server credentials and native callbacks are configured.

## Deploy

Enable R2 and create the four named buckets. Build with `npm run build`, validate bindings with `npm run worker:types`, then:

```
npx wrangler d1 migrations apply DB --remote --env preview
npx wrangler d1 execute DB --remote --env preview --file worker/seed.sql
npx wrangler deploy --env preview
```

Smoke-test preview first. Repeat with `--env production` after required checks pass. Seed operations update catalog content by stable ID and are repeatable. Never apply test account seeds to a remote environment. GitHub's manual deployment workflow requires scoped `CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable in each GitHub environment. The plugin can deploy without copying its credentials into GitHub.

Before release verify signup, logout, cross-account denial, a full workout, upload permission, AI outage fallback and approved media delivery. Enable email and verify reset links when credentials are ready. Record the deployed source SHA and Worker version.

## Rollback and operations

Use `npx wrangler deployments list --env production` then `npx wrangler rollback <VERSION_ID> --env production` for compatible code rollback. D1 schema changes must be backward compatible; do not roll back code across an incompatible migration. D1 Time Travel can recover data, but test recovery in preview before using it on production. Keep versioned media instead of overwriting published keys.

Inspect Workers observability for error rates and latency; never add request bodies/cookies to logs. Monitor D1 rows read/written, R2 operations/storage and Workers AI usage. Authentication hashing can require a Workers paid CPU allowance: verify signup on the account's current plan before release. Do not enable unbounded model output or automatic recurring AI calls.

## Free-plan guardrails

The owner requires no paid overages. Workers Free was verified in the Cloudflare billing dashboard on 2026-09-27; do not upgrade it. D1, SQLite Durable Objects and Workers AI stop at their free limits. Authentication hashing runs in a Durable Object so it does not rely on the Worker Free 10 ms CPU allowance.

R2 is a usage-billed subscription with free Standard-storage allowances, not an account-wide hard spending cap. All LIMIT buckets stay private with no r2.dev/custom-domain bypass. The application reserves usage before R2 operations: each environment allows at most 256 MiB of lifetime private uploads, 1,000 lifetime uploaded objects and 20,000 storage requests per calendar month. Failed/retried uploads consume the conservative reservation; it is never automatically reset. Across preview and production, private bytes stay below 512 MiB. Published media must be manually budgeted below 500 MiB per environment. Do not enable Infrequent Access, Images, Stream, paid Workers or external paid AI.

The agent permits 10 model calls per environment per UTC day, then uses deterministic guidance. No auto-upgrade or paid provider fallback exists. Owner-created buckets, direct uploads or other applications share the account's R2 allowance and are outside these application limits. Recheck account usage before importing exercise media. R2 has no confirmed account-wide zero-dollar hard cap; do not claim otherwise.
