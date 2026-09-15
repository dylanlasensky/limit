# LIMIT experience improvements — September 2026

## Direction

Keep LIMIT’s recognizable training/nutrition/progress structure while making the experience more welcoming, legible and useful in the gym. Dark appearance uses near-black surfaces, blue actions and restrained white text. Light appearance uses white cards, a pale neutral background, blue actions and dark text. Appearance is an explicit, persistent choice, with a device-matching option in settings. Layout, typography and hierarchy—not gender stereotypes—guide the refinement.

## Research translated into features

- **Find movements quickly.** [Hevy’s exercise library](https://www.hevyapp.com/features/exercise-library/) and [Fitbod’s workout editing](https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod) support search/filter patterns. LIMIT now adds clear full-catalog counts, body-area shortcuts, favorites, recent movements and sorting on top of muscle/equipment/experience/focus filters. The complete 365-movement reference catalog is available even before database synchronization.
- **Less work between sets.** [Hevy’s set logging](https://www.hevyapp.com/features/track-exercises/) provides previous-value shortcuts. LIMIT copies previous load/reps only into an editable, incomplete set; it does not mark it complete or carry forward perceived effort.
- **Practical lifting tools.** [Strong’s plate calculator](https://help.strongapp.io/article/169-plate-calculator) informed an inline calculator with separate lb/kg selection, editable bar weight, available plate sizes, per-side loading and honest handling of impossible target weights. Calculator units do not silently change the existing pound-based workout log.
- **Progress that means something.** [Boostcamp’s tracker](https://www.boostcamp.app/workout-tracker) emphasizes history and training analysis. LIMIT now foregrounds dated weekly activity from completed sessions, logged time, readable nutrition summaries and per-exercise record filtering rather than decorative rankings.
- **Approachable presentation.** [Nike Training Club](https://www.nike.com/ntc-app) combines athlete use with flexible, accessible training language. LIMIT’s copy and hierarchy were softened while retaining its existing identity. No competitor assets or marketing copy were imported.

These are design/product observations from official product pages, not claims that any feature guarantees retention or commercial results.

## Quality checks

[Apple’s Dark Mode guidance](https://developer.apple.com/design/human-interface-guidelines/dark-mode) supports semantic adaptable colors and separated base/elevated surfaces. Core foreground/background pairs are regression-tested at 4.5:1 or better, following [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Main interactive controls aim for 44px or more; this is a usability goal above the [24px WCAG AA minimum with exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), not a blanket accessibility certification.

Browser checks cover 320px, 390px, 430px and desktop widths, both appearances, full-library browsing with only 18 saved rows, favorites persistence, data-fetch failure/retry, previous-set copying and plate-calculator behavior. Tests use synthetic local data and never write to a real member’s workouts. Publication also verifies the persisted catalog separately in production and preview data environments.

## Deliberate boundaries

No billing, marketing launch, social feed, new tracking permissions or automatic replacement of a coach’s program is part of this change. Power movements remain separate from general hypertrophy recommendations. Device-only favorites are labeled as such. Full offline workout logging and cross-device favorites would require separate data/synchronization work; this update does not claim either.
