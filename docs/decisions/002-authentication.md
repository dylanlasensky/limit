# ADR 002: Better Auth with D1

Status: accepted for implementation, 2026-09-27.

Use maintained Better Auth with its native D1 adapter for fresh accounts. Delegate password hashing, session issuance, password resets and email verification to the library. Web sessions use HTTP-only cookies on the application origin. The Expo integration uses secure device storage and the same backend. Google and Apple can be added through provider configuration without redesigning the data layer.

Authenticate every private request and derive ownership from the verified session. Never accept ownership or roles from a request body. Enforce origin checks for browser mutations, bounded request sizes and persistent authentication/AI rate limits. Use distinct secrets and databases in preview and production.

Email delivery is a configurable server integration. Do not claim verification or password reset delivery works until the sending provider and domain are configured and tested. Never log reset tokens, verification URLs, passwords or session cookies. Do not migrate existing accounts or sessions.

References:
- https://better-auth.com/blog/1-5 (native D1 support)
- https://better-auth.com/docs/installation
- https://better-auth.com/docs/authentication/email-password
- https://better-auth.com/docs/integrations/expo
- https://better-auth.com/docs/concepts/rate-limit
