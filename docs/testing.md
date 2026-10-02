# Verification

```
npm run security:check
npm run media:check
npm run check:release-source
npm run test:native
npm run format:check
npm run lint
npm run worker:types
npm run typecheck
npm run typecheck:worker
npm test
npm run build
npm run db:migrate
npm run db:seed
# Start npm run dev:worker in a second terminal
npm run test:api
npx playwright install chromium
npm run test:e2e
```

Unit tests cover the deterministic engine, nutrition, health calculations, conflicts, proposals and repeatable SQLite migrations/catalog seeds. API tests use disposable accounts against local workerd and test actual D1/R2/session behavior. Browser regression tests intercept only synthetic fixtures, block nonlocal traffic, and cover 320/390/430/820/1280 pixel layouts. Do not treat fixture tests as remote authentication evidence. Hosted smoke tests must separately verify the deployed Worker.

The API suite defaults to localhost:8787. Never point it at another environment without explicitly authorizing disposable test accounts and data. Accessibility automation complements keyboard, screen-reader and real-device checks; it does not certify accessibility.

Real browser acceptance (no API mocks) is in `tests/hosted/smoke.mjs`. With the local Worker running, run `node tests/hosted/smoke.mjs`. It verifies login, pause/refresh, offline edits/reload, resynchronization, completion, responsive widths and network destinations. It deletes only its disposable test account. To smoke-test an authorized deployment, set `LIMIT_API_URL` to that exact preview/production origin. Screenshots default to `/tmp/limit-hosted-screenshots`.

Native checks: `npm run lint --workspace limit-mobile`, `npm run typecheck --workspace limit-mobile`, and `cd apps/mobile && npx expo-doctor`. CI also exports web, iOS and Android bundles without buying cloud builds. Audit all root/workspace dependencies with `npm audit` and the separately installed Worker with `npm audit --prefix worker`.

`tests/hosted/media.mjs` verifies every available generated video checksum and byte range, six public pages, and actual mobile browser playback. Run it after the matching manifest is uploaded, with `LIMIT_API_URL` set to the authorized HTTPS environment. A 50 KB original squat video and poster are committed solely as deterministic browser fixtures; the full asset set remains in R2. Eight existing E2E skips intentionally exclude desktop-only layout checks from phone/tablet projects. New media/public-page checks run at all five widths.
