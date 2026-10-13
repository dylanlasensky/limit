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
  it("restores uncompleted input after a relaunch without marking it ready to sync", () => {
    const unfinished = {
      workoutExerciseId: "lift-a",
      exerciseId: "exercise-a",
      setNumber: 1,
      weight: "0",
      reps: "17",
      rir: "3",
      completed: false,
      operationId: "unfinished-op",
      revision: "",
      pending: false,
    } satisfies WorkoutRow;
    const scoped = scopeWorkoutSession(session, template, [], [unfinished], [], () => "new-op");
    expect(scoped.rows).toEqual([unfinished]);
    expect(scoped.rows.filter((row) => row.pending)).toEqual([]);
  });
  it("shows a remotely saved set while retaining conflicting uncompleted local input", () => {
    const unfinished = {
      workoutExerciseId: "lift-a",
      exerciseId: "exercise-a",
      setNumber: 1,
      weight: "0",
      reps: "17",
      rir: "3",
      completed: false,
      operationId: "unfinished-op",
      revision: "",
      pending: false,
    } satisfies WorkoutRow;
    const scoped = scopeWorkoutSession(session, template, saved, [unfinished], [], () => "new-op");
    expect(scoped.rows).toMatchObject([
      { reps: "8", weight: "20", savedId: "saved-a", completed: true },
    ]);
    expect(scoped.excludedRows).toEqual([unfinished]);
  });
  const secondSlot = {
    workoutExerciseId: "lift-a",
    exerciseId: "exercise-a",
    setNumber: 2,
    weight: "0",
    reps: "17",
    rir: "3",
    completed: false,
    operationId: "second-slot-op",
    revision: "",
    pending: false,
  } satisfies WorkoutRow;
  const expanded = record<"WorkoutSession">({
    ...session,
    timeBudget: {
      ...session.timeBudget,
      exercises: [{ id: "lift-a", sets: 2 }],
    },
  });
  it("retains unfinished input excluded by a shortened budget across repeated hydration", () => {
    const shortened = scopeWorkoutSession(
      session,
      template,
      saved,
      [secondSlot],
      [],
      () => "new-op"
    );
    expect(shortened.excludedRows).toEqual([secondSlot]);
    const again = scopeWorkoutSession(
      session,
      template,
      saved,
      shortened.rows,
      shortened.excludedRows,
      () => "next-op"
    );
    expect(again.excludedRows).toEqual([secondSlot]);
  });
  it("retains an excluded pending conflict when another client expands and saves its slot", () => {
    const local = { ...secondSlot, completed: true, pending: true };
    const remote = record<"ExerciseSet">({
      ...saved[0],
      id: "saved-second",
      setNumber: 2,
      reps: 9,
      revision: "remote-second",
    });
    const resumed = scopeWorkoutSession(
      expanded,
      template,
      [...saved, remote],
      [],
      [local],
      () => "new-op"
    );
    expect(resumed.rows.find((row) => row.setNumber === 2)).toMatchObject({
      reps: "9",
      savedId: "saved-second",
    });
    expect(resumed.excludedRows).toEqual([local]);
  });
  it("restores a formerly excluded local row when its slot is allowed and has no saved set", () => {
    const local = { ...secondSlot, completed: true, pending: true };
    const resumed = scopeWorkoutSession(expanded, template, saved, [], [local], () => "new-op");
    expect(resumed.rows.find((row) => row.setNumber === 2)).toEqual(local);
    expect(resumed.excludedRows).toEqual([]);
  });

  it("retains each conflict once across repeated hydration and keeps active slots unique", () => {
    const local = { ...secondSlot, completed: true, pending: true };
    const remote = record<"ExerciseSet">({
      ...saved[0],
      id: "saved-second",
      setNumber: 2,
      revision: "remote-second",
    });
    const resumed = scopeWorkoutSession(
      expanded,
      template,
      [...saved, remote],
      [],
      [local, local],
      () => "new-op"
    );
    const again = scopeWorkoutSession(
      expanded,
      template,
      [...saved, remote],
      resumed.rows,
      resumed.excludedRows,
      () => "next-op"
    );
    expect(again.excludedRows).toEqual([local]);
    expect(new Set(again.rows.map((row) => row.workoutExerciseId + ":" + row.setNumber)).size).toBe(
      again.rows.length
    );
  });
  it("recognizes a pending operation already acknowledged by the server", () => {
    const local = { ...secondSlot, completed: true, pending: true };
    const remote = record<"ExerciseSet">({
      ...saved[0],
      id: "saved-second",
      setNumber: 2,
      reps: 17,
      revision: local.operationId,
    });
    const resumed = scopeWorkoutSession(
      expanded,
      template,
      [...saved, remote],
      [],
      [local],
      () => "new-op"
    );
    expect(resumed.rows.find((row) => row.setNumber === 2)).toMatchObject({
      reps: "17",
      pending: false,
      savedId: "saved-second",
    });
    expect(resumed.excludedRows).toEqual([]);
  });
  it("restores an excluded pending edit with a matching server revision", () => {
    const local = { ...secondSlot, completed: true, pending: true, revision: "prior-server" };
    const remote = record<"ExerciseSet">({
      ...saved[0],
      id: "saved-second",
      setNumber: 2,
      revision: "prior-server",
    });
    const resumed = scopeWorkoutSession(
      expanded,
      template,
      [...saved, remote],
      [],
      [local],
      () => "new-op"
    );
    expect(resumed.rows.find((row) => row.setNumber === 2)).toEqual(local);
    expect(resumed.excludedRows).toEqual([]);
  });
});
