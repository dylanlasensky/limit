# Personalized routine generation

Reviewed September 15, 2026. These are explainable starting-plan heuristics, not a guarantee of an individually perfect routine, medical clearance, or sport-specific coaching.

## Catalog and constraints

New onboarding plans and explicit Profile rebuilds load the entire paginated saved Exercise collection, enrich catalog metadata, and retain real database IDs. The deployed catalog contains 365 movements. Reference-only browsing entries never receive invented IDs or enter saved plans. Power, advanced/coaching-required variants, and time/distance-only exercises are not automatically prescribed in the repetition-based logger. They remain available through the existing appropriate manual/coach workflows.

The planner considers goal, experience, actual selected weekdays, time allowance, equipment, and up to three muscle priorities. It does not infer suitability from gender or body weight. Availability takes precedence over an old day-count field. Weekday arrangements minimize adjacent-day movement overlap, including the Sunday/Monday boundary, without moving the user's selected days. Some schedules necessarily constrain frequency/recovery; explanations disclose this.

Equipment matching uses exact supported labels and legacy aliases. Dumbbells do not imply a bench, a barbell does not imply a rack, and a cable machine does not mean every machine. Mixed legacy full-gym/default selections prefer the specifically selected equipment. Unknown or missing equipment never silently unlocks a full gym. Setup requirements are conservative name-based rules, not a complete physical assessment of every gym.

## Programming and usability

- Core movement slots distinguish presses, horizontal/vertical pulls, squat/lunge patterns and hinges. Equipment-limited fallback patterns are allowed deliberately; missing back/hamstring coverage is disclosed in the saved plan description.
- Day variants stay among similarly suitable exercises and remain deterministic between regenerations. Different days can vary; each week's prescription stays stable enough to practice and track progress.
- Priority work comes before general accessories, rotates across suitable days, and receives set allocation before discretionary non-priority volume. It cannot override safe equipment constraints or create time that is not available.
- Sessions first allocate two working sets to selected movements, then distribute additional sets within goal/experience targets. Daily total-set caps are 14/18/22 for beginner/intermediate/advanced, with direct-group caps of 6/8 and the two back regions grouped together. These caps are conservative product defaults, not clinical thresholds. Higher-frequency beginner plans stay at two sets per exercise.
- Estimated duration includes preparation/warm-up time, station changes, controlled repetitions, both sides for unilateral exercises, and prescribed rest between sets. The planner removes optional work before exceeding the allowance; it does not shorten rests to pack in exercises. Actual time and recovery will vary.
- Notes explain effort in plain language (leave a few clean reps available); an optional disclosure explains gradual progression. Bodyweight prescriptions use a moderate rep range and scalable-variation guidance rather than implying a known starting strength or requiring a maximum test.
- One recommended plan remains the default. Additional equipment, muscle priorities in Profile, plan rationale, and progression details use optional disclosures instead of new mandatory setup steps.

## Evidence informing the heuristics

[ACSM's 2026 guidance](https://www.acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf) emphasizes consistent training that fits the person, repeated weekly major-muscle exposure, gradual progression, heavier loading for strength, and sufficient weekly volume for hypertrophy. These population-level findings do not identify a universal individual optimum. The implementation does not require failure training or advanced techniques.

[Ramos-Campo et al., 2024](https://pubmed.ncbi.nlm.nih.gov/38595233/) found similar strength and hypertrophy outcomes for split versus full-body routines when volume was equated. Split scoring here is therefore a practical schedule/adherence heuristic, not proof that one branded split is superior.

[Iversen et al., 2021](https://pubmed.ncbi.nlm.nih.gov/34125411/) informs the emphasis on meaningful pushing, pulling and lower-body work when time is short. The app's exact duration estimates, ranking weights, set caps, and equipment rules are engineering choices and are tested as such.

Injuries, disability, pregnancy, sport calendars, rehabilitation needs and measured individual recovery are not captured by this generator. Athletes needing specialized power or competition programming should use a qualified coach's routine through the existing import flow. No existing user's plan is automatically rebuilt by this release.

## Safe saves and regression coverage

Generation happens before writes. Plans are created inactive. The client validates all seven returned weekdays and each saved exercise's ID, ordering, dosage and guidance, including out-of-order API responses. Only a complete graph is sent to server-side activation, which serializes changes against active workouts. A failed build leaves the previous active plan available; failed inactive drafts can remain for diagnosis and do not become the active plan.

Tests cover the full saved catalog past page 500, real database identifiers, every supported goal/experience/day-count/time combination across common equipment profiles, priority differences, duration/set limits, equipment dependencies, movement balance, legacy aliases, corrupted/partial saves, and new-user onboarding plus retry at four browser sizes. These checks establish software invariants, not proof of individual physiological outcomes.
