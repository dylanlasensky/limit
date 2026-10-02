# Native candidate preparation and acceptance

This is a separate owner-deferred track. Web production does not constitute an IPA, device, signing, App Store or TestFlight pass. `release/app-store.json` deliberately leaves human evidence unverified; `npm run check:app-store` must continue failing until the real evidence exists.

## Build preparation

Expo 57 / RN 0.86 / React 19.2.3 exports iOS, Android and web. Web preview uses owner-scoped localStorage drafts and same-origin cookies; the deployed website remains Vite. Native uses SecureStore plus owner-scoped SQLite. Expo web preview requires the Worker API reverse-proxied under its own origin; never weaken API CORS to preview it. The approved logo supplies icons/splash. Safe areas, accessible labels, keyboard avoidance, offline drafts and callback scheme `limit://` exist in source, but packaged-device acceptance remains unverified.

Dynamic Expo config accepts the owner-approved `LIMIT_BUNDLE_IDENTIFIER`, `LIMIT_APPLE_TEAM_ID`, positive `LIMIT_NATIVE_BUILD` and tested `LIMIT_SOURCE_REVISION`. `LIMIT_NATIVE_RELEASE=true` fails closed when any is missing or placeholder. These identifiers are configuration, not secrets. For each candidate: fetch main, require a clean checkout, pin `LIMIT_SOURCE_REVISION=$(git rev-parse HEAD)`, increment the native build number, export all targets, and record the resulting source/build in the evidence ledger. No Apple/Google/EAS account or credentials are created automatically. Do not start signed/OTA release while the node-forge tooling advisory exception remains unresolved.

After owner authorization and signing setup, run EAS development/preview builds within confirmed free allowance, or a local Xcode/Android development build. Production signing and submission require explicit account access and legal agreement approval. Do not enable automatic paid build fallback. EAS production config uses the explicit local version/build, not a silent remote increment.

## Permissions and privacy review

No camera, microphone, contacts, location, native health, notification, tracking or subscription feature is enabled in the current native shell. Do not add permission strings to pretend those features exist. Inspect the generated IPA's Info.plist, entitlements and merged SDK PrivacyInfo.xcprivacy manifests, and verify required-reason API declarations against actual SQLite/SecureStore/React Native SDK use. Dependency manifests cannot establish the operator's privacy labels. Record the generated privacy report, app data inventory and owner-approved labels; do not invent collected-data declarations before artifact review.

## Physical device script

Record build/SHA, device, OS, date, tester and actual outcomes. Use two ordinary disposable accounts and owned mailboxes.

1. Install signed development build. Check splash, safe areas, rotation policy, large text, keyboard focus, VoiceOver/TalkBack and reduced motion. Photograph/screenshots must come from this real build.
2. Fresh signup, verification, login, close/reopen session, reset via received link, reject old password/session, logout and expired-session recovery. Inspect callback routing with app open and closed.
3. Build a plan on web and view it on device. Start workout, log warm-up/working sets, copy prior values, pause/rest/resume. Background and lock screen; verify timer follows elapsed time.
4. Disconnect, log a set, force-close and reopen, reconnect and synchronize. Create a conflicting edit on web and resolve explicitly. Repeated Finish must create one completion. Drafts must disappear on logout/deletion.
5. Account B must not see A's plan, workout, draft, export or upload; verify direct API denial as well as UI. Delete A and confirm its sessions and private files are inaccessible while B remains intact.
6. Check native instructional media on a technically checked movement: manual load, play, pause, caption, loading/error/retry and written fallback. Also check a blocked movement has written cues without a substituted video. Check manual nutrition/text fallback and explicit AI consent on web handoff. Camera/photo estimation is not implemented; do not fabricate a camera test. Verify unsupported native features are absent. Source/export checks alone do not establish native playback on a physical device.
7. Repeat on a physical iPhone in TestFlight after owner-approved signing/upload. Record crash logs, network failures, accessibility observations and corrections. Only the actual reviewer may mark evidence verified.

## Store metadata draft

Name: LIMIT. Subtitle: Plan, train, track progress. Description: “Build a manageable routine, follow written exercise cues, log sets and keep your workout history. LIMIT provides general fitness guidance and is not medical care.” Screenshots should show the actual dashboard, weekly plan and workout logger from the submitted native build. Do not advertise unsupported camera estimates, health sync, push, subscriptions or human-reviewed media. URLs start at the existing workers.dev privacy/terms/support/data pages; operator approval of legal identity and policy text remains missing; the owner supplied `limitfitnessapp@gmail.com` as the private support contact. Age rating, publisher, privacy labels, reviewer credentials and commerce decision require the owner. No paid checkout is active.
