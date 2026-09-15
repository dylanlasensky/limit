// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { exerciseCatalog, normalizeExerciseName } from "../../base44/shared/exerciseCatalog.js";
import {
  readExercisePages,
  enrichExercise,
  exerciseSearch,
  syncExerciseCatalog,
} from "../../base44/shared/exerciseLibrary.js";
import { selectExercise, suitableReplacement } from "@/lib/training/exerciseSelection";
import { matchRegimen } from "@/lib/training/importRegimen";
import { personalBests } from "../../base44/shared/workoutAnalytics.js";
import { suggestProgression } from "@/lib/training/e1rm";
import { calculateMuscleRating } from "../../base44/shared/muscleRating";
vi.mock("@/api/base44Client", () => ({ base44: { entities: {} } }));
const catalog = exerciseCatalog.map((row) => ({ ...row, id: row.catalogKey }));
const named = (name: string) => catalog.find((row) => row.name === name)!;

describe("curated exercise coverage", () => {
  it("has 365 distinct, fully described movements without duplicate normalized names", () => {
    expect(catalog).toHaveLength(365);
    expect(new Set(catalog.map((x) => x.catalogKey)).size).toBe(catalog.length);
    expect(new Set(catalog.map((x) => normalizeExerciseName(x.name))).size).toBe(catalog.length);
    for (const row of catalog) {
      expect(row.instructions).toHaveLength(3);
      expect(["Beginner", "Intermediate", "Advanced"]).toContain(row.difficulty);
      expect(row.movementPattern).toBeTruthy();
      expect(row.repMin).toBeGreaterThan(0);
      expect(row.repMax).toBeGreaterThanOrEqual(row.repMin);
    }
  });
  it("covers bodybuilding, smaller accessory groups and athlete power", () => {
    expect(new Set(catalog.map((x) => x.primaryMuscle))).toEqual(
      new Set([
        "Chest",
        "Lats",
        "Upper back",
        "Front delts",
        "Side delts",
        "Rear delts",
        "Rotator cuff",
        "Biceps",
        "Triceps",
        "Forearms",
        "Quads",
        "Glutes",
        "Hamstrings",
        "Abductors",
        "Adductors",
        "Calves",
        "Tibialis",
        "Lower back",
        "Abs/core",
      ])
    );
    expect(catalog.filter((x) => x.category === "Power")).toHaveLength(39);
    expect(new Set(catalog.map((x) => x.equipment)).size).toBeGreaterThan(20);
  });
  it("keeps power and advanced exercises out of general program generation", () => {
    for (const row of catalog.filter(
      (x) => x.category === "Power" || x.difficulty === "Advanced"
    )) {
      expect(row.programEligible).toBe(false);
      expect(row.coachingRecommended).toBe(true);
    }
    expect(
      selectExercise(
        { muscles: ["Quads"], role: "main", type: "Compound" },
        catalog,
        new Set(),
        null
      ).name
    ).toBe("Barbell Back Squat");
    expect(
      selectExercise(
        { muscles: ["Quads"], role: "main" },
        catalog.filter((x) => x.category === "Power"),
        new Set(),
        null
      )
    ).toBeNull();
  });
  it("respects equipment and never fills a compound slot with an isolation", () => {
    const selected = selectExercise(
      { muscles: ["Quads"], role: "main", type: "Compound" },
      catalog,
      new Set(),
      new Set(["Bodyweight"])
    );
    expect(selected.name).toBe("Bodyweight Squat");
    expect(
      selectExercise(
        { muscles: ["Quads"], role: "main", type: "Compound" },
        [named("Leg Extension")],
        new Set(),
        null
      )
    ).toBeNull();
  });
  it("matches aliases and supporting muscles while retaining equipment distinctions", () => {
    expect(exerciseSearch(named("Dumbbell Romanian Deadlift"), "DB RDL")).toBe(true);
    expect(exerciseSearch(named("Barbell Bench Press"), "triceps")).toBe(true);
    expect(exerciseSearch(named("Dumbbell Bench Press"), "barbell")).toBe(false);
    expect(normalizeExerciseName(" DB  Bench-Press ")).toBe("dumbbell bench press");
  });
  it("requires movement-compatible substitutions", () => {
    expect(
      suitableReplacement(named("Barbell Back Squat"), named("Goblet Squat"), {
        equipment: ["Full gym"],
      })
    ).toBe(true);
    expect(suitableReplacement(named("Barbell Back Squat"), named("Leg Press"), {})).toBe(false);
    expect(suitableReplacement(named("Barbell Back Squat"), named("Zercher Squat"), {})).toBe(
      false
    );
    expect(
      suitableReplacement(named("Barbell Back Squat"), named("Goblet Squat"), {
        equipment: ["Bodyweight"],
      })
    ).toBe(false);
  });
  it("does not confuse hang clean with hang power clean", () => {
    const matched = matchRegimen({ days: [{ exercises: [{ name: "Hang Clean" }] }] }, catalog);
    expect(matched.days[0].exercises[0].exerciseId).toBe(named("Hang Clean").id);
  });
  it("only automatically matches unambiguous exact names or aliases", () => {
    const matched = matchRegimen(
      {
        days: [
          { exercises: [{ name: "DB Bench Press" }, { name: "Incline Press" }, { name: "RDL" }] },
        ],
      },
      catalog
    ).days[0].exercises;
    expect(matched[0].exerciseId).toBe(named("Dumbbell Bench Press").id);
    expect(matched[1].exerciseId).toBe("");
    expect(matched[1].exerciseName).toBe("Incline Press");
    expect(matched[2].exerciseId).toBe(named("Romanian Deadlift").id);
    const duplicate = matchRegimen({ days: [{ exercises: [{ name: "DB Bench Press" }] }] }, [
      named("Dumbbell Bench Press"),
      { ...named("Dumbbell Bench Press"), id: "legacy-copy" },
    ]);
    expect(duplicate.days[0].exercises[0].exerciseId).toBe("");
  });
  it("keeps legacy identifiers and display names during enrichment", () => {
    const row = enrichExercise({
      id: "old-id",
      name: "Bench Press",
      equipment: "Barbell",
      repMin: 4,
    });
    expect(row.id).toBe("old-id");
    expect(row.name).toBe("Bench Press");
    expect(row.repMin).toBe(4);
    expect(row.movementPattern).toBe("Horizontal press");
    expect(enrichExercise({ id: "custom", name: "My coach's drill" }).catalogKey).toBeUndefined();
  });
});

describe("catalog loading and migration", () => {
  it("runs the exact emitted deployment script and verifies the saved catalog", async () => {
    const script = execFileSync(process.execPath, ["scripts/seed-exercises.mjs"], {
      encoding: "utf8",
    });
    const rows: any[] = [];
    const log = vi.fn();
    const context = {
      console: { log },
      base44: {
        entities: {
          Exercise: {
            list: async (_sort, limit, skip) => rows.slice(skip, skip + limit),
            update: async (id, patch) =>
              Object.assign(
                rows.find((row) => row.id === id),
                patch
              ),
            bulkCreate: async (items) => {
              const saved = items.map((item) => ({ ...item, id: item.catalogKey }));
              rows.push(...saved);
              return saved;
            },
          },
        },
      },
    };
    await runInNewContext(`(async () => { ${script} })()`, context);
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      curated: 365,
      total: 365,
      created: 365,
      verified: true,
    });
    await runInNewContext(`(async () => { ${script} })()`, context);
    expect(JSON.parse(log.mock.calls[1][0])).toMatchObject({
      created: 0,
      unchanged: 365,
      verified: true,
    });
  });
  it("loads past 500 entries without replacing database IDs", async () => {
    const rows = Array.from({ length: 1201 }, (_, i) => ({ id: String(i), name: `Exercise ${i}` }));
    const list = vi.fn(async (_sort, limit, skip) => rows.slice(skip, skip + limit));
    expect(await readExercisePages({ list })).toEqual(rows);
    expect(list.mock.calls.map((x) => x[2])).toEqual([0, 500, 1000]);
  });
  it("handles exact page boundaries and empty libraries", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ id: String(i) }));
    expect(
      await readExercisePages({ list: async (_sort, _limit, skip) => (skip ? [] : rows) })
    ).toHaveLength(500);
    expect(await readExercisePages({ list: async () => [] })).toEqual([]);
  });
  it("rejects broken or repeating pagination instead of silently truncating", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ id: String(i) }));
    await expect(readExercisePages({ list: async () => rows })).rejects.toThrow("repeated page");
    await expect(readExercisePages({ list: async () => ({}) })).rejects.toThrow(
      "could not be loaded"
    );
  });
  it("seeds idempotently, preserving existing data and avoiding deletes", async () => {
    const rows: any[] = [
      {
        id: "legacy",
        name: "Bench Press",
        equipment: "Barbell",
        primaryMuscle: "Chest",
        repMin: 4,
      },
      { id: "custom", name: "Coach special", equipment: "Custom" },
    ];
    const update = vi.fn(async (id, patch) =>
      Object.assign(
        rows.find((r) => r.id === id),
        patch
      )
    );
    const bulkCreate = vi.fn(async (items) => {
      const created = items.map((item) => ({ ...item, id: `new-${item.catalogKey}` }));
      rows.push(...created);
      return created;
    });
    const result = await syncExerciseCatalog({ update, bulkCreate }, exerciseCatalog, rows);
    expect(result.created).toBe(364);
    expect(result.enriched).toBe(1);
    expect(rows[0]).toMatchObject({ id: "legacy", name: "Bench Press", repMin: 4 });
    expect(rows[1]).toEqual({ id: "custom", name: "Coach special", equipment: "Custom" });
    expect(bulkCreate.mock.calls.every(([items]) => items.length <= 50)).toBe(true);
    update.mockClear();
    bulkCreate.mockClear();
    expect(await syncExerciseCatalog({ update, bulkCreate }, exerciseCatalog, rows)).toMatchObject({
      created: 0,
      enriched: 0,
      unchanged: 365,
    });
    expect(update).not.toHaveBeenCalled();
    expect(bulkCreate).not.toHaveBeenCalled();
  });
  it("can resume after a partially successful create batch", async () => {
    const rows: any[] = [];
    const subset = exerciseCatalog.slice(0, 3);
    const entity = {
      update: vi.fn(),
      bulkCreate: vi.fn(async (items) => {
        rows.push({ ...items[0], id: "first" });
        throw new Error("connection lost");
      }),
    };
    await expect(syncExerciseCatalog(entity, subset, rows)).rejects.toThrow("connection lost");
    const bulkCreate = vi.fn(async (items) => items.map((x) => ({ ...x, id: x.catalogKey })));
    expect(await syncExerciseCatalog({ update: vi.fn(), bulkCreate }, subset, rows)).toMatchObject({
      created: 2,
      unchanged: 1,
    });
  });
});

describe("athletic power analytics", () => {
  const set = {
    exerciseName: "Power Clean",
    exerciseId: "power-clean",
    completed: true,
    weight: 135,
    reps: 3,
    rir: 2,
  };
  it("does not estimate a power exercise one-rep maximum", () => {
    const records = personalBests([set], []);
    expect(records.some((r) => r.type === "weight")).toBe(true);
    expect(records.some((r) => r.type === "e1rm")).toBe(false);
    expect(suggestProgression([set, set], 2, 3)).toBeNull();
  });
  it("does not convert power-drill load into a muscle-level score", () => {
    const rating = calculateMuscleRating({
      sets: [set],
      exercises: [named("Power Clean")],
      sessions: [],
      weights: [],
      profile: {},
    });
    expect(rating).toEqual(
      calculateMuscleRating({
        sets: [],
        exercises: [named("Power Clean")],
        sessions: [],
        weights: [],
        profile: {},
      })
    );
  });
});
