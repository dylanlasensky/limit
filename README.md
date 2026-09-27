# LIMIT

A React fitness app with a Cloudflare API, private accounts and a shared exercise catalog.

## Development

Use Node 24 and npm. `npm ci && npm ci --prefix worker`, then copy `.dev.vars.example` to `.dev.vars` and set a random authentication secret (at least 32 characters). Never commit it.

```
npm run build
npm run worker:types
npm run db:migrate
npm run db:seed
npm run dev:worker
```

Open http://localhost:8787. Create a fresh account and complete onboarding. Local email delivery and live AI are disabled by default. For UI hot reload use `npm run dev` alongside the Worker.

See [architecture](docs/architecture.md), [deployment](docs/deployment.md), [testing](docs/testing.md), [media workflow](docs/exercise-media.md), [mobile](docs/expo.md), and [known limitations](docs/known-limitations.md).
