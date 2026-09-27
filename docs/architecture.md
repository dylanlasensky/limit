# Architecture

The Vite React client and `/api` share one Worker origin. Static assets bypass the Worker except API routes. The browser uses HttpOnly session cookies; future native clients use the Better Auth Expo adapter and secure storage.

- **Workers:** validated API routes, authentication, file access, AI integration, structured operational logs.
- **D1:** Better Auth identity/session tables and separate application tables for profiles, workouts, sets, food, measurements, health imports, plans and preferences. Application tables retain validated domain payloads as JSON, with indexed ownership and relationship columns. Foreign keys enforce account deletion and relationship integrity. This avoids a wide sparse schema while preserving explicit relational boundaries; frequently queried JSON fields can be promoted to columns later.
- **R2:** separate private uploads and versioned instructional media buckets per environment. Files are never public by default. The Worker validates ownership before returning uploaded bytes. Approved exercise media is public and immutable by version.
- **AccountCoordinator Durable Object:** serializes every account mutation. Workout row operation IDs and revision checks make retries safe. D1 transactions activate coaching plans only after all seven days are stored.
- **LimitCoach Agent:** stores a pending proposal per account. Workers AI classifies a question into a reviewed guidance category. Catalog selection, schedule, equipment, volume, duration, recovery and nutrition checks are deterministic. A model cannot activate a plan. The user must approve a before/after preview.
- **Shared modules:** `packages/domain` holds catalog, program generation and analytics; `packages/contracts` holds Zod schemas used by API and clients.

No queue is required for bounded text imports or small exports. Larger imports/media processing must move to Queues or Workflows before their supported limits grow. Current exports paginate with explicit limits and fail rather than silently truncate.

Private queries always include the authenticated account ID. Client ownership fields are rejected. Public catalog writes and raw session/set writes are forbidden. All mutations reject foreign browser origins. Authentication and AI have D1-backed rate limits. Logs include only request ID, method, status and duration, never prompts, health data or credentials.

See the decisions in `docs/decisions`. No account migration is part of this system.
