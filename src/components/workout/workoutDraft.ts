export interface WorkoutSetRow {
  key: string;
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  setNumber: number;
  weight: string;
  reps: string;
  rir: string | number;
  completed: boolean;
  savedId: string | null;
  revision: string;
  pending: boolean;
  operationId?: string;
  removed?: boolean;
}

export type EditableSetField = "weight" | "reps" | "rir";

export function validateSet(row: Pick<WorkoutSetRow, "weight" | "reps" | "rir">): string | null {
  if (
    !String(row.weight).trim() ||
    !Number.isFinite(+row.weight) ||
    +row.weight < 0 ||
    +row.weight > 2500 ||
    !String(row.reps).trim() ||
    !Number.isInteger(+row.reps) ||
    +row.reps < 1 ||
    +row.reps > 100
  ) {
    return "Enter a weight from 0–2,500 lb and whole reps from 1–100.";
  }
  if (
    row.rir !== "" &&
    row.rir != null &&
    (!Number.isInteger(+row.rir) || +row.rir < 0 || +row.rir > 10)
  ) {
    return "Reps in reserve must be a whole number from 0–10, or left blank.";
  }
  return null;
}

export interface WorkoutDraftState {
  day?: any;
  plan?: any;
  workoutExercises?: any[];
  exercisesById?: Record<string, any>;
  previousByExercise?: Record<string, any[]>;
  session?: any;
}

export interface WorkoutDraft extends WorkoutDraftState {
  rows: WorkoutSetRow[];
}

export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const draftKey = (userId: string, workoutDayId: string) =>
  `limit-workout-v2:${userId}:${workoutDayId}`;
export function readDraft(key: string): WorkoutDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value &&
      Array.isArray(value.rows) &&
      value.rows.every(
        (row: any) =>
          row &&
          typeof row.key === "string" &&
          typeof row.workoutExerciseId === "string" &&
          Number.isInteger(row.setNumber) &&
          row.setNumber > 0 &&
          row.setNumber <= 30
      )
      ? value
      : null;
  } catch {
    return null;
  }
}
export function writeDraft(key: string, state: WorkoutDraftState, rows: WorkoutSetRow[]) {
  localStorage.setItem(
    key,
    JSON.stringify({
      day: state.day,
      plan: state.plan,
      workoutExercises: state.workoutExercises,
      exercisesById: state.exercisesById,
      previousByExercise: state.previousByExercise,
      session: state.session,
      rows,
    })
  );
}
export function initialRows(
  workoutExercises: any[],
  exercisesById: Record<string, any>,
  savedSets: any[],
  draftRows: WorkoutSetRow[] = []
): WorkoutSetRow[] {
  const rows: WorkoutSetRow[] = [];
  for (const we of workoutExercises) {
    const saved = savedSets.filter(
      (s) =>
        s.workoutExerciseId === we.id ||
        (!s.workoutExerciseId && s.exerciseName === we.exerciseName)
    );
    const drafts = draftRows.filter((r) => r.workoutExerciseId === we.id);
    const count = Math.max(
      we.sets || 3,
      ...saved.map((s) => s.setNumber),
      ...drafts.map((r) => r.setNumber)
    );
    for (let number = 1; number <= count; number++) {
      const key = `${we.id}:${number}`,
        record = saved.find((s) => s.setNumber === number),
        draft = drafts.find((r) => r.key === key);
      if (draft?.removed && !record) {
        rows.push(draft);
        continue;
      }
      const row: WorkoutSetRow = {
        key,
        workoutExerciseId: we.id,
        exerciseId: we.exerciseId,
        exerciseName: we.exerciseName,
        primaryMuscle: exercisesById[we.exerciseId]?.primaryMuscle || "",
        setNumber: number,
        weight: record ? String(record.weight) : "",
        reps: record ? String(record.reps) : "",
        rir: record?.rir ?? "",
        completed: record?.completed === true,
        savedId: record?.id || null,
        revision: record?.revision || "",
        pending: false,
      };
      rows.push(
        draft &&
          (draft.pending || !record) &&
          !(draft.operationId && draft.operationId === record?.revision)
          ? {
              ...row,
              ...draft,
              savedId: record?.id || draft.savedId,
              // Preserve the base revision of an unsynced edit. Rebasing here
              // would turn a stale draft into an unnoticed remote overwrite.
              revision: draft.pending ? draft.revision || "" : record?.revision || "",
            }
          : row
      );
    }
  }
  return rows;
}
