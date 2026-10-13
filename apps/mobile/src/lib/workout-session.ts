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
  const localRows = [...cachedRows, ...excludedRows].filter(
    (row, index, all) =>
      (row.pending || (!row.completed && [row.weight, row.reps, row.rir].some((v) => v !== ""))) &&
      all.findIndex((other) => other.operationId === row.operationId) === index
  );
  const selected = new Set<string>();
  const acknowledged = (row: WorkoutRow) =>
    savedSets.some(
      (saved) =>
        saved.workoutExerciseId === row.workoutExerciseId &&
        saved.setNumber === row.setNumber &&
        saved.revision === row.operationId
    );
  const rows = exercises.flatMap((exercise) =>
    Array.from({ length: limits?.get(exercise.id) ?? exercise.sets ?? 3 }, (_, i) => {
      const setNumber = i + 1;
      const saved = savedSets.find(
        (set) => set.workoutExerciseId === exercise.id && set.setNumber === setNumber
      );
      const local = localRows.find(
        (row) =>
          row.workoutExerciseId === exercise.id &&
          row.setNumber === setNumber &&
          !acknowledged(row) &&
          (!saved || (row.pending && row.revision === (saved.revision || "")))
      );
      if (local) {
        selected.add(local.operationId);
        return local;
      }
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
  // Keep both outside-budget input and conflicting local versions until explicit discard.
  // An allowed slot may be restored from either the active cache or this retained list.
  const excluded = localRows.filter((row) => !selected.has(row.operationId) && !acknowledged(row));
  return { exercises, rows, excludedRows: excluded };
}
