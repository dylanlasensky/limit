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
  draftEdited?: boolean;
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
  const hasLocalInput = (row: WorkoutRow) => {
    if (row.pending) return true;
    if (row.completed) return false;
    if (row.draftEdited !== undefined) return row.draftEdited;
    if (![row.weight, row.reps, row.rir].some((value) => value !== "")) return false;
    // Older drafts have no edit-intent marker. Recognize an unchanged saved snapshot,
    // but conservatively retain values when their previous server state is unavailable.
    const saved = savedSets.find(
      (set) => set.workoutExerciseId === row.workoutExerciseId && set.setNumber === row.setNumber
    );
    return (
      !saved ||
      row.savedId !== saved.id ||
      row.revision !== (saved.revision || "") ||
      row.weight !== (saved.weight?.toString() || "") ||
      row.reps !== (saved.reps?.toString() || "") ||
      row.rir !== (saved.rir?.toString() || "") ||
      row.exerciseId !==
        (saved.exerciseId ||
          template.find((item) => item.id === row.workoutExerciseId)?.exerciseId ||
          "")
    );
  };
  const localRows = [...cachedRows, ...excludedRows].filter(
    (row, index, all) =>
      hasLocalInput(row) &&
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
          (!saved ||
            (row.revision === (saved.revision || "") && (row.pending || row.savedId === saved.id)))
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
        draftEdited: false,
      } satisfies WorkoutRow;
    })
  );
  // Keep both outside-budget input and conflicting local versions until explicit discard.
  // An allowed slot may be restored from either the active cache or this retained list.
  const excluded = localRows.filter((row) => !selected.has(row.operationId) && !acknowledged(row));
  return { exercises, rows, excludedRows: excluded };
}
