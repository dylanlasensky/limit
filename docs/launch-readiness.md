# LIMIT launch readiness

## Status

This change set is a production-hardening pass, **not approval to take payments or a certification that the live app is secure**. It preserves the Base44 backend, existing five-tab product, athlete-program import, imperial measurements, and black/royal-blue visual direction. No live customer records were edited or deleted during verification.

## Implemented

- Workout saves drain the latest queue, share in-flight work with Finish, preserve offline drafts and original revisions, and require an explicit choice after conflicting edits. Invalid sets cannot be marked complete. Finishing invalidates progress caches.
- New programs are built inactive and checked on the server before activation, under the same per-user lock as workouts. An unfinished program cannot deactivate the working program. Reading a schedule no longer changes it.
- The dashboard and new saved Muscle Rating snapshots share one scoring function. Empty data is not fabricated; warmups and unfinished sets are excluded. Existing historical snapshots are not rewritten.
- Manual/scanned food writes validate names, portions and nutrition, preserve the selected meal, show failures, and allow retry. Saved meal weeks reload; incomplete saves do not replace the previous week. New exclusions still filter saved suggestions. Batch portions affect grocery counts.
- Cookie-backed sign-in works without a stored token. Account changes clear query caches. App/server configuration comes from build settings, not untrusted URL or storage overrides. Photo signing uses the user's permissions and short-lived links. Settings writes omit server-owned workout locks.
- Dark/light tokens, mobile layouts, reduced-motion support, accessible drawers, recovery screens, route-level loading, app identity, favicon and manifest are included. Duplicate JavaScript auth modules that shadowed TypeScript pages are removed.
- Regression coverage includes unit tests and a production-bundle browser suite at 320, 390, 430 and 1280 CSS pixels. Browser tests intercept APIs and block external traffic. They do **not** prove live authorization, real email delivery, device integration, or payment behavior.

## Required before selling

1. **Deploy the matching backend and frontend to a test app.** `workoutCommand` now includes `activatePlan`; the frontend and functions must travel together. Confirm shared TypeScript rating code bundles into Base44 functions. Check the environment's app ID, API URL, auth redirect domains and deployment credentials. Do not put server credentials into `VITE_*` variables.
2. **Prove account isolation with two disposable ordinary accounts.** Neither account should read or change the other's profile, food, weights, workouts, plans, imported source documents, scan photos or AI context. Attempt direct entity calls as well as UI navigation. Confirm service-role ownership filters and entity RLS behavior in the deployed environment. Source-level RLS checks are not a substitute for this.
3. **Exercise the full account lifecycle.** Signup, verification email, expired/invalid codes, email/password login, Google login, password reset, expiration, logout/account switching, optional OAuth consent, and account deletion. Test deletion only on disposable accounts; confirm uploaded-file retention/deletion as well as database records.
4. **Test real workout concurrency.** Two tabs and two devices; failed requests, lost acknowledgements, reload, sleep/wake, offline editing/reconnect, finish during saves, imported locked exercises, and plan rebuild during an active workout. Confirm exactly one usable active session and no lost acknowledged sets. The current lock is a lease, not a database transaction. Incomplete inactive program/meal records may remain after failed builds; any future cleanup must be ownership-scoped and recoverable.
5. **Validate AI and nutrition before making promises.** Test real labels, plate photos, poor images, allergen conflicts and coach requests. Add and verify server-enforced rate/cost limits and usage monitoring for AI functions. The recipe catalog is small and estimated, not a dietitian-reviewed personalized meal prescription; ingredient quantities and allergy coverage need review before commercial nutrition claims. Grocery quantities are recipe portions, not a verified shopping-weight calculation. No medicine, fitness-outcome or allergy-safety guarantees are implied.
6. **Implement the actual commercial model.** Decide web subscriptions versus native in-app purchases, pricing, trial/cancellation/refund behavior, then verify server-side entitlements and signed/idempotent payment events. A Stripe dependency alone is not billing. Publish real support/contact, privacy and terms details appropriate to the business; this PR does not invent them.
7. **Complete real-device and operational QA.** iOS Safari and Android Chrome: keyboard overlap, accessibility/contrast, camera upload, back navigation, safe areas, install-to-home-screen, poor-network performance and long histories. Configure error monitoring without sensitive payloads, uptime alerts, rate limits, backup/restore and rollback. Verify hosting security headers/CSP against required Base44 integrations. Add pagination as histories exceed current bounded queries. The manifest does not provide offline app-shell caching or native notifications. App Store distribution requires a separate native packaging/release process.

## Verification commands

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
npm run build
```

`test:e2e` supplies a fake app ID, builds locally and mocks API responses. Do not replace its fixtures with production credentials. Playwright writes reports and failure traces to ignored folders. `LIMIT_CHROMIUM_PATH` optionally selects a locally installed Chromium binary; leave unset in normal development/CI. Browser viewport emulation is not testing on actual phones.

A build without `VITE_BASE44_APP_ID` is only a compile check, not a runnable deployment. The GitHub workflow already deploys `main` automatically when configured; keep this change set on its review branch until the live-environment checks above are completed. No production environment protection rules are bypassed.
