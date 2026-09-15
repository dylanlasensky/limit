import { describe, expect, it } from "vitest";
import {
  calcTargets,
  profileHeightInches,
  profileWeightLb,
  toUSProfile,
} from "@/components/limit/nutritionTargets";

const male = {
  sex: "male",
  measurementSystemVersion: "us_v1",
  currentWeight: 180,
  heightFeet: 5,
  heightInches: 11,
  birthDate: "1990-06-15",
  activityLevel: "moderate",
  days: 4,
  fitnessGoal: "maintain weight",
};

describe("profileWeightLb", () => {
  it("prefers an explicit weightLb value", () => {
    expect(profileWeightLb({ weightLb: 150, currentWeight: 99 })).toBe(150);
  });

  it("returns currentWeight as-is for us_v1 profiles", () => {
    expect(profileWeightLb({ measurementSystemVersion: "us_v1", currentWeight: 180 })).toBe(180);
  });

  it("converts legacy metric currentWeight from kg to lb", () => {
    expect(profileWeightLb({ currentWeight: 100 })).toBeCloseTo(220.462, 3);
  });
});

describe("profileHeightInches", () => {
  it("combines feet and inches", () => {
    expect(profileHeightInches({ heightFeet: 6, heightInches: 2 })).toBe(74);
  });

  it("falls back to heightCm when imperial fields are absent", () => {
    expect(profileHeightInches({ heightCm: 180 })).toBeCloseTo(70.866, 2);
  });
});

describe("toUSProfile", () => {
  it("converts a legacy metric profile to imperial and stamps us_v1", () => {
    const result = toUSProfile({ currentWeight: 80, goalWeight: 75, heightCm: 180 });
    expect(result.measurementSystemVersion).toBe("us_v1");
    expect(result.units).toBe("imperial");
    expect(result.heightFeet).toBe(5);
    expect(result.heightInches).toBe(11);
    expect(result.currentWeight).toBeCloseTo(176.4, 1);
    expect(result.goalWeight).toBeCloseTo(165.3, 1);
  });

  it("does not re-convert a profile that is already us_v1", () => {
    const result = toUSProfile({ ...male, goalWeight: 175 });
    expect(result.currentWeight).toBe(180);
    expect(result.goalWeight).toBe(175);
  });
});

describe("calcTargets", () => {
  it("does not invent an adult age when a birth date is missing or invalid", () => {
    for (const birthDate of [undefined, "", "not-a-date", "2099-01-01"]) {
      const targets = calcTargets({ ...male, birthDate });
      expect(targets.calorieTarget).toBe(0);
      expect(targets.proteinTarget).toBe(0);
      expect(targets.targetExplanation).toContain("date of birth");
    }
  });

  it("does not prescribe automatic calorie or weight-loss targets to minors", () => {
    const now = new Date();
    const birthDate = `${now.getFullYear() - 10}-01-01`;
    const targets = calcTargets({ ...male, birthDate, fitnessGoal: "lose fat" });
    expect(targets.calorieTarget).toBe(0);
    expect(targets.fatTarget).toBe(0);
    expect(targets.targetExplanation).toContain("qualified health professional");
  });
  it("returns a calorie target that matches the macro split", () => {
    const t = calcTargets(male);
    const fromMacros = t.proteinTarget * 4 + t.carbTarget * 4 + t.fatTarget * 9;
    expect(t.calorieTarget).toBe(Math.round(fromMacros / 10) * 10);
    expect(t.calorieTarget % 10).toBe(0);
    expect(t.proteinTarget % 5).toBe(0);
    expect(t.carbTarget % 5).toBe(0);
    expect(t.fatTarget % 5).toBe(0);
  });

  it("adjusts calories and explanation by goal", () => {
    const maintain = calcTargets(male);
    const gain = calcTargets({ ...male, fitnessGoal: "gain muscle" });
    const lose = calcTargets({ ...male, fitnessGoal: "lose fat" });
    expect(gain.calorieTarget).toBeGreaterThan(maintain.calorieTarget);
    expect(lose.calorieTarget).toBeLessThan(maintain.calorieTarget);
    expect(gain.targetExplanation).toContain("gaining muscle");
    expect(lose.targetExplanation).toContain("losing fat");
    expect(maintain.targetExplanation).toContain("maintaining your weight");
  });

  it("raises protein when cutting", () => {
    const maintain = calcTargets(male);
    const lose = calcTargets({ ...male, fitnessGoal: "lose fat" });
    expect(lose.proteinTarget).toBeGreaterThan(maintain.proteinTarget);
  });

  it("never drops below the sex-specific calorie floor", () => {
    const tiny = {
      ...male,
      sex: "female",
      currentWeight: 90,
      heightFeet: 4,
      heightInches: 6,
      fitnessGoal: "lose fat",
      days: 1,
      activityLevel: "low",
    };
    expect(calcTargets(tiny).calorieTarget).toBeGreaterThanOrEqual(1200);
  });
});
