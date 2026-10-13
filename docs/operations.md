# Operations, incidents and recovery

## Monitor without health data

Inspect Workers observability and `/api/health` for errors, latency, environment, source SHA and Worker version. Logs sample operational requests and AI feature/model/outcome/usage; never add bodies, cookies, reset links, health data or private file paths. Inspect Cloudflare dashboards for Worker/D1/DO/AI quotas and **all** R2 buckets. No paid monitoring service is required. Quota exhaustion must fail visibly while retaining device workout drafts.

## Before migrations or rollback

Migrations are additive and repeatable; seeds update the public catalog by stable key and do not create remote test users. Capture the current Worker version, source SHA and D1 Time Travel bookmark before any schema change (`npx wrangler d1 time-travel info DB --env production --json`, with the matching preview command). Time Travel is automatic and included; the Workers Free recovery window is seven days, not indefinite retention. See [current D1 recovery documentation](https://developers.cloudflare.com/d1/reference/time-travel/). Export a protected local backup with `npx wrangler d1 export DB --remote --env production --output /private/path/limit-backup.sql`. This contains private account/health data: use owner-controlled encrypted storage, restrictive permissions and never Git/CI artifacts. LIMIT does not currently promise or configure indefinite backups.

Test fresh migrations/seeding and snapshot restoration separately. A full snapshot already includes schema, migration records and catalog rows; import it into an empty isolated database, without seeding first. Wrangler can export child rows before their referenced parent tables exist. With Python 3, prepare a schema-first copy while preserving each complete SQL statement and foreign-key deferral:

```sh
python3 scripts/prepare-d1-restore.py /private/path/limit-backup.sql /private/path/limit-restore.sql
npx wrangler d1 execute DB --local --persist-to /private/path/isolated-restore --file /private/path/limit-restore.sql
```

The helper never connects to a database, refuses existing output paths, writes with owner-only permissions and fails on an unsupported/incomplete export format. It does not disable foreign keys or remove failed rows. Use trusted operator exports only. Verify row counts, catalog, account login, sessions, ownership and foreign keys after import. Do not restore production data into a publicly reachable testing app. D1 Time Travel availability/retention follows the account plan; check the current dashboard before relying on a bookmark. No production restore was performed as part of this release.

The October 12 local drill used two synthetic accounts, one profile, a seven-day plan and an active workout. The unprepared export failed on a missing parent table. Schema-first preparation preserved all 494 statements; the isolated restored Worker then passed login, existing sessions, plan/workout reads, 365 catalog entries, export and two-account isolation. Synthetic accounts were deleted from source and restored databases. Offline SQLite integrity and foreign-key checks passed. This verifies local D1 recovery only, not remote Time Travel or R2/Durable Object recovery. Four regression tests cover parent ordering, quoted semicolons, sequence state, retained foreign-key enforcement, fail-closed input handling and private/non-overwriting output.


For an incident, stop promotion and preserve evidence without secrets. Record affected SHA and symptom, disable the affected optional feature if needed, then choose a compatible Worker version:

```sh
npx wrangler deployments list --env production
npx wrangler rollback <previous-compatible-version-id> --env production
```

Run hosted health/API/browser acceptance afterward and record the actual returned version/SHA. Code rollback does not undo D1 data or R2 writes. Do not restore a database automatically or cross an incompatible migration. Record the actual prior compatible version immediately before each promotion; never reuse an old runbook version ID. PR #89 adds meal-shortcut, operational-counter and date-specific schedule tables plus the meal operation-ID index. Fresh database migration and lifecycle tests cover these additive changes. Rolling back code leaves the added data in place; older clients cannot interpret new session-budget or schedule behavior, so assess active sessions and preserve drafts before rollback.

## R2 and account deletion

Buckets remain private. Upload downloads always validate account ownership. Successful account deletion deletes the account's live R2 uploads and D1 records; failures are surfaced rather than reported as success. Shared exercise assets are not user uploads and remain. Immutable media versions support rollback. The pipeline checkpoints uploads and publishes its D1 manifest only after all objects exist. Keep older referenced media during rollback retention; review references before deleting external objects. Provider backups and copies saved on other devices are distinct from live deletion.

## Rotation and updates

Store separate preview/production authentication and email secrets. Rotate through Wrangler secret prompts, redeploy, and verify login/reset; authentication secret changes can invalidate sessions. Never print secrets or copy OAuth tokens into CI. If credentials are exposed, revoke them in the owner account before issuing replacements and review access logs. GitHub deployment tokens must be scoped to existing Workers/D1/R2 resources; owner creation is required when no existing token exists.

Dependabot checks root/Worker packages and Actions weekly. Major upgrades stay individually reviewable. CI runs a secret pattern scan and both npm audits; the exact node-forge exception expires 2026-10-15. GitHub's native secret scanning can complement the local scan when repository administration permits enabling it. A pattern scanner is not a guarantee against every possible credential.
