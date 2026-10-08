# One-week workout day adjustments

The seven `WorkoutDay` rows remain the recurring template. A server-owned
`WorkoutScheduleChange` stores one move or swap between two local dates in the
current week. The schedule and home views apply that override only to those
dates. Workout sessions and completed history keep their original day IDs.

The account coordinator serializes change and undo commands with workout
commands. The server verifies the active plan, owned day rows, same-week future
dates, destination type, and absence of sessions or another override on either
date. Coach-provided, structure-locked, track-only, fixed, and coach-mandated
dates cannot be changed. Undo is available while both dates are still upcoming
and untouched. The UI previews the move or swap before confirmation and labels
affected schedule rows “THIS WEEK.”

Migration `0002_workout_schedule_change.sql` must be applied before deploying
this code. Existing programs and history need no conversion. The override is
included in account export and removed by account deletion.
