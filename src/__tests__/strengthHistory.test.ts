import { describe, expect, it, vi } from "vitest";
import { exerciseCatalog } from "../../base44/shared/exerciseCatalog.js";
import {
  buildStrengthHistory,
  POUNDS_PER_KILOGRAM,
  readProgressPages,
  strengthDisplayValue,
} from "@/lib/training/strengthHistory";

const bench = {
  ...exerciseCatalog.find((row) => row.name === "Barbell Bench Press")!,
  id: "bench",
};
const sessions = [
  { id: "first", status: "completed", date: "2026-09-01", name: "Upper A" },
  { id: "second", status: "completed", date: "2026-09-05", name: "Upper B" },
];
const set = (change: Record<string, any> = {}) => ({
  id: "set-1",
  workoutSessionId: "first",
  exerciseId: "bench",
  exerciseName: "Bench Press",
  completed: true,
  setType: "working",
  setNumber: 1,
  weight: 100,
  reps: 10,
  ...change,
});
const history = (sets: any[], more: Record<string, any> = {}) =>
  buildStrengthHistory({
    sets,
    sessions,
    exercises: [bench],
    ...more,
  });

describe("strength session history", () => {
  it("builds real session trends, including sessions that did not set a personal best", () => {
    const result = history([
      set({ id: "second-set", workoutSessionId: "second", weight: 90, reps: 8 }),
      set({ id: "first-b", weight: 110, reps: 5, setNumber: 2 }),
      set(),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Barbell Bench Press");
    expect(result[0].sessions.map((row) => row.sessionId)).toEqual(["first", "second"]);
    expect(result[0].sessions[0]).toMatchObject({ heaviest: 110, totalReps: 15, volume: 1550 });
    expect(result[0].sessions[0].estimatedMax).toBe(133);
    expect(result[0].sessions[1]).toMatchObject({ heaviest: 90, totalReps: 8, volume: 720 });
    expect(result[0].sessions[0].sets.map((row) => row.setNumber)).toEqual([1, 2]);
  });

  it("merges known saved IDs and unambiguous legacy aliases through the canonical catalog", () => {
    const legacy = { id: "legacy", name: "Bench Press", equipment: "Barbell" };
    const result = history(
      [
        set(),
        set({ id: "legacy-set", exerciseId: "legacy", exerciseName: "BB Bench Press" }),
        set({ id: "name-only", exerciseId: undefined, exerciseName: "BB Bench Press" }),
      ],
      { exercises: [bench, legacy] }
    );
    expect(result).toHaveLength(1);
    expect(result[0].sessions[0].sets).toHaveLength(3);
  });

  it("keeps equipment variants and unknown saved IDs separate despite similar names", () => {
    const dumbbell = {
      ...exerciseCatalog.find((row) => row.name === "Dumbbell Bench Press")!,
      id: "db",
    };
    const result = history(
      [
        set(),
        set({ id: "db-set", exerciseId: "db", exerciseName: "DB Bench Press" }),
        set({ id: "custom-a", exerciseId: "unknown-a", exerciseName: "Bench Press" }),
        set({ id: "custom-b", exerciseId: "unknown-b", exerciseName: "Bench Press" }),
      ],
      { exercises: [bench, dumbbell] }
    );
    expect(result).toHaveLength(4);
    expect(new Set(result.map((row) => row.key)).size).toBe(4);
  });

  it("does not merge an ambiguous custom alias into a catalog exercise", () => {
    const custom = {
      id: "custom",
      name: "Custom Rack Press",
      aliases: ["Bench Press"],
      equipment: "Machine",
    };
    const result = history([set({ exerciseId: undefined })], { exercises: [bench, custom] });
    expect(result[0].key).toMatch(/^legacy:/);
  });

  it.each([
    { completed: false },
    { setType: "warmup" },
    { removed: true },
    { weight: "" },
    { weight: null },
    { weight: NaN },
    { weight: Infinity },
    { weight: -1 },
    { reps: 0 },
    { reps: 1.5 },
    { reps: 101 },
    { unit: "oz" },
    { workoutSessionId: "active" },
  ])("excludes incomplete/warm-up/invalid data: %j", (patch) => {
    expect(
      history([set(patch)], {
        sessions: [...sessions, { id: "active", status: "active", date: "2026-09-05" }],
      })
    ).toEqual([]);
  });

  it("excludes invalid and future session dates, and deduplicates repeated saved sets", () => {
    expect(
      history([set(), set(), set({ id: "bad", workoutSessionId: "bad" })], {
        sessions: [...sessions, { id: "bad", status: "completed", date: "2026-02-31" }],
      })[0].sessions[0].sets
    ).toHaveLength(1);
    expect(history([set()], { throughDate: "2026-08-31" })).toEqual([]);
  });

  it("counts completed drop/failure work while excluding warm-ups consistently with server analytics", () => {
    const result = history([
      set({ id: "drop", setType: "drop" }),
      set({ id: "failure", setType: "failure" }),
      set({ id: "warmup", setType: "warmup" }),
    ]);
    expect(result[0].sessions[0].totalReps).toBe(20);
  });

  it("retains load, volume and reps for power movements but never estimates their max", () => {
    const clean = {
      ...exerciseCatalog.find((row) => row.name === "Hang Power Clean")!,
      id: "clean",
    };
    const result = history(
      [set({ exerciseId: "clean", exerciseName: "Hang Power Clean", weight: 135, reps: 3 })],
      { exercises: [clean] }
    );
    expect(result[0].power).toBe(true);
    expect(result[0].sessions[0]).toMatchObject({
      heaviest: 135,
      volume: 405,
      totalReps: 3,
      estimatedMax: null,
    });
  });

  it("uses 1–12 rep Epley limits and leaves missing estimates null, not zero", () => {
    expect(history([set({ reps: 1 })])[0].sessions[0].estimatedMax).toBe(100);
    expect(history([set({ reps: 12 })])[0].sessions[0].estimatedMax).toBe(140);
    expect(history([set({ reps: 13 })])[0].sessions[0].estimatedMax).toBeNull();
    expect(history([set({ weight: 0 })])[0].sessions[0]).toMatchObject({
      totalReps: 10,
      volume: 0,
      estimatedMax: null,
    });
  });

  it("converts explicitly recorded kg without guessing from current profile preferences", () => {
    const point = history([set({ weight: 50, unit: "kg", reps: 5 })])[0].sessions[0];
    expect(point.heaviest).toBeCloseTo(50 * POUNDS_PER_KILOGRAM);
    expect(strengthDisplayValue(point.heaviest, "heaviest", "kg")).toBeCloseTo(50);
    expect(strengthDisplayValue(point.volume, "volume", "kg")).toBeCloseTo(250);
    expect(strengthDisplayValue(5, "totalReps", "kg")).toBe(5);
    expect(history([set({ weight: 50 })])[0].sessions[0].heaviest).toBe(50);
  });
});

describe("paginated progress loading", () => {
  it("loads beyond the first page with stable skip offsets", async () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({ id: String(index) }));
    const fetch = vi.fn(async (limit, skip) => rows.slice(skip, skip + limit));
    expect(await readProgressPages(fetch, { pageSize: 2, maxRows: 10 })).toEqual({
      rows,
      truncated: false,
    });
    expect(fetch.mock.calls).toEqual([
      [2, 0],
      [2, 2],
      [2, 4],
    ]);
  });
  it("explicitly reports oversized history and does not mislabel an exact boundary", async () => {
    const fetch = (length: number) => async (limit: number, skip: number) =>
      Array.from({ length }, (_, index) => ({ id: String(index) })).slice(skip, skip + limit);
    expect((await readProgressPages(fetch(5), { pageSize: 2, maxRows: 4 })).truncated).toBe(true);
    expect((await readProgressPages(fetch(4), { pageSize: 2, maxRows: 4 })).truncated).toBe(false);
  });
  it("rejects repeated pages and malformed rows instead of silently double counting", async () => {
    await expect(
      readProgressPages(async () => [{ id: "a" }, { id: "b" }], { pageSize: 2, maxRows: 6 })
    ).rejects.toThrow(/duplicate records.*retry/i);
    await expect(readProgressPages(async () => [{}])).rejects.toThrow(/identifier/);
  });
  it.each([
    [
      [{ id: "a" }, { id: "b" }],
      [{ id: "b" }, { id: "c" }],
    ],
    [[{ id: "a" }, { id: "b" }], [{ id: "b" }]],
    [[{ id: "a" }, { id: "a" }]],
    [
      [{ id: "a" }, { id: "b" }],
      [{ id: "c" }, { id: "c" }],
    ],
  ])("rejects an overlapping or internally duplicated page sequence: %j", async (...pages) => {
    let page = 0;
    await expect(
      readProgressPages(async () => pages[page++] || [], { pageSize: 2, maxRows: 10 })
    ).rejects.toThrow(/duplicate records.*retry/i);
  });
  it("rejects a duplicate returned by the final limit probe", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce([{ id: "a" }, { id: "b" }])
      .mockResolvedValueOnce([{ id: "b" }]);
    await expect(readProgressPages(fetch, { pageSize: 2, maxRows: 2 })).rejects.toThrow(
      /duplicate records.*retry/i
    );
  });
});
