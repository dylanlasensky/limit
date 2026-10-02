# Transactional email activation

Application integration is implemented and tested; external delivery is **owner-deferred**. `RESEND_API_KEY` is absent and `EMAIL_ENABLED=false` in both hosted environments. Registration/login work without verified email; reset requests explain that delivery is unavailable. A half-configured flag cannot advertise email as enabled.

Owner checklist (no purchase or upgrade authorized):

1. Use an existing free Resend account and a domain you already own. Resend's free testing sender can send only to the account owner's address, so it does not enable general customer verification. If neither exists, choose an owned domain/account before proceeding; do not buy one automatically.
2. Verify a sending subdomain using the DNS records Resend supplies. Disable link tracking for authentication messages. Set the approved `EMAIL_FROM` address in each Wrangler environment.
3. Create a **Sending access** key restricted to that verified domain. Store it directly with `npx wrangler secret put RESEND_API_KEY --env preview` (and later a separate production key). Never paste it in chat, Git, an issue, a command argument or a log.
4. Test preview using a mailbox you control: fresh signup → delivered verification → login → reset → old password rejected → new password accepted → old session revoked → logout. Test expired/reused tokens and wrong origin. A correct-password sign-in by an unverified account requests a fresh verification message, allowing recovery after expiry or an earlier provider failure; it still cannot create a session before verification. Check provider delivery events without exposing the message/link/token.
5. Only after successful delivery set `EMAIL_ENABLED=true`, redeploy through the promotion gate, and repeat with one disposable production account. Record timestamp and outcome, never token contents. Hosted smoke's synthetic `example.invalid` users apply only while email is disabled; once enabled, use verified disposable mailboxes and a provider-aware acceptance job before promotion.

Each environment reserves at most 25 messages/UTC day and 500/month before sending. Combined LIMIT caps are 50/day and 1,000/month, below Resend's documented free 100/day and 3,000/month. Failed sends still consume the reservation. Other Resend applications share the account allowance; inspect usage and do not enable automatic upgrades. HTTP 429/5xx/timeouts fail visibly with a generic error. Requests use stable opaque idempotency keys, a ten-second timeout, escaped HTML, plain text, trusted-origin links, and no message/token logs.

Google login is deliberately deferred. Email/password meets the current product need; no Google project, consent screen or credentials were created. Better Auth supports future configuration-driven providers. If third-party social login becomes a primary iOS login method, reassess Apple's guideline 4.8 requirement for an equivalent privacy-preserving login option and applicable exceptions before submission. No Sign in with Apple readiness is claimed.

Sources reviewed: [Resend limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [domain verification](https://resend.com/docs/dashboard/domains/introduction), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/#login-services).
