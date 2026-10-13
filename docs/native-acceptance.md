# Native candidate preparation and acceptance

This is a separate native track with engineering and owner acceptance still open. Web production does not constitute an IPA, device, signing, App Store or TestFlight pass. `release/app-store.json` deliberately leaves human evidence unverified; `npm run check:app-store` must continue failing until the real evidence exists.

## Current evidence boundaries (2026-10-03)

| Level | Actual result | Next action |
|---|---|---|
| Source and Expo web | SDK 57 Doctor 21/21 and iOS/Android/web JavaScript exports passed in PR #62 CI. Mocked Expo web history and owner-switch DOM tests passed; these are not packaged native tests. | Keep these gates on each source revision. |
| iOS simulator | Xcode 26.2 and iOS 26.2 simulators are installed. Free bottled CMake was installed; CocoaPods fetched Hermes and Expo pods. An unsigned two-job simulator build failed in `expo-modules-jsi@57.1.1`: two invalid Swift ownership annotations on `RuntimeScheduler` constructors. A disposable two-line local edit cleared that first error but revealed multiple Swift concurrency errors in `JavaScriptRuntime.swift`. No package patch or compiler-safety relaxation was committed. Generated project/config edits were removed; no simulator app ran. | Use the supported toolchain: current Expo SDK 57 documentation requires Xcode 26.4 or newer, while this Mac has 26.2. Rebuild with a compatible toolchain and actually run the app before recording UI, deep-link, media, interruption or accessibility results. Do not patch compiler-safety checks to accommodate an unsupported toolchain. |
| Physical device and store | No signed build, physical-device run, TestFlight run or privacy-manifest report from an actual IPA. | Owner supplies legal publisher identity, approved bundle IDs, signing/account access, declarations and controlled real-device evidence. Keep signed/OTA release blocked while node-forge signing risk remains. |

## Free hosted simulator check

`Unsigned native simulator` runs only when this repository is public, on GitHub's standard `macos-26` runner with Xcode 26.4.1. It uses a clearly disposable `com.example.limit.simulator` identifier, no Apple account/team, no signing, and no EAS service. Expo generates the native project; CocoaPods and Xcode compile a Release simulator application with signing disabled. The check installs it on an existing iPhone simulator, requires its process to remain running and captures a screenshot. The exact-source JSON and bounded compressed logs/screenshots have one-day artifact retention; no app binary is uploaded.

A passed job establishes compile/process-launch only. The screenshot still needs inspection for a rendered application, and authentication, lifecycle, physical-device and TestFlight acceptance remain separate. It does not clear the node-forge signed/OTA restriction. See the release PR for actual run status; adding a workflow is not a successful build.

Local update assessment: this Mac runs macOS 15.6.1 with Xcode 26.2 and roughly 19 GiB free. Apple's supported Xcode 26.4.1 requires macOS Tahoe 26.2 or later, so a supported local update entails an owner-scheduled operating-system upgrade and sufficient free storage. No OS upgrade, developer agreement, purchase or signing change was performed. Hosted simulator work avoids that local prerequisite.

Sources: [GitHub standard runner availability and free public-repository usage](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job), [macOS image toolchain](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md), [Apple Xcode requirements](https://developer.apple.com/xcode/system-requirements), [Expo SDK matrix](https://docs.expo.dev/versions/v57.0.0/).

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
3. Build a plan on web and view it on device. Start workout, log warm-up/working sets, copy prior values, pause/rest/resume. Background and lock screen; verify timer follows elapsed time. Finish, open Workout history, page through completed sessions and check set details, load units, empty/loading/error/retry states and the completed-only filter.
4. Disconnect, log a set, force-close and reopen, reconnect and synchronize. Create a conflicting edit on web and resolve explicitly. Repeated Finish must create one completion. Drafts must disappear on logout/deletion.
5. Account B must not see A's plan, workout, history, detail, draft, export or upload; verify direct API denial as well as UI. Switch accounts while A's home plan, history and workout detail requests are pending, and check that no A content appears before or after B's responses. Switch while an interrupted workout is open and confirm A's cached draft cannot appear. Delete A and confirm its sessions and private files are inaccessible while B remains intact.
6. Check native instructional media on a technically checked movement: manual load, play, pause, caption, loading/error/retry and written fallback. Also check a blocked movement has written cues without a substituted video. Check manual nutrition/text fallback and explicit AI consent on web handoff. Camera/photo estimation is not implemented; do not fabricate a camera test. Verify unsupported native features are absent. Source/export checks alone do not establish native playback on a physical device.
7. Repeat on a physical iPhone in TestFlight after owner-approved signing/upload. Record crash logs, network failures, accessibility observations and corrections. Only the actual reviewer may mark evidence verified.

## Store metadata draft

Name: LIMIT. Subtitle: Plan, train, track progress. Description: “Build a manageable routine, follow written exercise cues, log sets and keep your workout history. LIMIT provides general fitness guidance and is not medical care.” Screenshots should show the actual dashboard, weekly plan and workout logger from the submitted native build. Do not advertise unsupported camera estimates, health sync, push, subscriptions or human-reviewed media. URLs start at the existing workers.dev privacy/terms/support/data pages; operator approval of legal identity and policy text remains missing; the owner supplied `limitfitnessapp@gmail.com` as the private support contact. Age rating, publisher, privacy labels, reviewer credentials and commerce decision require the owner. No paid checkout is active.
