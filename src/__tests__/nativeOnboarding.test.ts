import { beforeEach, describe, expect, it, vi } from "vitest";
import { exerciseCatalog } from "../../packages/domain/exerciseCatalog";
import { finishNativeOnboarding, validateAnswers } from "../../apps/mobile/src/lib/onboarding";
import * as api from "../../apps/mobile/src/lib/api";

vi.mock("../../apps/mobile/src/lib/api", () => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  bulkCreate: vi.fn(),
  command: vi.fn(),
}));

const answers = {
  name: "Jordan",
  fitnessGoal: "general fitness",
  experienceLevel: "beginner" as const,
  sessionLength: 60,
  equipment: ["Full commercial gym"],
  availableDays: ["Monday", "Wednesday", "Friday"],
};

describe("native onboarding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an explicit valid training schedule", () => {
    expect(validateAnswers({ ...answers, availableDays: ["Monday"] })).toContain("2–6");
    expect(validateAnswers({ ...answers, availableDays: ["Monday", "Monday"] })).toContain("2–6");
    expect(validateAnswers(answers)).toBeNull();
  });

  it("saves a complete inactive graph before activation and marks onboarding complete", async () => {
    let planActivated = false;
    vi.mocked(api.list).mockImplementation(async (name) => {
      if (name === "WorkoutSession" || name === "UserProfile") return [] as never;
      if (name === "Exercise")
        return exerciseCatalog.map((row) => ({ ...row, id: row.catalogKey })) as never;
      throw new Error(`Unexpected list ${name}`);
    });
    vi.mocked(api.create).mockImplementation(
      async (name, data) => ({ ...(data as object), id: name + "-1", ownerId: "owner" }) as never
    );
    vi.mocked(api.bulkCreate).mockImplementation(
      async (name, rows) =>
        rows.map((row, index) => ({
          ...(row as object),
          id: `${name}-${index}`,
          ownerId: "owner",
        })) as never
    );
    vi.mocked(api.update).mockImplementation(
      async (_name, _id, data) =>
        ({ ...(data as object), id: "UserProfile-1", ownerId: "owner" }) as never
    );
    vi.mocked(api.command).mockImplementation(async (input) => {
      const days = vi.mocked(api.bulkCreate).mock.calls.find(([name]) => name === "WorkoutDay");
      const exercises = vi
        .mocked(api.bulkCreate)
        .mock.calls.find(([name]) => name === "WorkoutExercise");
      expect(days?.[1]).toHaveLength(7);
      expect(exercises?.[1].length).toBeGreaterThan(0);
      expect(
        vi.mocked(api.create).mock.calls.find(([name]) => name === "WorkoutPlan")?.[1]
      ).toMatchObject({ active: false });
      planActivated = true;
      return { plan: { id: (input as any).planId, active: true } } as never;
    });

    const plan = await finishNativeOnboarding(answers, "owner");
    expect(plan.active).toBe(true);
    expect(planActivated).toBe(true);
    expect(vi.mocked(api.update).mock.calls.at(-1)).toEqual([
      "UserProfile",
      "UserProfile-1",
      { onboardingComplete: true },
    ]);
  });

  it("never activates an incomplete program", async () => {
    vi.mocked(api.list).mockImplementation(async (name) => {
      if (name === "WorkoutSession" || name === "UserProfile" || name === "Exercise")
        return [] as never;
      throw new Error(`Unexpected list ${name}`);
    });
    vi.mocked(api.create).mockResolvedValue({ id: "profile", ownerId: "owner" } as never);
    await expect(finishNativeOnboarding(answers, "owner")).rejects.toThrow("No suitable exercises");
    expect(api.command).not.toHaveBeenCalled();
    expect(vi.mocked(api.create).mock.calls.some(([name]) => name === "WorkoutPlan")).toBe(false);
  });
});
