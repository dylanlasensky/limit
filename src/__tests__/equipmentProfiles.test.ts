import { describe, expect, it } from "vitest";
import { entitySchemas } from "../../packages/contracts/entities";
import { workoutCommandSchema } from "../../packages/contracts/workout";
import { equipmentAvailable, equipmentPool, suitableReplacement } from "@/lib/training/exerciseSelection";

describe("session equipment profiles", () => {
  it("validates named gear sets and session selection commands", () => {
    const profiles = [{ id: "home", name: "Home", equipment: ["Dumbbells", "Bench"] }];
    expect(entitySchemas.UserProfile.shape.equipmentProfiles?.safeParse(profiles).success).toBe(true);
    expect(entitySchemas.UserProfile.shape.equipmentProfiles?.safeParse([
      { id: "home", name: "Home", equipment: [] },
    ]).success).toBe(false);
    expect(workoutCommandSchema.safeParse({
      action: "selectEquipmentProfile", sessionId: "session-1", equipmentProfileId: "home",
    }).success).toBe(true);
  });

  it("previews compatible substitutions for limited gear", () => {
    const source = {
      id: "barbell-row", name: "Barbell Row", equipment: "Barbell",
      primaryMuscle: "Lats", category: "Compound", movementPattern: "Horizontal pull",
      difficulty: "Intermediate", programEligible: true,
    };
    const candidate = { ...source, id: "dumbbell-row", name: "Dumbbell Row", equipment: "Dumbbell" };
    const home = { equipment: ["Dumbbells", "Bench"] };
    expect(equipmentAvailable(source, equipmentPool(home))).toBe(false);
    expect(suitableReplacement(source, candidate, home)).toBe(true);
    expect(suitableReplacement(source, candidate, { equipment: ["Bodyweight only"] })).toBe(false);
  });
});
