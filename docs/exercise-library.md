# LIMIT exercise library

## Scope and research

Reviewed September 14, 2026. This release adds a versioned, curated catalog of 365 distinct repetition-based movements: 326 strength/accessory exercises and 39 athletic-power exercises. It covers presses, flys, rows, vertical pulls, shoulder work, elbow flexion/extension, forearms, squats, leg presses, lunges/steps, hinges, knee curls/extensions, glute work, hip abduction/adduction, calves, tibialis, trunk work, weightlifting derivatives, jumps, and medicine-ball work. Equipment variations are separate only where setup or loading meaningfully differs.

Research informed coverage and separation of training purposes, not a claim of endorsement or clinical review:

- [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/): cross-checked muscle, equipment, and experience-level coverage, including frequently omitted accessory groups.
- [ACSM 2026 resistance-training guidance](https://acsm.org/resistance-training-guidelines-update-2026/): supports individualized, consistent resistance training using a range of equipment. General lifting and sport-specific programming are different needs.
- [NSCA clean variations and progressions](https://www.nsca.com/education/articles/nsca-coach/clean-variations-progressions-and-application/): distinguishes weightlifting pulls, catches, and progressions rather than treating every power exercise as a bodybuilding variation.
- [NSCA plyometric exercises](https://www.nsca.com/education/articles/kinetic-select/plyometric-exercises/): supports treating jumping and landing as progressively learned athletic skills.

Names are common exercise terminology. All short cues are original LIMIT wording, with shared movement-family guidance plus variation-specific notes. No source descriptions, photographs, or videos are copied. Difficulty is a conservative product classification, not a medical clearance or a guarantee of suitability. Muscle attribution is an organizational aid, not an exclusive activation claim. Rep-range metadata is a reference default, not an individualized prescription.

## Deliberate boundaries

This is broad gym resistance-training coverage, not literally every possible exercise. Continuous cardio, timed isometric holds, distance-based carries/sleds, rehabilitation prescriptions, and arbitrary tempo/grip combinations are not mislabeled as ordinary rep exercises. The current logger records pounds and repetitions; time/distance support needs its own data model. Users can still preserve unmatched coach exercises through the existing import flow, but should not encode seconds or meters as reps.

Power exercises remain available for search and coach-program imports, but never enter automatically generated general lifting plans. Advanced variants are also excluded from generated plans. Power entries have prominent coaching guidance, no automatic bodybuilding progression suggestion, no estimated-one-rep-max PR, and no load-derived muscle-level score. Logged load records remain possible; jump height, distance and power output are not inferred.

## Data and release behavior

- `base44/shared/exerciseCatalog.js` is the curated source of truth. Every entry has a stable key, version, primary/supporting muscles, equipment, aliases, difficulty, movement family, focus, original cues and generation eligibility.
- Production deployment installs Deno, then runs `scripts/seed-exercises.mjs` through authenticated `base44 exec`. Only the public Exercise entity is touched. GitHub production deploy concurrency serializes the seed.
- The seed adds missing entries and enriches recognized existing names/aliases only when equipment matches. It preserves existing IDs, display names, muscle attribution, rep ranges, programs, logs and custom records. It never deletes records. Existing metadata is updated only when the catalog version advances; new versioned catalog entries carry complete metadata.
- Writes are batched; a partial run can be retried. A final read checks that every curated key exists. Migration failure fails the release job visibly. Unmatched existing records stay visible, so the total can exceed 365.
- UI, import, planner, live logger and completion analytics page through the entire Exercise collection. A repeated page raises a visible error rather than presenting a silently truncated library. The browser never invents database IDs.
- Search supports aliases, muscle names and equipment. Muscle filtering includes supporting muscles and says so. Large lists reveal 40 rows at a time. Filters, loading, error, retry and empty states are accessible on small screens.
- Import normalization preserves equipment words. Only unambiguous exact name/alias matches are automatic; uncertain variants retain the original prescription for review. The entire library is searchable while choosing a match.
- Replacements retain muscle, category and known movement family, respect equipment, and do not silently escalate to advanced or power movements. The backend enforces these constraints too.

## Maintenance

Before adding an entry, check normalized names and aliases for duplicates, verify that the logger can represent its measurement, write a specific setup note, and test its selection behavior. Never change a stable key just to rename an exercise. Bump an entry's catalog version to ship corrected metadata. Do not run competing manual seeds; use the serialized production workflow. Exercise-specific videos or clinical guidance require licensed content and qualified review.

The visual refinement preserves navigation, muscle-map geometry and charcoal/blue identity. Softer blue with contrasting button text, sentence-case headings and quieter labels make the presentation more welcoming without assigning colors or training styles to gender.

Base44 may recreate JavaScript auth templates during repository sync. Vite explicitly resolves maintained TypeScript modules first, and a regression guard verifies this priority. Generated templates are retained rather than repeatedly deleted and regenerated.
