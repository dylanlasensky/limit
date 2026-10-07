import { z } from "zod";
const id = z.string().min(1).max(150);
const numeric = z.union([z.string().max(20), z.number()]);
export const workoutCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check"), timezone: z.string().min(1).max(100) }),
  z.object({ action: z.literal("activatePlan"), planId: id }),
  z.object({ action: z.literal("start"), workoutDayId: id, timezone: z.string().min(1).max(100) }),
  z.object({ action: z.literal("discard"), sessionId: id }),
  z.object({
    action: z.literal("selectEquipmentProfile"),
    sessionId: id,
    equipmentProfileId: id.nullable(),
  }),
  z.object({
    action: z.literal("finish"),
    sessionId: id,
    pausedMilliseconds: z.number().int().min(0).max(604800000).optional(),
    expectedSets: z.array(z.object({ id, revision: z.string().max(100) })).max(1000),
  }),
  z.object({
    action: z.literal("saveSet"),
    sessionId: id,
    row: z.object({
      workoutExerciseId: id,
      exerciseId: id.optional(),
      setNumber: z.number().int().min(1).max(30),
      operationId: z.string().min(1).max(100),
      revision: z.string().max(100).optional(),
      weight: numeric,
      reps: numeric,
      rir: numeric.nullable().optional(),
      completed: z.boolean(),
      setType: z.enum(["working", "warmup"]).optional(),
    }),
  }),
]);
export type WorkoutCommand = z.infer<typeof workoutCommandSchema>;
