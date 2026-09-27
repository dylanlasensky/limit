import { fail, owned, ownerFilter } from "./workoutAccess.js";

// Only fully saved programs can replace the current one. Serialize this with
// start/save/finish so changing plans cannot strand an in-progress workout.
export async function activatePlan(db, user, planId, assertLock) {
  if (typeof planId !== "string" || !planId) fail("Choose a saved program.");
  const plan = await db.WorkoutPlan.get(planId);
  if (!owned(plan, user.id)) fail("Program not found.", 404);
  const activeSessions = await db.WorkoutSession.filter(
    { ...ownerFilter(user.id), status: "active" },
    "-created_date",
    1
  );
  if (activeSessions.length)
    fail("Finish or discard your active workout before changing programs.", 409);
  const days = await db.WorkoutDay.filter({ planId }, "weekday", 100);
  if (
    days.length !== 7 ||
    days.some(
      (day) =>
        !owned(day, user.id) || !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6
    ) ||
    new Set(days.map((day) => day.weekday)).size !== 7
  )
    fail("This program’s schedule is incomplete. Please rebuild it.", 409);
  const training = days.filter((day) => !day.isRest);
  if (!training.length || training.length !== plan.daysPerWeek)
    fail("This program’s training days are incomplete.", 409);
  for (const day of training) {
    const rows = await db.WorkoutExercise.filter({ workoutDayId: day.id }, "order", 100);
    if (
      !rows.length ||
      rows.some(
        (row) =>
          !owned(row, user.id) ||
          !row.exerciseName?.trim() ||
          !Number.isInteger(row.sets) ||
          row.sets < 1 ||
          row.sets > 30 ||
          !Number.isInteger(row.repMin) ||
          row.repMin < 1 ||
          row.repMin > 100 ||
          !Number.isInteger(row.repMax) ||
          row.repMax < row.repMin ||
          row.repMax > 100
      )
    ) {
      fail("Every training day needs valid exercises, sets, and reps.", 409);
    }
  }
  const previous = await db.WorkoutPlan.filter(
    { ...ownerFilter(user.id), active: true },
    "-created_date",
    100
  );
  await assertLock();
  // Activation happens FIRST. A failed cleanup must never leave no usable plan.
  const activated = await db.WorkoutPlan.update(plan.id, { active: true });
  for (const old of previous) {
    if (old.id !== plan.id && owned(old, user.id)) {
      await assertLock();
      await db.WorkoutPlan.update(old.id, { active: false });
    }
  }
  return { plan: activated };
}
