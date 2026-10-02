# Known limitations

Release acceptance is not complete until the release record confirms hosted checks.

- R2 is enabled with private preview/production buckets and conservative app usage caps. Account-wide activity outside LIMIT still shares the metered free allowance.
- Email verification and recovery require a verified Resend sender and secret. Local and hosted testing currently permit fresh unverified accounts; recovery requests return an explicit configuration error until enabled.
- The media inventory covers all 365 exercises: ten original generated schematics have technical checks, 355 renders are blocked with exact-key reasons, and zero have human fitness approval. All have written cues/posters. See the media checklist.
- Photo nutrition estimation is not enabled without an evaluated vision model. Manual food logging remains available. Text workout import supports pasted text and owned plain-text files; PDF OCR is not included.
- The coach deliberately limits model authority. It offers deterministic fitness guidance and validated routine proposals, never diagnosis, treatment or autonomous plan activation.
- Native health integrations, push notifications, subscriptions, App Store signing and physical-device acceptance are separate work. The Expo foundation must not be represented as an App Store release.
- Offline drafts live on the device. Clearing browser/app storage removes unsynced drafts. Account logout clears private local state. Cross-device concurrent edits fail visibly rather than overwrite silently.

- One unpatched native tooling advisory remains under the narrow exception expiring 2026-10-15; signed/OTA native releases remain blocked. Worker audit has no findings.
- Operator legal identity and approved store privacy/terms remain owner-deferred. The owner supplied `limitfitnessapp@gmail.com` as the private support contact; delivered transactional email still needs a verified sender/domain and separate keys. First-party data/export/deletion/disclosure pages describe current behavior honestly.
