// @vitest-environment node
import { describe, expect, it } from "vitest";
import { exerciseCatalog } from "../../base44/shared/exerciseCatalog.js";
import {
  dayVariant,
  focusFor,
  orderedTrainingDays,
  scheme,
  scoreProgramStructures,
  slotsFor,
} from "@/lib/training/programEngine";
import {
  equipmentAvailable,
  equipmentPool,
  selectExercise,
  supportsRepPrescription,
} from "@/lib/training/exerciseSelection";

const catalog = exerciseCatalog.map((exercise) => ({ ...exercise, id: exercise.catalogKey }));
const named = (name: string) => catalog.find((exercise) => exercise.name === name)!;
const profile = {
  fitnessGoal: "gain muscle",
  experienceLevel: "beginner",
  sessionLength: 60,
  equipment: ["Full commercial gym"],
  availableDays: ["Monday", "Wednesday", "Friday"],
};
const selected = (day: string, overrides = {}) => {
  const preferences = { ...profile, ...overrides };
  const used = new Set<string>();
  return slotsFor(day, preferences).flatMap((slot) => {
    const exercise = selectExercise(
      slot,
      catalog,
      used,
      equipmentPool(preferences),
      dayVariant(day),
      preferences.experienceLevel
    );
    if (!exercise) return [];
    used.add(exercise.id);
    return [{ ...exercise, slot }];
  });
};
describe("personalized program structures", () => {
  it("uses chronological exact weekdays instead of stale counts or click order", () => {
    expect(
      orderedTrainingDays({ days: 6, availableDays: ["Friday", "Monday", "Wednesday", "Monday"] })
    ).toEqual([0, 2, 4]);
    expect(scoreProgramStructures({ ...profile, days: 6 }).best.dayNames).toHaveLength(3);
    expect(orderedTrainingDays({ trainingDays: ["Sunday", "Tuesday"] })).toEqual([1, 6]);
    expect(orderedTrainingDays({ days: 3 })).toEqual([0, 2, 4]);
  });
  it("changes split for three consecutive days without moving any selected day", () => {
    expect(scoreProgramStructures(profile).best.key).toBe("full_body");
    const consecutive = { ...profile, availableDays: ["Monday", "Tuesday", "Wednesday"] };
    expect(scoreProgramStructures(consecutive).best.key).toBe("ppl");
    expect(orderedTrainingDays(consecutive)).toEqual([0, 1, 2]);
  });
  it("separates lower specialization sessions on a Monday-Friday schedule", () => {
    const rec = scoreProgramStructures({
      ...profile,
      experienceLevel: "intermediate",
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      priorityMuscles: ["Glutes"],
    }).best;
    expect(rec.key).toBe("upper_lower_spec");
    for (let index = 1; index < rec.dayNames.length; index++) {
      expect([focusFor(rec.dayNames[index - 1]), focusFor(rec.dayNames[index])]).not.toEqual([
        "lower",
        "lower",
      ]);
    }
  });
  it("accounts for Sunday-Monday recovery across the week boundary", () => {
    const rec = scoreProgramStructures({
      ...profile,
      availableDays: ["Sunday", "Monday", "Tuesday"],
    }).best;
    expect(rec.key).toBe("ppl");
  });
  it("offers nonempty bodyweight sessions rather than equipment-free pulling days", () => {
    for (let days = 2; days <= 6; days++) {
      const preferences = {
        ...profile,
        availableDays: undefined,
        days,
        equipment: ["Bodyweight only"],
      };
      for (const option of scoreProgramStructures(preferences).options) {
        expect(option.dayNames).toHaveLength(days);
        for (const name of option.dayNames)
          expect(selected(name, preferences).length).toBeGreaterThan(0);
      }
    }
  });
  it("describes a starting plan rather than guaranteeing every muscle or perfection", () => {
    const why = scoreProgramStructures({ ...profile, priorityMuscles: ["Arms"] }).best.why;
    expect(why).toContain("starting plan");
    expect(why).toContain("Arms");
    expect(why).not.toMatch(/perfect|most effective|every muscle twice/);
  });
  it("keeps beginner heavy work out of three-repetition prescriptions", () => {
    expect(scheme("strength", "main_strength", "beginner").repMin).toBe(5);
    expect(scheme("strength", "main_strength", "intermediate").repMin).toBe(3);
  });
  it("prioritizes repeated movement practice for a generic three-day strength goal", () => {
    expect(
      scoreProgramStructures({
        ...profile,
        fitnessGoal: "get stronger",
        experienceLevel: "intermediate",
      }).best.key
    ).toBe("full_body");
  });
});

describe("balanced movement slots and priorities", () => {
  it("keeps horizontal and vertical pulling on both upper days", () => {
    for (const day of ["Upper A", "Upper B", "Upper C"]) {
      const patterns = selected(day).map((exercise) => exercise.movementPattern);
      expect(patterns).toContain("Horizontal pull");
      expect(patterns).toContain("Vertical pull");
      expect(patterns).toContain("Horizontal press");
    }
  });
  it("reserves squat, hinge, pushing and pulling coverage in full-body sessions", () => {
    for (const day of ["Full Body A", "Full Body B", "Full Body C"]) {
      const essential = selected(day).filter((exercise) => exercise.slot.essential);
      expect(essential).toHaveLength(4);
      expect(essential.some((exercise) => exercise.movementPattern === "Squat")).toBe(true);
      expect(essential.some((exercise) => exercise.movementPattern === "Hip hinge")).toBe(true);
      expect(essential.some((exercise) => /pull/.test(exercise.movementPattern))).toBe(true);
    }
  });
  it("makes arm priorities available before the old six-exercise cutoff and alternates direct emphasis", () => {
    const a = slotsFor("Upper A", { priorityMuscles: ["Arms"] });
    const b = slotsFor("Upper B", { priorityMuscles: ["Arms"] });
    expect(a.findIndex((slot) => slot.priority)).toBeLessThan(4);
    expect(a.find((slot) => slot.priority)?.muscles).toEqual(["Biceps"]);
    expect(b.find((slot) => slot.priority)?.muscles).toEqual(["Triceps"]);
    expect(
      selected("Upper A", { priorityMuscles: ["Arms"] }).some(
        (exercise) => exercise.primaryMuscle === "Biceps"
      )
    ).toBe(true);
  });
  it("cycles multiple requested priorities instead of always selecting the first", () => {
    const preferences = { priorityMuscles: ["Chest", "Back", "Arms"] };
    expect(
      ["A", "B", "C"].map(
        (letter) =>
          slotsFor(`Full Body ${letter}`, preferences).find((slot) => slot.priority)?.priorityMuscle
      )
    ).toEqual(["Chest", "Back", "Arms"]);
  });
  it("allocates a real glute movement on lower focus rather than copying lower A", () => {
    const preferences = { priorityMuscles: ["Glutes"] };
    const focus = selected("Lower Focus", preferences);
    expect(focus.find((exercise) => exercise.slot.priority)?.primaryMuscle).toBe("Glutes");
    expect(focus.map((exercise) => exercise.id)).not.toEqual(
      selected("Lower A", preferences).map((exercise) => exercise.id)
    );
  });
  it("varies suitable main exercises while preserving their movement pattern", () => {
    expect(selected("Full Body A")[1].id).not.toBe(selected("Full Body B")[1].id);
    expect(dayVariant("Upper C")).toBe(2);
    expect(dayVariant("Lower Hypertrophy")).toBe(1);
  });
});

describe("catalog equipment and suitability", () => {
  it("uses a known legacy broad-muscle row without changing saved identity or attribution", () => {
    const legacy = {
      ...named("Lat Pulldown"),
      id: "saved-lat",
      name: "Cable Lat Pulldown",
      primaryMuscle: "Back",
      catalogKey: undefined,
    };
    const chosen = selectExercise(
      { muscles: ["Lats"], role: "main", type: "Compound" },
      [legacy],
      new Set(),
      null
    );
    expect(chosen).toMatchObject({
      id: "saved-lat",
      name: "Cable Lat Pulldown",
      equipment: "Cable",
      primaryMuscle: "Lats",
    });
    expect(legacy.primaryMuscle).toBe("Back");
    expect(
      selectExercise(
        { muscles: ["Lats"], role: "main" },
        [{ ...legacy, programEligible: false }],
        new Set(),
        null
      )
    ).toBeNull();
    expect(
      selectExercise(
        { muscles: ["Lats"], role: "main" },
        [{ ...legacy, primaryMuscle: "Upper back" }],
        new Set(),
        null
      )
    ).toBeNull();
    expect(
      selectExercise(
        { muscles: ["Lats"], role: "main" },
        [{ ...legacy, name: "Coach custom pull" }],
        new Set(),
        null
      )
    ).toBeNull();
  });
  it("does not select another saved alias of a canonical exercise already in the day", () => {
    const canonical = named("Lat Pulldown");
    const alias = {
      ...canonical,
      id: "legacy-pulldown",
      catalogKey: undefined,
      name: "Cable Lat Pulldown",
      primaryMuscle: "Back",
    };
    const next = named("Neutral-Grip Lat Pulldown");
    const slot = { muscles: ["Lats"], role: "main", type: "Compound" };
    expect(selectExercise(slot, [canonical, alias], new Set([canonical.id]), null)).toBeNull();
    expect(selectExercise(slot, [canonical, alias], new Set([alias.id]), null)).toBeNull();
    expect(selectExercise(slot, [canonical, alias, next], new Set([alias.id]), null)?.id).toBe(
      next.id
    );
  });
  it("never treats a cable machine or a home gym as all machines/full gym", () => {
    expect(equipmentPool({ equipment: ["Cable machine"] })).toEqual(
      new Set(["Bodyweight", "Cable"])
    );
    expect(equipmentPool({ equipment: ["Home gym"] })).toEqual(new Set(["Bodyweight"]));
    expect(equipmentPool({ equipment: ["Smith machine"] })).toEqual(
      new Set(["Bodyweight", "Smith machine"])
    );
    expect(equipmentPool({ equipment: ["Full commercial gym", "Dumbbells"] })).toEqual(
      new Set(["Bodyweight", "Dumbbell"])
    );
  });
  it("requires benches and racks for dependent lifts, but permits floor presses", () => {
    const dumbbells = equipmentPool({ equipment: ["Dumbbells"] });
    expect(equipmentAvailable(named("Dumbbell Bench Press"), dumbbells)).toBe(false);
    expect(equipmentAvailable(named("Dumbbell Floor Press"), dumbbells)).toBe(true);
    expect(
      equipmentAvailable(
        named("Dumbbell Bench Press"),
        equipmentPool({ equipment: ["Dumbbells", "Bench"] })
      )
    ).toBe(true);
    expect(
      equipmentAvailable(named("Barbell Back Squat"), equipmentPool({ equipment: ["Barbell"] }))
    ).toBe(false);
    expect(
      equipmentAvailable(
        named("Barbell Back Squat"),
        equipmentPool({ equipment: ["Barbell + rack"] })
      )
    ).toBe(true);
    expect(
      equipmentAvailable(
        named("Barbell Bench Press"),
        equipmentPool({ equipment: ["Barbell + rack"] })
      )
    ).toBe(false);
  });
  it("uses lower-complexity beginner choices and retains strength choices for experienced lifters", () => {
    const slot = { muscles: ["Quads"], role: "main", type: "Compound" };
    expect(selectExercise(slot, catalog, new Set(), null).difficulty).toBe("Beginner");
    expect(selectExercise(slot, catalog, new Set(), null, 0, "intermediate").name).toBe(
      "Barbell Back Squat"
    );
  });
  it("excludes unsafe automatic power, advanced and timed-only choices for every experience level", () => {
    for (const experienceLevel of ["beginner", "intermediate", "advanced"]) {
      for (const day of [
        "Full Body A",
        "Upper B",
        "Lower Focus",
        "Push",
        "Pull",
        "Deadlift & Pull",
      ]) {
        for (const exercise of selected(day, { experienceLevel, priorityMuscles: ["Core"] })) {
          expect(exercise.category).not.toBe("Power");
          expect(exercise.difficulty).not.toBe("Advanced");
          expect(supportsRepPrescription(exercise)).toBe(true);
        }
      }
    }
    expect(supportsRepPrescription({ name: "Plank" })).toBe(false);
    expect(supportsRepPrescription({ name: "Farmer's Carry" })).toBe(false);
    expect(supportsRepPrescription({ name: "Hanging Knee Raise" })).toBe(true);
  });
  it("uses eligible exercises beyond the legacy eighteen without fabrication or duplicate identifiers", () => {
    const rows = selected("Upper B", { equipment: ["Dumbbells", "Bench"] });
    expect(
      rows.some((exercise) => catalog.findIndex((item) => item.id === exercise.id) >= 18)
    ).toBe(true);
    expect(new Set(rows.map((exercise) => exercise.id)).size).toBe(rows.length);
    expect(rows.every((exercise) => catalog.some((item) => item.id === exercise.id))).toBe(true);
  });
});
