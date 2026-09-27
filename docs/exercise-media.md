# Exercise media

Every catalog exercise has a stable `catalogKey`, written instructions, and a media endpoint. The media schema includes poster/video keys, format, transcript, camera angle, duration, version, review status, reviewer, safety classification, license and text fallback. Only approved media is returned for public playback. Missing media uses a branded poster and catalog instructions; it never impersonates a demonstration.

There are currently 365 catalog movements and zero approved demonstration assets in the repository. No trainer review has been claimed. Priority production: squat, goblet squat, Romanian deadlift, bench press, push-up, dumbbell row, cable row, pulldown, overhead press, split squat, lunge, hip thrust, plank, dead bug, calf raise, curl and triceps pushdown. Follow with the rest of `packages/domain/exerciseCatalog.js`.

For each movement:

- Confirm the exact catalog key, equipment and variant.
- Obtain real, licensed video and permission for hosted playback.
- Film clear setup, start/end positions and two or three controlled repetitions.
- Select a useful camera angle and produce a static poster plus MP4/WebM.
- Record transcript, duration, license attribution and version.
- Have a qualified human review the exact asset and cues; record actual name/date/evidence. Never invent a reviewer.
- Upload immutable versioned objects to the environment's MEDIA R2 bucket.
- Validate the manifest with `packages/contracts/media.ts`, then save the D1 exercise_media row.
- Check reduced motion, pause/play, captions, layout, slow connection and text-only fallback at phone sizes.

Private uploads use FILES, with an 8 MB cap and content-signature checks. They are served only through authenticated `/api/uploads/:id` requests. Do not reuse private upload URLs for public exercise assets.
