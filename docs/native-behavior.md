# Bounded native simulator behavior candidate

This candidate preserves accepted web main `eb4cf12e2ca7500285058280ae62e0286f6da82a` and both existing deployments. It adds black-box UI acceptance to the unsigned iPhone simulator job; a planned test is not a passed test. Inspect the exact-source `behavior.json`, logs and screenshots before reporting results.

The public-repository-only standard `macos-26` runner compiles with Xcode 26.4.1. No Apple account, signing, EAS/Maestro Cloud account, API key, payment or legal agreement is used. Maestro CLI 2.11.0 is downloaded from its official release and checked against the published SHA-256. Java 17 is already provided by the runner. CLI analytics are disabled and its API/error-reporting endpoint is redirected to loopback; no AI analysis or cloud upload command is invoked.

Draft pull requests run automatic source checks but defer native compilation while fixes are being reviewed. Freeze the candidate SHA, then dispatch this workflow explicitly for its branch, or mark the PR ready for review. The final exact-head native behavior run is mandatory before readiness/merge; a skipped draft job is not acceptance. Main pushes still run the native job.

## Planned acceptance

1. Seed two disposable `example.invalid` preview accounts and clearly synthetic plans. Require the accepted preview source and email-disabled configuration; production is rejected.
2. Open a protected workout deep link while signed out, sign in through real secure native fields, open the owned workout and save one set. Independently assert its owner, session, repetitions and uniqueness through the API.
3. Edit the saved row without syncing. Background/foreground and terminate/relaunch the app, reopen the deep link, and assert retained edits. Verify the backend still holds the earlier value. Pause/resume is also exercised.
4. Sync, edit again and double-tap Finish. Verify one completed session and exactly one set with the latest repetitions, then inspect native history/detail.
5. Open a second Alpha workout and leave an unfinished 17-repetition draft. Terminate/relaunch and reopen the workout, then read the actual native SQLite database to prove that draft survives before logout.
6. Sign out, confirm protected-route redirection, sign in as Beta, reject Alpha's history and unfinished-workout deep links, and open Beta's own workout without Alpha's draft. Assert server 404 isolation and inspect the actual native SQLite database after logout for zero drafts.

Fixtures are created only after compilation. Credentials are random, kept in memory and a runner-temporary mode-0600 file, masked/redacted from logs, and never committed or uploaded. Raw Maestro debug directories are not uploaded. Both synthetic accounts are deleted even when a stage fails; incomplete cleanup fails the job and the always-run step retries cleanup. Artifact retention is one day, with bounded logs and selected post-login screenshots, not an app binary. Automatic failure screenshots and login-form screenshots are suppressed because those screens can contain credentials. A stage failure stays a failure; assertions are not skipped or automatically retried into a pass.

The only app instrumentation is stable accessibility test identifiers on existing controls. No fake session, alternate network client, relaxed authorization, password-field weakening or mock workout behavior is added.

## Reproduced draft fix

Focused regressions reproduced three existing recovery losses: uncompleted input in an allowed slot, uncompleted input outside a shortened budget, and previously excluded input when another client expanded the workout. Recovery now considers both active and retained local rows. A saved server set stays authoritative when revisions conflict, while the local version remains visible in a review card and blocks Finish until explicitly discarded. Reallowed rows with no conflicting saved set return to the logger. Local edit intent is persisted separately from untouched server snapshots, including saved incomplete sets; unchanged snapshots do not create false conflicts on later hydration. Older drafts use conservative value comparison. Operations already acknowledged by the server are not retained again, and each active set slot remains unique. The simulator candidate reopens an unfinished Alpha draft before account isolation; budget/conflict cases also have deterministic unit coverage.

## Remaining boundaries

Native network-loss/API-unavailability recovery is uncovered. The harness does not modify host networking, DNS, simulator configuration profiles or Password AutoFill. Maestro's iOS airplane-mode command is a no-op; an approved app-scoped fault method is still needed. If secure-input automation fails, report the blocked stage without weakening password fields or changing security settings.

Simulator results do not establish physical-device lifecycle, VoiceOver/TalkBack, email/OAuth callback delivery, camera/health features, signed IPA/privacy manifests, TestFlight or store acceptance. Email and OAuth remain unavailable until owner configuration exists. The existing node-forge advisory still blocks signed/OTA native release. Any actual product defect reproduced by this candidate needs a focused fix/regression and new candidate evidence; the accepted web release must not be silently replaced.

References: [Expo 57 requirements](https://docs.expo.dev/versions/v57.0.0/), [Maestro installation](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli), [CLI parameters](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants), [iOS airplane-mode limitation](https://docs.maestro.dev/reference/commands-available/setairplanemode), [Maestro 2.11.0](https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.11.0).
