# Verification

```
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
