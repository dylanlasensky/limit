import { ownerFilter } from "./workoutAccess.js";
import { calculateMuscleRating, snapshotPayload } from "./muscleRating.ts";
const e1rm = (r) => +r.weight * (+r.reps === 1 ? 1 : 1 + +r.reps / 30);
export function validSet(r) {
  return (
    r.completed === true &&
    Number.isFinite(+r.weight) &&
    +r.weight >= 0 &&
    +r.weight <= 2500 &&
    Number.isInteger(+r.reps) &&
    +r.reps > 0 &&
    +r.reps <= 100
  );
}
export function personalBests(sets, records) {
  const prs = [];
  for (const name of new Set(
    sets
      .filter(validSet)
      .filter((r) => r.setType !== "warmup")
      .map((r) => r.exerciseName)
  )) {
    const rows = sets.filter(
      (r) => validSet(r) && r.exerciseName === name && r.setType !== "warmup"
    );
    const heavy = rows.reduce((a, b) => (+a.weight >= +b.weight ? a : b));
    const lowRep = rows.filter((r) => +r.reps <= 12 && +r.weight > 0);
    const best = lowRep.length ? lowRep.reduce((a, b) => (e1rm(a) >= e1rm(b) ? a : b)) : null;
    for (const [type, row, value] of [
      ["weight", heavy, +heavy.weight],
      ["e1rm", best, best ? Math.round(e1rm(best)) : 0],
    ]) {
      if (!row || value <= 0) continue;
      const old = records
        .filter(
          (r) =>
            r.type === type &&
            (r.exerciseId && row.exerciseId
              ? r.exerciseId === row.exerciseId
              : r.exerciseName === name)
        )
        .sort((a, b) => b.value - a.value)[0];
      if (!old || value > old.value)
        prs.push({
          exerciseName: name,
          exerciseId: row.exerciseId,
          type,
          value,
          weight: +row.weight,
          reps: +row.reps,
          previous: old?.value ?? null,
          existingId: old?.id ?? null,
        });
    }
  }
  return prs;
}
// The UI and persisted snapshots must use exactly the same scoring model.
export function makeRating(sets, exercises, profile, weights, sessions) {
  const completed =
    sessions ||
    [...new Set(sets.map((row) => row.workoutSessionId))].map((id) => ({
      id,
      status: "completed",
    }));
  const rating = calculateMuscleRating({ sets, exercises, profile, weights, sessions: completed });
  const { date, workoutSessionId, ...snapshot } = snapshotPayload(rating);
  return snapshot;
}
export async function finishAnalytics(client, user, session, profile, assertLock) {
  const db = client.asServiceRole.entities,
    filter = ownerFilter(user.id),
    summary = session.completionSummary;
  for (const pr of summary.prs) {
    await assertLock();
    const records = await db.PersonalRecord.filter(
      { ...filter, exerciseName: pr.exerciseName, type: pr.type },
      "-value",
      100
    );
    const old = records.find((r) => !r.exerciseId || r.exerciseId === pr.exerciseId);
    if (old && old.value >= pr.value) continue;
    const payload = {
      ownerId: user.id,
      workoutSessionId: session.id,
      exerciseId: pr.exerciseId,
      exerciseName: pr.exerciseName,
      type: pr.type,
      value: pr.value,
      weight: pr.weight,
      reps: pr.reps,
      date: session.date,
    };
    if (old) await db.PersonalRecord.update(old.id, payload);
    else await db.PersonalRecord.create(payload);
  }
  const existing = await db.MuscleRatingSnapshot.filter(
    { ...filter, workoutSessionId: session.id },
    "created_date",
    1
  );
  let snapshot = existing[0],
    changes = summary.ratingChanges || [];
  if (!snapshot) {
    const [sessions, exercises, weights, previous] = await Promise.all([
      db.WorkoutSession.filter({ ...filter, status: "completed" }, "-date", 100),
      db.Exercise.list(null, 500),
      db.WeightEntry.filter({ created_by_id: user.id }, "-date", 1),
      db.MuscleRatingSnapshot.filter(filter, "-date", 1),
    ]);
    const sets = await db.ExerciseSet.filter(
      { ...filter, workoutSessionId: { $in: sessions.map((s) => s.id) }, completed: true },
      "-timestamp",
      2000
    );
    const rating = makeRating(sets, exercises, profile, weights, sessions);
    changes = Object.entries(rating.muscleScores)
      .map(([name, to]) => [name, previous[0]?.muscleScores?.[name], to])
      .filter(([, from, to]) => from != null && to > from)
      .slice(0, 4);
    await assertLock();
    snapshot = await db.MuscleRatingSnapshot.create({
      ...rating,
      date: session.completedAt,
      ownerId: user.id,
      workoutSessionId: session.id,
    });
  }
  await assertLock();
  const updated = { ...summary, ratingChanges: changes, analyticsPending: false };
  await db.WorkoutSession.update(session.id, {
    analyticsStatus: "complete",
    completionSummary: updated,
  });
  return updated;
}
