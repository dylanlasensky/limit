# Native release evidence

Expo is the native path. `release/app-store.json` records human-verified packaging, signing, privacy, accessibility and physical-device evidence. `npm run check:app-store` fails closed while evidence is incomplete. Web deployment does not establish App Store readiness.

See [native preparation and acceptance](native-acceptance.md). Dynamic Expo release configuration rejects missing owned identity, team, build number and source SHA. No store evidence is self-attested.
