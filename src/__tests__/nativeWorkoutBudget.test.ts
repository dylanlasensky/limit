import { describe, expect, it } from "vitest";
import { scopeWorkoutSession, type WorkoutRow } from "../../apps/mobile/src/lib/workout-session";
import type { SavedRecord } from "../../packages/contracts/entities";

const record = <N extends "WorkoutSession" | "WorkoutExercise" | "ExerciseSet">(value: object) =>
  value as SavedRecord<N>;

describe("native resume of a web-shortened workout", () => {
  const template = [
    record<"WorkoutExercise">({ id: "lift-a", order: 1, sets: 3, exerciseId: "exercise-a" }),
    record<"WorkoutExercise">({ id: "lift-b", order: 2, sets: 3, exerciseId: "exercise-b" }),
  ];
  const session = record<"WorkoutSession">({
    id: "session-a",
    timeBudget: {
      minutes: 30,
      estimatedMinutes: 28,
      exercises: [{ id: "lift-a", sets: 1 }],
    },
  });
  const saved = [
    record<"ExerciseSet">({
      id: "saved-a",
      workoutExerciseId: "lift-a",
      setNumber: 1,
      revision: "revision-a",
      weight: 20,
      reps: 8,
      completed: true,
    }),
  ];

  it("uses the saved session budget without changing reusable template sets", () => {
    const scoped = scopeWorkoutSession(session, template, saved, [], [], () => "new-op");
    expect(scoped.exercises.map((exercise) => exercise.id)).toEqual(["lift-a"]);
    expect(scoped.rows).toMatchObject([
      { workoutExerciseId: "lift-a", setNumber: 1, savedId: "saved-a", completed: true },
    ]);
    expect(scoped.rows.filter((row) => row.completed && row.savedId)).toEqual([
      expect.objectContaining({ savedId: "saved-a", revision: "revision-a" }),
    ]);
    expect(template.map((exercise) => exercise.sets)).toEqual([3, 3]);
  });

  it("keeps unsynced old-client rows locally until explicit discard", () => {
    const pending = {
      workoutExerciseId: "lift-b",
      exerciseId: "exercise-b",
      setNumber: 1,
      weight: "20",
      reps: "8",
      rir: "",
      completed: true,
      operationId: "old-client-op",
      revision: "",
      pending: true,
    } satisfies WorkoutRow;
    const scoped = scopeWorkoutSession(session, template, saved, [pending], [], () => "new-op");
    expect(scoped.rows).toHaveLength(1);
    expect(scoped.excludedRows).toEqual([pending]);
    expect(
      scopeWorkoutSession(
        session,
        template,
        saved,
        scoped.rows,
        scoped.excludedRows,
        () => "new-op"
      ).excludedRows
    ).toEqual([pending]);
  });
});
