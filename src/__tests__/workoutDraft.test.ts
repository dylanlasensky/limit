import { beforeEach, describe, expect, it } from "vitest";
import {
  initialRows,
  readDraft,
  writeDraft,
  validateSet,
  draftKey,
  type WorkoutSetRow,
} from "@/components/workout/workoutDraft";
const template = { id: "we", exerciseId: "e", exerciseName: "Squat", sets: 1 };
const saved = {
  id: "s",
  workoutExerciseId: "we",
  setNumber: 1,
  weight: 100,
  reps: 5,
  completed: true,
  revision: "server-v2",
};
const local: WorkoutSetRow = {
  key: "we:1",
  workoutExerciseId: "we",
  exerciseId: "e",
  exerciseName: "Squat",
  primaryMuscle: "Quads",
  setNumber: 1,
  weight: "110",
  reps: "5",
  rir: "",
  completed: true,
  pending: true,
  savedId: "s",
  revision: "server-v1",
  operationId: "local-v3",
};
describe("workout draft recovery", () => {
  beforeEach(() => localStorage.clear());
  it("keeps stale draft revisions so the server detects conflicts", () => {
    const [row] = initialRows([template], {}, [saved], [local]);
    expect(row.weight).toBe("110");
    expect(row.revision).toBe("server-v1");
    expect(row.pending).toBe(true);
  });
  it("recognizes a saved operation whose response was lost", () => {
    const [row] = initialRows([template], {}, [{ ...saved, revision: local.operationId }], [local]);
    expect(row.pending).toBe(false);
    expect(row.revision).toBe(local.operationId);
  });
  it("uses the server for already synced rows", () => {
    expect(initialRows([template], {}, [saved], [{ ...local, pending: false }])[0].weight).toBe(
      "100"
    );
  });
  it("keeps removed unsaved rows as hidden tombstones across reloads", () => {
    expect(
      initialRows(
        [template],
        {},
        [],
        [{ ...local, savedId: null, pending: false, removed: true }]
      )[0].removed
    ).toBe(true);
  });
  it("namespaces drafts by account and restores them", () => {
    const key = draftKey("a", "day");
    writeDraft(key, { session: { id: "session" } }, [local]);
    expect(readDraft(key)?.rows[0].weight).toBe("110");
    expect(readDraft(draftKey("b", "day"))).toBeNull();
  });
  it.each(["garbage", '{"rows":[null]}', '{"rows":[{"key":"a","setNumber":999}]}'])(
    "ignores malformed drafts: %s",
    (value) => {
      localStorage.setItem("draft", value);
      expect(readDraft("draft")).toBeNull();
    }
  );
  it.each([
    { weight: "", reps: "5", rir: "" },
    { weight: "-1", reps: "5", rir: "" },
    { weight: "Infinity", reps: "5", rir: "" },
    { weight: "25", reps: "1.5", rir: "" },
    { weight: "25", reps: "0", rir: "" },
    { weight: "25", reps: "5", rir: "11" },
    { weight: "25", reps: "5", rir: "1.5" },
  ])("rejects invalid sets: %j", (row) => expect(validateSet(row)).toBeTruthy());
  it("accepts bodyweight sets and optional RIR", () => {
    expect(validateSet({ weight: "0", reps: "8", rir: "" })).toBeNull();
    expect(validateSet({ weight: "25", reps: "8", rir: "10" })).toBeNull();
  });
});
