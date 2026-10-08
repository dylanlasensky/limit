import { describe, expect, it } from "vitest";
import { workoutCommandSchema } from "../../packages/contracts/workout";

describe("prior-client workout command compatibility", () => {
  it("accepts every existing command payload without a schedule version or override field", () => {
    const priorClientCommands = [
      { action: "check", timezone: "UTC" },
      { action: "activatePlan", planId: "plan-1" },
      { action: "start", workoutDayId: "day-1", timezone: "UTC" },
      { action: "discard", sessionId: "session-1" },
      { action: "finish", sessionId: "session-1", expectedSets: [] },
      {
        action: "saveSet",
        sessionId: "session-1",
        row: {
          workoutExerciseId: "exercise-1",
          setNumber: 1,
          operationId: "retry-safe-id",
          weight: "100",
          reps: "5",
          completed: true,
        },
      },
    ];
    for (const payload of priorClientCommands) {
      const result = workoutCommandSchema.safeParse(payload);
      expect(result.success, JSON.stringify(payload)).toBe(true);
    }
  });

  it("keeps new date commands separate from prior-client workout commands", () => {
    expect(
      workoutCommandSchema.safeParse({
        action: "changeSchedule",
        planId: "plan-1",
        fromDate: "2026-10-08",
        toDate: "2026-10-09",
        mode: "swap",
        timezone: "UTC",
      }).success
    ).toBe(true);
    expect(
      workoutCommandSchema.safeParse({
        action: "start",
        workoutDayId: "day-1",
        timezone: "UTC",
      }).success
    ).toBe(true);
  });
});
