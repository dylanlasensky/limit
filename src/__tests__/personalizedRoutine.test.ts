// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exerciseCatalog } from "../../base44/shared/exerciseCatalog.js";
import { createPersonalizedPlan } from "@/lib/training/planService";
import {
  buildDayExercises,
  estimateMinutes,
  routineCoverageNote,
} from "@/lib/training/personalizedRoutine";
import { scoreProgramStructures, WEEKDAYS } from "@/lib/training/programEngine";
import { equipmentAvailable, equipmentPool } from "@/lib/training/exerciseSelection";

const sdk = vi.hoisted(() => ({
  list: vi.fn(),
  sessions: vi.fn(),
  plan: vi.fn(),
  days: vi.fn(),
  rows: vi.fn(),
  invoke: vi.fn(),
}));
vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      Exercise: { list: sdk.list },
      WorkoutSession: { filter: sdk.sessions },
      WorkoutPlan: { create: sdk.plan },
      WorkoutDay: { bulkCreate: sdk.days },
      WorkoutExercise: { bulkCreate: sdk.rows },
    },
    functions: { invoke: sdk.invoke },
  },
}));
const catalog = exerciseCatalog.map((row) => ({ ...row, id: "saved-" + row.catalogKey }));
const profile = {
  fitnessGoal: "gain muscle",
  experienceLevel: "intermediate",
  sessionLength: 60,
  equipment: ["Full commercial gym"],
  availableDays: ["Monday", "Tuesday", "Thursday", "Friday"],
};
beforeEach(() => {
  vi.clearAllMocks();
  sdk.list.mockImplementation(async (_sort, limit, skip) => catalog.slice(skip, skip + limit));
  sdk.sessions.mockResolvedValue([]);
  sdk.plan.mockImplementation(async (payload) => ({ ...payload, id: "new-plan" }));
  sdk.days.mockImplementation(async (payload) =>
    payload.map((row) => ({ ...row, id: "day-" + row.weekday })).reverse()
  );
  sdk.rows.mockImplementation(async (payload) =>
    payload.map((row, i) => ({ ...row, id: "row-" + i })).reverse()
  );
  sdk.invoke.mockResolvedValue({ data: { plan: { id: "new-plan", active: true } } });
});

describe("personalized routine constraints", () => {
  for (const sessionLength of [30, 45, 60, 75, 90]) {
    it(`respects saved exercises, equipment, and the ${sessionLength}-minute budget across profiles`, () => {
      for (const fitnessGoal of [
        "gain muscle",
        "get stronger",
        "muscle and strength",
        "lose fat",
        "general fitness",
      ])
        for (const experienceLevel of ["beginner", "intermediate", "advanced"])
          for (const days of [2, 3, 4, 5, 6])
            for (const equipment of [
              ["Full commercial gym"],
              ["Dumbbells"],
              ["Bodyweight only"],
              ["Cable machine"],
              ["Resistance band"],
            ]) {
              const input = { fitnessGoal, experienceLevel, sessionLength, days, equipment };
              const rec = scoreProgramStructures(input).best;
              expect(rec.dayNames.length).toBe(days);
              for (const name of rec.dayNames) {
                const rows = buildDayExercises(name, input, catalog);
                expect(rows.length, JSON.stringify({ ...input, name })).toBeGreaterThan(0);
                expect(estimateMinutes(rows)).toBeLessThanOrEqual(sessionLength);
                expect(new Set(rows.map((row) => row.exerciseId)).size).toBe(rows.length);
                expect(rows.reduce((sum, row) => sum + row.sets, 0)).toBeLessThanOrEqual(
                  experienceLevel === "beginner" ? 14 : experienceLevel === "advanced" ? 22 : 18
                );
                for (const row of rows) {
                  const source = catalog.find((ex) => ex.id === row.exerciseId)!;
                  expect(source).toBeTruthy();
                  expect(equipmentAvailable(source, equipmentPool(input))).toBe(true);
                  expect(source.programEligible).toBe(true);
                  expect(source.category).not.toBe("Power");
                  expect(row.sets).toBeGreaterThanOrEqual(2);
                  expect(row.repMin).toBeGreaterThan(0);
                  expect(row.repMax).toBeGreaterThanOrEqual(row.repMin);
                  expect(row.notes).toContain("reps in reserve");
                }
              }
            }
    }, 15000); // Each case checks 375 profiles, not a single UI interaction.
  }
  it("changes the actual weekly work for each stated muscle priority", () => {
    const groups = {
      Chest: ["Chest"],
      Back: ["Lats", "Upper back"],
      Shoulders: ["Side delts", "Rear delts"],
      Arms: ["Biceps", "Triceps"],
      Quads: ["Quads"],
      Hamstrings: ["Hamstrings"],
      Glutes: ["Glutes"],
      Calves: ["Calves"],
      Core: ["Abs/core"],
    };
    for (const [priority, muscles] of Object.entries(groups)) {
      const total = (input) =>
        scoreProgramStructures(input)
          .best.dayNames.flatMap((name) => buildDayExercises(name, input, catalog))
          .filter((row) => muscles.includes(row.primaryMuscle))
          .reduce((sum, row) => sum + row.sets, 0);
      expect(total({ ...profile, priorityMuscles: [priority] }), priority).toBeGreaterThan(
        total(profile)
      );
    }
  });
  it("uses goal-shaped dosage without unsafe maximum-load testing", () => {
    const muscle = buildDayExercises("Full Body A", profile, catalog);
    const strength = buildDayExercises(
      "Full Body A",
      { ...profile, fitnessGoal: "get stronger" },
      catalog
    );
    expect(strength[0].repMax).toBeLessThan(muscle[0].repMax);
    expect(strength[0].restSeconds).toBeGreaterThanOrEqual(muscle[0].restSeconds);
  });
  it("accounts for both sides and rest between sets", () => {
    const bilateral = [
      { exerciseName: "Dumbbell Floor Press", sets: 3, repMax: 12, restSeconds: 120 },
    ];
    const single = [{ ...bilateral[0], exerciseName: "Single-Leg Romanian Deadlift" }];
    expect(estimateMinutes(single)).toBeGreaterThan(estimateMinutes(bilateral));
    expect(estimateMinutes([])).toBe(0);
  });
  it("describes missing equipment coverage rather than claiming a complete gym plan", () => {
    const input = {
      ...profile,
      equipment: ["Bodyweight only"],
      days: 3,
      availableDays: ["Monday", "Wednesday", "Friday"],
    };
    const templates = scoreProgramStructures(input).best.dayNames.map((name) =>
      buildDayExercises(name, input, catalog)
    );
    expect(routineCoverageNote(templates)).toContain("Back training is limited");
  });
  it("budgets per-side core work and keeps focused back volume bounded", () => {
    const coreRows = buildDayExercises(
      "Full Body A",
      { ...profile, equipment: ["Bodyweight only"], priorityMuscles: ["Core"] },
      catalog
    );
    const deadBug = coreRows.find((row) => row.exerciseName === "Dead Bug");
    expect(deadBug?.notes).toContain("Reps are per side");
    const rows = buildDayExercises(
      "Upper A",
      { ...profile, priorityMuscles: ["Back"], sessionLength: 90 },
      catalog
    );
    expect(
      rows
        .filter((row) => ["Lats", "Upper back"].includes(row.primaryMuscle))
        .reduce((sum, row) => sum + row.sets, 0)
    ).toBeLessThanOrEqual(8);
  });
});

describe("safe routine persistence", () => {
  it("uses the full paginated saved library and real IDs, including entries after the first 500", async () => {
    const rows = [
      ...Array.from({ length: 500 }, (_, i) => ({
        id: "old-" + i,
        name: "Archived " + i,
        programEligible: false,
      })),
      ...catalog,
    ];
    sdk.list.mockImplementation(async (_sort, limit, skip) => rows.slice(skip, skip + limit));
    await createPersonalizedPlan({
      ...profile,
      days: 6,
      availableDays: ["Friday", "Monday", "Wednesday"],
    });
    expect(sdk.list.mock.calls.map((args) => args[2])).toEqual([0, 500]);
    expect(sdk.plan.mock.calls[0][0]).toMatchObject({ daysPerWeek: 3, active: false });
    const days = sdk.days.mock.calls[0][0];
    expect(days.filter((day) => !day.isRest).map((day) => WEEKDAYS[day.weekday])).toEqual([
      "Monday",
      "Wednesday",
      "Friday",
    ]);
    for (const row of sdk.rows.mock.calls[0][0])
      expect(catalog.some((ex) => ex.id === row.exerciseId)).toBe(true);
    expect(sdk.invoke).toHaveBeenCalledWith("workoutCommand", {
      action: "activatePlan",
      planId: "new-plan",
    });
    expect(sdk.rows.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.invoke.mock.invocationCallOrder[0]
    );
  });
  it("rebuilds a stale recommendation using the current selected days", async () => {
    const stale = scoreProgramStructures({
      ...profile,
      days: 6,
      availableDays: WEEKDAYS.slice(0, 6),
    }).best;
    await createPersonalizedPlan(profile, stale);
    expect(sdk.plan.mock.calls[0][0].daysPerWeek).toBe(4);
    expect(sdk.days.mock.calls[0][0].filter((day) => !day.isRest)).toHaveLength(4);
  });
  it("rejects invalid schedules before creating anything", async () => {
    for (const days of [["Monday"], ["Monday", "Neverday"], WEEKDAYS]) {
      await expect(createPersonalizedPlan({ ...profile, availableDays: days })).rejects.toThrow(
        "2–6"
      );
    }
    expect(sdk.plan).not.toHaveBeenCalled();
  });
  it("does not replace a plan during an active workout or when the library is empty", async () => {
    sdk.sessions.mockResolvedValueOnce([{ id: "active" }]);
    await expect(createPersonalizedPlan(profile)).rejects.toThrow("active workout");
    sdk.list.mockResolvedValueOnce([]);
    await expect(createPersonalizedPlan(profile)).rejects.toThrow("No suitable exercises");
    expect(sdk.plan).not.toHaveBeenCalled();
    expect(sdk.invoke).not.toHaveBeenCalled();
  });
  it.each([
    "missing-day",
    "duplicate-day",
    "wrong-day",
    "missing-row",
    "wrong-reps",
    "duplicate-row",
  ])("does not activate an incomplete or corrupted graph: %s", async (failure) => {
    if (failure.includes("day"))
      sdk.days.mockImplementation(async (payload) => {
        const rows = payload.map((row) => ({ ...row, id: "day-" + row.weekday }));
        if (failure === "missing-day") return rows.slice(1);
        if (failure === "duplicate-day") return [...rows.slice(1), rows[1]];
        rows[0].name = "Wrong";
        return rows;
      });
    else
      sdk.rows.mockImplementation(async (payload) => {
        const rows = payload.map((row, i) => ({ ...row, id: "row-" + i }));
        if (failure === "missing-row") return rows.slice(1);
        if (failure === "duplicate-row") return [...rows.slice(1), rows[1]];
        rows[0].repMax = 99;
        return rows;
      });
    await expect(createPersonalizedPlan(profile)).rejects.toThrow(
      "previous plan is still available"
    );
    expect(sdk.invoke).not.toHaveBeenCalled();
  });
});
