# LIMIT health platform product plan — September 2026

This document records the product audit, competitive research, architecture decision, implemented health-hub features, and remaining integration boundaries as of September 15, 2026. The owner has authorized the GitHub release. Publication must still be confirmed from the merged commit and successful deployment workflow; this document is not proof of deployment or App Store readiness.

## Product decision

LIMIT should feel like a quiet health operating system, not a wall of dashboards. The core promise remains excellent strength training and simple nutrition. Optional health context is progressively disclosed:

1. **Home:** the next workout, one concise daily brief, a short check-in, weekly consistency, and today’s nutrition.
2. **Health / Today:** activity, sleep, recovery context, and connected-health status.
3. **Health / Training:** strength trends and muscle balance for athletes who want depth.
4. **Health / Body:** weight trends and optional body-composition measurements.
5. **Health / Recovery:** sleep, resting heart rate, HRV, device readiness, and self-reported state.

There are still five primary destinations—Home, Workout, Nutrition, Health, and Profile. This keeps navigation learnable while giving the old Progress destination a broader, more useful purpose. Scores remain context, never commands or diagnoses.

## Research translated into decisions

- [Oura’s current app structure](https://support.ouraring.com/hc/en-us/articles/360058599753-How-to-Use-the-Oura-App) emphasizes a dynamic Today view and moves deeper history behind focused destinations. LIMIT uses the same information principle, without copying UI or proprietary scoring.
- [WHOOP’s home-screen explanation](https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/) centers a few important signals before deeper views. LIMIT’s daily brief is similarly concise and retains the user’s own check-in alongside device data.
- [Hevy’s feature guide](https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2025-Features-Guide) reinforces fast logging, reusable routines, history, and wearable convenience. LIMIT preserves training as the strongest workflow instead of letting general wellness dilute it.
- [MacroFactor’s dashboard guide](https://help.macrofactorapp.com/en/articles/22-get-to-know-your-dashboard) uses restrained summaries with optional detail. LIMIT keeps nutrition focused on today and does not manufacture unsupported predictions.
- [Apple HealthKit](https://developer.apple.com/documentation/healthkit) and [Android Health Connect](https://developer.android.com/health-and-fitness/guides/health-connect/data-and-data-types/data-types) are permissioned device-health repositories. They are the preferred mobile ingestion layer for watches, rings, scales, and fitness apps.
- [Oura’s API scopes](https://cloud.ouraring.com/docs/authentication), [WHOOP’s API](https://developer.whoop.com/api/), [Garmin Health](https://developer.garmin.com/gc-developer-program/health-api/), and [Withings developer resources](https://support.withings.com/hc/en-us/articles/13364594339217-Withings-Developer-Resources) show that direct cloud integrations need separate OAuth, approvals, credentials, consent, and support. They are later provider adapters, not browser-only promises.
- Open-source projects were architecture references only: [VitaSync](https://github.com/biosync-io/vitasync) demonstrates normalized provider records and idempotent imports; [openScale](https://github.com/oliexdev/openScale) demonstrates optional body-metric visibility; [wger](https://github.com/wger-project/wger) demonstrates the breadth of training data. Their copyleft code and formulas were not copied.

## Integration architecture

The web application defines a small `window.limitHealthBridge` contract for status, connection, sync, and optional disconnection. A future iOS or Android container must implement permission requests and reads using HealthKit or Health Connect. No such native implementation is included in this repository. Connection actions are available only when the required bridge methods exist; installing the website alone does not enable device-health access.

Imported rows are normalized into `HealthMetric` and retain supplied source, source record ID, device, timestamps, and aggregation type. Supported metric units are converted to the app's canonical units: pounds, inches, miles, and minutes where applicable. Imports match existing records by provider, source record ID, and metric; unchanged records are not rewritten. The complete payload and existing identities are checked before measurement writes begin. Network failures can still leave a partial import, so retries reuse these identities. Mutations are serialized within the running app and interrupted when the account changes; this is not a cross-device transaction or a database uniqueness guarantee.

Daily displays select one record per metric instead of summing overlapping phone/watch/app totals. Automatic selection gives a deliberate manual entry priority, then platform health hubs, then other sources. An optional member-selected source takes precedence when it has a reading for that day; otherwise automatic selection applies. Timestamps and a deterministic tie-break resolve equivalent-priority records. Proprietary readiness or sleep scores retain their source labels rather than becoming a LIMIT medical or recovery score.

`HealthConnection` stores displayable connection status, capabilities, device names, and sync context—not access or refresh tokens. `HealthImport` records import status, timestamps, and counts without duplicating measurement payloads. A missing, invalid, or old sync timestamp is surfaced rather than presented as current. This is foreground sync support, not a background-sync scheduler. Provider secrets and direct OAuth adapters belong server-side when those integrations are approved.

`DailyCheckIn` keeps the non-device experience useful and lets subjective state sit beside device estimates. `HealthPreference` stores optional metric visibility and preferred sources. Hiding a metric changes health-summary presentation; it does not revoke a device permission or erase its records.

## Implemented in this product pass

- Normalized health metric, daily check-in, connection, preference, and import-history schemas with per-user rules.
- HealthKit/Health Connect bridge contract, strict numeric/date/unit validation, retry-safe identity matching, provenance, and duplicate-source selection. This supplies the web side of a future integration, not a working native connector.
- Health hub with Today, Training, Body, and Recovery sections; selected-date navigation supports earlier entries, and legacy Progress links continue to resolve. Training history loads only in Training rather than blocking the everyday health view.
- Optional activity, sleep, and heart logging in small grouped forms. Existing manual entries prefill for the selected day; only edited, nonblank values are saved. Daily check-ins can be edited or cleared without creating duplicate daily entries.
- Body logging for weight, body fat, waist, lean mass, muscle mass, body water, fat mass, bone mass, visceral-fat rating, and hips. Less common fields are disclosed on demand. Manual and imported weight readings share one source-aware trend, and the latest body cards show the actual measurement date rather than substituting profile starting weight.
- Seven-night sleep history, source-labelled recovery signals, and additional recorded daily metrics behind optional detail. Missing readings are not invented, and logged zero values remain distinct from missing data.
- Health settings for metric visibility, optional source preference, connection status, recent import history, and confirmed health-only deletion. Device disconnection uses the bridge only when that capability exists; otherwise the user is directed to device settings.
- Health-only deletion covers `HealthMetric`, `DailyCheckIn`, `HealthConnection`, `HealthImport`, `WeightEntry`, and legacy `BodyMeasurement` records. It checks the signed-in owner and verifies those collections are empty before reporting success. It preserves workouts, nutrition, profile information/goals, and health preferences; it does not erase device records or revoke device permissions.
- Shorter Home hierarchy and daily brief, with independent health/nutrition failure states and preserved workout access. Hidden health metrics are excluded from health-summary copy as well as cards.
- Profile settings grouped into Appearance, Connected health, About you, Training, Nutrition, and Account. One section is open at a time; unsaved changes remain while switching sections, and save feedback stays accessible. Existing light, dark, and device-matched themes remain available.
- All five new personal-health collections are included in the shared account export and account-erasure inventory. These code paths verify record operations; they do not prove removal from vendor backups, service logs, uploaded files, or external health stores.

## Next native and commercial stages

These are deliberately not faked in this web repository:

1. Implement the bridge in the generated iOS and Android shells, request the minimum metric permissions at the moment of connection, and test denial/revocation/partial access on physical devices.
2. Decide whether direct Oura, WHOOP, Garmin, Fitbit, or Withings cloud adapters add enough value beyond the platform health hubs. Each needs server-side token storage, webhook/retry handling, provider approval, and a disconnect/delete path.
3. Implement and test platform-appropriate background delivery, incremental cursors, and sample-to-daily aggregation in the native/provider layer. The web display chooses a single daily value; it does not aggregate raw streams or run background device reads.
4. Verify deployed per-user access, partial-import retries, health-only deletion, and account export with disposable accounts and real provider data. Source-level checks and synthetic browser tests are not proof of live tenant isolation or real-device sync.
5. Validate the generated wrapper’s accessibility, offline behavior, privacy manifests, purpose strings, and real-device performance before making availability claims. Retain the separate [launch-readiness](launch-readiness.md) and [privacy-review](privacy-data-inventory.md) gates for commercial and distribution claims.

## Product guardrails

- No required wearable, ring, scale, or daily score.
- No diagnosis, treatment advice, unexplained composite score, or shame-based streak copy.
- No selling health data, advertising use, or AI use without a separate explicit decision and consent flow.
- No double counting overlapping sources.
- No copying competitor visuals, copy, training libraries, or licensed formulas.
- Every empty, denied, disconnected, stale, and retry state must remain useful.
