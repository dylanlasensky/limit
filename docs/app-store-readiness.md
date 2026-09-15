# LIMIT App Store release gate

Reviewed September 14, 2026. **The website is not yet a verified App Store release.** Passing web tests, publishing Base44, or receiving a platform readiness score does not establish that the signed iPhone application works. This document records the remaining release work without inventing an Apple account, business identity, pricing, or test results.

## Distribution approach

Use Base44's existing iOS packaging rather than introducing a second native bridge. Its Mobile app publishing workflow creates an IPA around the published HTTPS app. Generation requires the appropriate Base44 plan and Apple developer credentials supplied securely in the platform. Native push, full offline operation and HealthKit are not supported by that wrapper; built-in digital-purchase support is described as pending. The generated package—not this repository—owns its bundle identity, permissions and signing configuration. Verify those values before establishing a store listing. [Base44 mobile submission documentation](https://docs.base44.com/documentation/building-your-app/uploading-to-app-stores)

Do not replace the app with a local-assets Capacitor wrapper without first redesigning and testing authentication: `base44Client.ts` and `AuthContext.tsx` use same-origin `/api` calls, and valid sessions can depend on HTTP cookies. The webview origin, external login callbacks and private-file access must stay correct. Capacitor's remote `server.url` configuration is intended for development, not a shortcut to a production release. [Capacitor configuration](https://capacitorjs.com/docs/config)

Local Xcode 26.2 and iOS 26.2 simulator prerequisites were inspected. No signed LIMIT IPA, signing credentials, installed release app, or physical-device result was inspected. No developer account was created and no store submission was made.

## A real package is required

Apple requires uploads built with Xcode 26 or later and the iOS 26 SDK or later since April 28, 2026. Base44's support page still contains older advice about ignoring an iOS 18.1 SDK warning; that advice is out of date for this release. Inspect the actual generated IPA and App Store Connect validation result. The local Xcode version does not prove which SDK Base44 used. [Apple SDK requirements](https://developer.apple.com/news/upcoming-requirements/)

Record the generated bundle identifier, publisher team, version/build, package hash, SDK, enabled capabilities, and corresponding source commit. Do not add `.p8` files, signing material, passwords, tokens, or user data to GitHub. Use restricted evidence links for operational test reports.

## Blocking release evidence

| Area | Evidence to complete on the actual release candidate |
| --- | --- |
| Native sign-in | Sign-up and email verification; invalid/expired code; password reset; session expiry; logout/account switch; background/resume; all enabled external login callbacks. Existing Google sign-in needs an equivalent privacy-preserving option or a documented applicable exception. |
| Privacy and ownership | Verified publisher identity; approved public privacy/terms/support URLs; accurate labels for app and service providers; retention and deletion procedures; native SDK privacy report and required-reason declarations. |
| Camera and files | Inspect generated camera/photo-library purpose strings. Test camera, picker, denial, cancellation and file rejection without losing input. Never add location, contacts, microphone or HealthKit permissions without a corresponding feature and justification. |
| Isolation and deletion | Two ordinary disposable accounts; direct entity and signed-file access attempts; in-app account deletion including interrupted/retried deletion, uploads and any provider token revocation. |
| Workout correctness | Two devices editing one session; airplane mode, sleep/wake, reload, reconnect, lost acknowledgement, Finish during save, conflicts, old history and program replacement. A recoverable active draft is not full offline support. |
| AI and nutrition | Consent and decline paths; non-AI alternatives; third-party data disclosure; hostile inputs, poor images, allergic restrictions, unsafe advice, rate/cost limits and failure recovery. |
| Accessibility | Physical iPhone VoiceOver, large text, reduced motion, both themes, contrast, keyboard focus/overlap, touch targets, notches and small screens. Browser viewport emulation does not satisfy this check. |
| Operations | Live support response, private error monitoring, service limits, incident owner, backup restore and release rollback. No sensitive photos, prompts, tokens or account records in logs. |
| Store materials | Accurate screenshots/icon, age-rating questionnaire, available features only, reviewer access, stable services and relevant review notes. No HealthKit, native reminders, offline or medical-outcome claims. |
| TestFlight | Install the generated release candidate on a physical iPhone; record the version/build, source revision, test matrix and defects resolved. |

Apple evaluates functionality beyond a repackaged website, complete reviewer access, accurate representations, and privacy-preserving alternatives when social login is offered. Its digital-purchase rules include storefront-specific exceptions; those are not a reason to enable an unreviewed global web checkout. [App Review Guidelines: 2.1, 3.1, 4.2, 4.8 and 5.1](https://developer.apple.com/app-store/review/guidelines/)

Apps supporting account creation must allow users to initiate account deletion within the app. Deactivation alone is not enough; subscription and identity-provider obligations also need verification where applicable. [Apple account-deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

## Commercial release

There is no implemented StoreKit subscription or entitlement system in the audited repository. Installed Stripe libraries are not billing. `commerce.mode` therefore remains `unconfigured`; the app is not certified ready to sell digital access.

An explicitly approved release with no paid features can select `no-paid-features`. A paid digital release must implement `storekit` with real product identifiers, transaction verification, server-side entitlements, restore purchases, pending/failed purchases, renewals, cancellation, refunds/revocation and account switching, then attach sandbox/TestFlight evidence. Do not create product prices or charge users as part of a readiness audit.

## Automated gate and evidence ledger

`release/app-store.json` intentionally contains null identity/legal fields and unverified checks. `scripts/check-app-store-readiness.mjs` never creates attestations or reads signing credentials.

```bash
npm run check:release-source   # narrow static guard; may pass while storeReady remains false
npm run check:app-store        # fails until the evidence ledger is complete
node scripts/check-app-store-readiness.mjs --json
```

`codeReady` means only that the script's static source guards passed, not that all application tests passed. `storeReady` means those guards and the evidence-record requirements passed; it is not an independent audit of the evidence or a guarantee of Apple approval.

Each required check needs `status: "verified"`, `sourceRevision`, `checkedAt` (ISO timestamp), `reviewedBy`, and an HTTPS `evidenceUrl`. Reports must identify the tested build, expected results, actual results and defects. Evidence expires after 30 days or if the tested source changes. Only the ledger itself may differ from the pinned commit, allowing evidence to be committed after testing. Missing, future-dated, stale and revision-mismatched evidence blocks release. No check is waived by deleting its entry or setting it to not applicable.

For legal approval, verify the deployed `VITE_LIMIT_PRIVACY_URL`, `VITE_LIMIT_TERMS_URL`, and `VITE_LIMIT_SUPPORT_URL` match the approved URLs in the ledger and are reachable before sign-in and inside the installed app. The informational fallback pages are not a substitute for approved legal documents or a working customer-support channel.

The CI source guard should remain separate from ordinary web deployment: it prevents obvious regressions without misrepresenting an unreleased mobile build as approved. Run the full gate before generating the final submission build and again before submission.
