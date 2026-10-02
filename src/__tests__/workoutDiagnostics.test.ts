// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import workoutCommand from "../../worker/workout-command";

afterEach(() => vi.restoreAllMocks());

describe("workout failure diagnostics", () => {
  it("identifies a failed set create without logging private data or changing the response", async () => {
    const privateText = "PRIVATE-D1-DETAIL";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const entities = {
      UserProfile: { list: async () => [{ equipment: [] }] },
      WorkoutSession: {
        get: async () => ({
          id: "session-1",
          ownerId: "user-1",
          status: "active",
          workoutDayId: "day-1",
          planId: "plan-1",
        }),
      },
      WorkoutExercise: {
        get: async () => ({
          id: "exercise-1",
          ownerId: "user-1",
          workoutDayId: "day-1",
          exerciseName: "Push-Up",
          primaryMuscle: "Chest",
          category: "Strength",
        }),
      },
      WorkoutPlan: { get: async () => ({ id: "plan-1" }) },
      ExerciseSet: {
        filter: async () => [],
        create: async () => {
          throw new Error(privateText);
        },
      },
    };
    const client = {
      auth: { me: async () => ({ id: "user-1" }) },
      entities,
      asServiceRole: { entities },
    };
    const request = new Request("https://internal/workout", {
      method: "POST",
      body: JSON.stringify({
        action: "saveSet",
        sessionId: "session-1",
        row: {
          workoutExerciseId: "exercise-1",
          setNumber: 2,
          operationId: "secret-operation-id",
          weight: "50",
          reps: "5",
          completed: true,
          setType: "warmup",
        },
      }),
    });
    const response = await workoutCommand(request, client);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Could not sync this workout. Your draft is kept; please retry.",
    });
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: "workout_command_failure",
        action: "saveSet",
        stage: "create-set",
      })
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateText);
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-operation-id");
  });
});
