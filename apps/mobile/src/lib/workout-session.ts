import type { SavedRecord } from "../../../../packages/contracts/entities";

export type WorkoutRow = {
  workoutExerciseId: string;
  exerciseId: string;
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
  operationId: string;
  revision: string;
  savedId?: string;
  pending: boolean;
};

// The session's saved budget is authoritative. WorkoutExercise remains the reusable template.
export function scopeWorkoutSession(
  session: SavedRecord<"WorkoutSession">,
  template: SavedRecord<"WorkoutExercise">[],
  savedSets: SavedRecord<"ExerciseSet">[],
  cachedRows: WorkoutRow[] = [],
  excludedRows: WorkoutRow[] = [],
  operationId: () => string
) {
  const limits = session.timeBudget
    ? new Map(session.timeBudget.exercises.map((item) => [item.id, item.sets]))
    : null;
  const exercises = template
    .filter((exercise) => !limits || limits.has(exercise.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const allowed = new Set<string>();
  const rows = exercises.flatMap((exercise) =>
    Array.from({ length: limits?.get(exercise.id) ?? exercise.sets ?? 3 }, (_, i) => {
      const setNumber = i + 1;
      allowed.add(`${exercise.id}:${setNumber}`);
      const cached = cachedRows.find(
        (row) => row.workoutExerciseId === exercise.id && row.setNumber === setNumber
      );
      const saved = savedSets.find(
        (set) => set.workoutExerciseId === exercise.id && set.setNumber === setNumber
      );
      if (cached?.pending) return cached;
      return {
        workoutExerciseId: exercise.id,
        exerciseId: saved?.exerciseId || exercise.exerciseId || "",
        setNumber,
        weight: saved?.weight?.toString() || "",
        reps: saved?.reps?.toString() || "",
        rir: saved?.rir?.toString() || "",
        completed: saved?.completed || false,
        operationId: operationId(),
        revision: saved?.revision || "",
        savedId: saved?.id,
        pending: false,
      } satisfies WorkoutRow;
    })
  );
  const excluded = [...excludedRows, ...cachedRows].filter(
    (row, index, all) =>
      row.pending &&
      !allowed.has(`${row.workoutExerciseId}:${row.setNumber}`) &&
      all.findIndex((other) => other.operationId === row.operationId) === index
  );
  return { exercises, rows, excludedRows: excluded };
}
