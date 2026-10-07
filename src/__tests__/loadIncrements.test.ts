import { describe, expect, it } from "vitest";
import { entitySchemas } from "../../packages/contracts/entities";
import { suggestProgression } from "@/lib/training/e1rm";

const topSets = [1, 2].map(() => ({
  exerciseName: "Chest Press",
  exerciseId: "chest-press",
  completed: true,
  weight: 100,
  reps: 10,
  rir: 2,
}));

describe("exercise load increments", () => {
  it("uses each available step without changing logged sets", () => {
    expect(suggestProgression(topSets, 6, 10, 2.5)).toMatchObject({ weight: 102.5 });
    expect(suggestProgression(topSets, 6, 10, 5)).toMatchObject({ weight: 105 });
    expect(topSets[0].weight).toBe(100);
  });

  it("suggests another rep when a machine step is too large", () => {
    const result = suggestProgression(topSets, 6, 10, 20);
    expect(result?.weight).toBe(100);
    expect(result?.note).toContain("one more total rep");
  });

  it("validates saved per-exercise steps", () => {
    const profile = { name: "Athlete", loadIncrements: { "chest-press": 2.5 } };
    expect(entitySchemas.UserProfile.safeParse(profile).success).toBe(true);
    expect(
      entitySchemas.UserProfile.safeParse({ ...profile, loadIncrements: { x: 0 } }).success
    ).toBe(false);
  });
});
