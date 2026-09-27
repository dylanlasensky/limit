# Migration inventory

Source audit: 2026-09-27. This inventory tracks replacement behavior, not account migration.

## Data mapping

| Existing entity | Replacement |
| --- | --- |
| `BodyMeasurement` | D1 `body_measurement`; session-derived owner; validated data and relation keys |
| `DailyCheckIn` | D1 `daily_check_in`; session-derived owner; validated data and relation keys |
| `DietaryProfile` | D1 `dietary_profile`; session-derived owner; validated data and relation keys |
| `Exercise` | D1 `exercise`; public catalog read, seed-only writes |
| `ExerciseSet` | D1 `exercise_set`; session-derived owner; validated data and relation keys |
| `FoodEntry` | D1 `food_entry`; session-derived owner; validated data and relation keys |
| `GroceryList` | D1 `grocery_list`; session-derived owner; validated data and relation keys |
| `HealthConnection` | D1 `health_connection`; session-derived owner; validated data and relation keys |
| `HealthImport` | D1 `health_import`; session-derived owner; validated data and relation keys |
| `HealthMetric` | D1 `health_metric`; session-derived owner; validated data and relation keys |
| `HealthPreference` | D1 `health_preference`; session-derived owner; validated data and relation keys |
| `MealRecommendation` | D1 `meal_recommendation`; session-derived owner; validated data and relation keys |
| `MuscleRatingSnapshot` | D1 `muscle_rating_snapshot`; session-derived owner; validated data and relation keys |
| `PersonalRecord` | D1 `personal_record`; session-derived owner; validated data and relation keys |
| `User` | Better Auth identity/session/account tables |
| `UserProfile` | D1 `user_profile`; session-derived owner; validated data and relation keys |
| `WeeklyMealPlan` | D1 `weekly_meal_plan`; session-derived owner; validated data and relation keys |
| `WeightEntry` | D1 `weight_entry`; session-derived owner; validated data and relation keys |
| `WorkoutDay` | D1 `workout_day`; session-derived owner; validated data and relation keys |
| `WorkoutExercise` | D1 `workout_exercise`; session-derived owner; validated data and relation keys |
| `WorkoutPlan` | D1 `workout_plan`; session-derived owner; validated data and relation keys |
| `WorkoutSession` | D1 `workout_session`; session-derived owner; validated data and relation keys |

## Service mapping

| Existing capability | Replacement |
| --- | --- |
| Authentication SDK and generated templates | Better Auth handler and React client; fresh accounts |
| Entity queries and writes | Typed `/api/entities` contracts; D1 prepared statements and owner predicates |
| `workoutCommand` | Serialized account mutations; stable set operation IDs and conflict detection |
| `askLimitCoach` | Authenticated per-account Agents SDK instance and Workers AI; deterministic fallback |
| `parseWorkoutRegimen` | Validated import proposal; private R2 access and explicit review |
| `analyzeFoodPhoto` | Private upload analysis with explicit consent; manual entry fallback |
| `exportAccount` | Owner-scoped export, no-store response |
| `deleteAccount` | Private upload deletion, relational erasure and identity/session removal |
| Private uploads and signed URLs | R2 objects behind authenticated Worker routes |
| Vite platform plugin and injected environment | Standard React/Vite build; same-origin Worker API |
| Deployment workflow and seed script | Wrangler preview/production deployments; D1 migrations and repeatable catalog seed |
| Platform shared modules | `packages/domain` |
| Platform OAuth consent scaffold | Remove unused scaffold; providers belong to Better Auth |

## Audited source areas

`src/pages`, `src/components`, `src/hooks`, `src/lib`, API initialization, auth templates, all entity schemas, six backend functions, shared catalog/analytics, unit/browser tests, package/lock files, CI, release scripts and documentation were inventoried. No approved instructional videos were found. The approved logo remains the sole master.
