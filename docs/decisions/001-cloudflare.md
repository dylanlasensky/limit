# ADR 001: One web origin and a portable domain layer

Status: accepted for implementation, 2026-09-27.

The existing React/Vite app has useful workout, nutrition, health and personalization behavior and extensive regression coverage. Keep that client and its catalog. Serve its static assets and `/api/*` from one Cloudflare Worker to simplify cookies, CSRF rules and deployment. Keep preview and production resources separate.

D1 stores identities and relational application records. Tables carry stable IDs, owner IDs, indexed relation keys and foreign keys; application validation controls bounded structured fields. R2 holds private uploads and versioned instructional media. An authenticated Worker controls access; no public private-file bucket. Cloudflare bindings are the runtime interface.

Use a Durable Object only for account-level mutation serialization and the Agents SDK coaching state. The model can propose structured changes but never bypass deterministic validation or activate a plan itself. Small synchronous operations stay on the request path; introduce background jobs only when measured work requires them.

Move reusable catalog, routine and validation code into `packages/domain`. The future Expo client shares these modules and API contracts without importing web components.

References retrieved during implementation:
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- https://developers.cloudflare.com/agents/runtime/communication/routing/
