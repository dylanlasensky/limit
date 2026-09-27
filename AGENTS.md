# LIMIT development

Use Node 24 and npm. Install root and worker dependencies with `npm ci` and `npm ci --prefix worker`. React web source lives in `src`; platform-neutral logic and validated contracts live in `packages`. The Cloudflare Worker is in `worker`. Read `docs/architecture.md` before changing storage, authentication or authorization.

Every private query must use the authenticated user ID. Never trust client ownership fields. Keep workout commands serialized and idempotent. Preserve the approved master logo at `public/brand/limit-logo.png`. Never describe exercise media as reviewed without real review evidence.

Before shipping run formatting, lint, web/worker type checks, unit tests, local API integration tests, browser checks and a production build. Never commit secrets or local state.
