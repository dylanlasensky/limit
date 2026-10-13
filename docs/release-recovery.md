# Workout and meal recovery follow-up

## Corrected behavior

- Native workout edits are locked while sets are syncing and throughout Finish. A synchronous guard also rejects queued change events. Finish rechecks pending rows and keeps the draft on failure; a response from an old account/navigation scope cannot remove the current draft. The delayed-save component regression fails against the prior workout screen and passes with this change.
- Load-step preferences use a validated `setLoadIncrement` command. The account coordinator reads the current owned profile and updates one catalog exercise, preserving other keys across clients and lost-response retries. The client no longer submits a stale whole map. Local Worker/D1 checks cover concurrent changes, retry, invalid values, unknown exercises and two-account isolation.
- Meal shortcuts validate the complete food payload before recording an uncertain write. Invalid portions remain editable. For an invalid marker left by an older client, retry first looks up its owner-scoped operation ID: a saved meal is acknowledged, an absent one is released for correction, and a failed lookup preserves the marker. Valid uncertain writes retain their original portions and operation ID.
- Invalid workout command values return HTTP 400 instead of being mislabeled as a server failure.

## Supported clients and remaining acceptance

The current web build and matching Expo source understand shortened-session budgets. Older clients' normal workout payloads remain accepted. Older installed builds that do not understand a saved shortened session cannot safely record excluded exercises; the API rejects those writes with an upgrade/web recovery message. This is an explicit compatibility limit, not proof of seamless old-client recovery.

Keep the old device's local storage until upgrading. The current Expo client retains excluded unsynced rows and requires explicit discard before finishing the shortened session. Do not tell users that switching to the web transfers unsynced native rows: it does not. A real prior-binary upgrade/recovery acceptance run is still required before distributing a native release.

The local Mac has Xcode 26.2. Expo SDK 57's current documentation requires Xcode 26.4 or newer. JavaScript exports and component tests do not establish native compilation, simulator launch, physical-device behavior or TestFlight acceptance. No paid build or toolchain upgrade was initiated by this follow-up.

Local regression evidence at the time of this follow-up: 544 unit tests across 70 files and 17 API assertions/tests including the parent lifecycle test. Final exact-head CI and hosted acceptance remain required before release.
