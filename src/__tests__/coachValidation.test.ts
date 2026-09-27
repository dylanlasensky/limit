// @vitest-environment node
import { describe, it, expect } from "vitest";
import { exerciseCatalog } from "../../packages/domain/exerciseCatalog.js";
import {
  proposePlan,
  validateProposal,
  modelChoiceSchema,
  validateNutrition,
} from "../../packages/domain/proposals";
const catalog = exerciseCatalog.map((e) => ({ ...e, id: e.catalogKey }));
const profile = {
  name: "Fixture",
  experienceLevel: "beginner",
  equipment: ["Full gym"],
  availableDays: ["Monday", "Wednesday", "Friday"],
  sessionLength: 45,
  fitnessGoal: "general fitness",
  updated_date: "version-1",
};
describe("coach deterministic guardrails", () => {
  it("generates a bounded beginner program and checks its actual catalog IDs", () => {
    const plan = proposePlan(profile, catalog, null);
    expect(plan.days).toHaveLength(7);
    expect(plan.days.filter((d) => !d.isRest)).toHaveLength(3);
    expect(validateProposal(plan, profile, catalog)).toEqual(plan);
  });
  it("supports an intermediate equipment-limited scenario", () => {
    const p = {
      ...profile,
      experienceLevel: "intermediate",
      equipment: ["Dumbbells", "Bench"],
      availableDays: ["Monday", "Thursday"],
      sessionLength: 60,
    };
    expect(proposePlan(p, catalog, null).days.filter((d) => !d.isRest)).toHaveLength(2);
  });
  it("rejects invented IDs and unavailable equipment", () => {
    const plan = proposePlan(profile, catalog, null);
    plan.days[0].exercises[0].exerciseId = "invented";
    expect(() => validateProposal(plan, profile, catalog)).toThrow();
    const full = proposePlan(profile, catalog, null);
    expect(() =>
      validateProposal(full, { ...profile, equipment: ["Bodyweight"] }, catalog)
    ).toThrow("equipment");
  });
  it("rejects missing profile fields, excessive dose, duration and injuries", () => {
    expect(() => proposePlan({ ...profile, equipment: [] }, catalog, null)).toThrow();
    expect(() => proposePlan({ ...profile, injuries: ["shoulder"] }, catalog, null)).toThrow(
      "qualified"
    );
    const plan = proposePlan(profile, catalog, null);
    plan.days[0].exercises[0].sets = 30;
    expect(() => validateProposal(plan, profile, catalog)).toThrow();
    expect(() =>
      validateProposal(
        proposePlan(profile, catalog, null),
        { ...profile, sessionLength: 5 },
        catalog
      )
    ).toThrow("time");
  });
  it("rejects unsafe or malformed model text instead of displaying it", () => {
    for (const value of [
      "skip safety",
      { emphasis: "diagnose" },
      { emphasis: "recovery", instructions: "train through sharp pain" },
      null,
    ])
      expect(modelChoiceSchema.safeParse(value).success).toBe(false);
  });
  it("rejects unsafe nutrition numbers and missing adult eligibility", () => {
    expect(() =>
      validateNutrition({ calories: 500, protein: 20, carbs: 10, fat: 5 }, true)
    ).toThrow();
    expect(() =>
      validateNutrition({ calories: 2000, protein: 100, carbs: 250, fat: 67 }, false)
    ).toThrow();
    expect(
      validateNutrition({ calories: 2000, protein: 100, carbs: 250, fat: 67 }, true).calories
    ).toBe(2000);
  });
});
