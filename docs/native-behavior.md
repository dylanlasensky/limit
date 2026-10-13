# Bounded native simulator behavior candidate

This candidate preserves accepted web main `eb4cf12e2ca7500285058280ae62e0286f6da82a` and both existing deployments. It adds black-box UI acceptance to the unsigned iPhone simulator job; a planned test is not a passed test. Inspect the exact-source `behavior.json`, logs and screenshots before reporting results.

The public-repository-only standard `macos-26` runner compiles with Xcode 26.4.1. No Apple account, signing, EAS/Maestro Cloud account, API key, payment or legal agreement is used. Maestro CLI 2.11.0 is downloaded from its official release and checked against the published SHA-256. Java 17 is already provided by the runner. CLI analytics are disabled and its API/error-reporting endpoint is redirected to loopback; no AI analysis or cloud upload command is invoked.

## Planned acceptance

1. Seed two disposable `example.invalid` preview accounts and clearly synthetic plans. Require the accepted preview source and email-disabled configuration; production is rejected.
2. Open a protected workout deep link while signed out, sign in through real secure native fields, open the owned workout and save one set. Independently assert its owner, session, repetitions and uniqueness through the API.
3. Edit the saved row without syncing. Background/foreground and terminate/relaunch the app, reopen the deep link, and assert retained edits. Verify the backend still holds the earlier value. Pause/resume is also exercised.
4. Temporarily deny only the preview hostname in the disposable runner's hosts file. Require an actual failed network probe, then test draft access, failed sync/Finish and another relaunch. Restore networking in `finally`, with an additional always-run workflow cleanup step. This tests API unavailability, not an iOS radio/airplane-mode transition. Maestro's iOS airplane-mode command is a no-op and is deliberately not used.
5. Reconnect, sync, edit again and double-tap Finish. Verify one completed session and exactly one set with the latest repetitions, then inspect native history/detail.
6. Sign out, confirm protected-route redirection, sign in as the second account, reject the first account's history/workout deep links, and open the second account's own workout without the first draft. Assert server 404 isolation and inspect the actual native SQLite database after logout for zero drafts.

Fixtures are created only after compilation. Credentials are random, kept in memory and a runner-temporary mode-0600 file, masked/redacted from logs, and never committed or uploaded. Raw Maestro debug directories are not uploaded. Both synthetic accounts are deleted even when a stage fails; incomplete cleanup fails the job and the always-run step retries cleanup. Artifact retention is one day, with bounded logs and selected screenshots, not an app binary. A stage failure stays a failure; assertions are not skipped or automatically retried into a pass.

The only app instrumentation is stable accessibility test identifiers on existing controls. No fake session, alternate network client, relaxed authorization, password-field weakening or mock workout behavior is added.

## Remaining boundaries

Simulator results do not establish physical-device lifecycle, VoiceOver/TalkBack, email/OAuth callback delivery, camera/health features, signed IPA/privacy manifests, TestFlight or store acceptance. Email and OAuth remain unavailable until owner configuration exists. The existing node-forge advisory still blocks signed/OTA native release. Any actual product defect reproduced by this candidate needs a focused fix/regression and new candidate evidence; the accepted web release must not be silently replaced.

References: [Expo 57 requirements](https://docs.expo.dev/versions/v57.0.0/), [Maestro installation](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli), [CLI parameters](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants), [iOS airplane-mode limitation](https://docs.maestro.dev/reference/commands-available/setairplanemode), [simulator secure-input workaround](https://docs.maestro.dev/extra-materials/troubleshooting/known-issues), [Maestro 2.11.0](https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.11.0).
