import { z } from "zod";
import { recordSchema, entityNames } from "./entities";
import { proposalSchema } from "./proposals";
import { parsedPlan } from "./importedPlan";
const summary = z.object({
  name: z.string(),
  durationMinutes: z.number().nonnegative(),
  workingSets: z.number().int().nonnegative(),
  volume: z.number().nonnegative(),
  prs: z.array(
    z
      .object({ exerciseName: z.string(), type: z.string(), value: z.number().finite() })
      .passthrough()
  ),
  ratingChanges: z.array(z.tuple([z.string(), z.number(), z.number()])).optional(),
  analyticsPending: z.boolean(),
  bestLift: z
    .object({ name: z.string(), weight: z.number(), reps: z.number() })
    .nullable()
    .optional(),
  previousVolume: z.number().nullable().optional(),
});
const commands = {
  check: z.object({ ok: z.literal(true), localDate: z.string(), authenticated: z.literal(true) }),
  start: z.object({
    session: recordSchema("WorkoutSession"),
    redirectWorkoutDayId: z.string().optional(),
  }),
  selectEquipmentProfile: z.object({ session: recordSchema("WorkoutSession") }),
  saveSet: z.object({ set: recordSchema("ExerciseSet") }),
  finish: z.object({ summary }),
  discard: z.object({ ok: z.literal(true) }),
  activatePlan: z.object({ plan: recordSchema("WorkoutPlan") }),
  changeSchedule: z.object({ change: recordSchema("WorkoutScheduleChange") }),
  undoScheduleChange: z.object({ change: recordSchema("WorkoutScheduleChange") }),
};
const schemas = {
  askLimitCoach: z.object({
    answer: z.string(),
    source: z.enum(["workers-ai", "deterministic"]),
    proposal: proposalSchema.nullable(),
    proposalError: z.string().nullable(),
    before: z.object({ name: z.string(), daysPerWeek: z.number().optional() }).nullable(),
  }),
  approvePlan: z.object({ plan: recordSchema("WorkoutPlan") }),
  deleteAccount: z.object({ success: z.literal(true), deleted: z.literal(true) }),
  exportAccount: z.object({
    schemaVersion: z.literal(1),
    exportedAt: z.string(),
    account: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      createdAt: z.string().optional(),
    }),
    entities: z.object(
      Object.fromEntries(
        entityNames.filter((n) => n !== "Exercise").map((n) => [n, recordSchema(n).array()])
      )
    ),
    scope: z.string(),
  }),
  parseWorkoutRegimen: parsedPlan,
  analyzeFoodPhoto: z.object({
    kind: z.literal("unknown"),
    title: z.string(),
    reliable: z.literal(false),
    message: z.string(),
    possibleAllergens: z.array(z.string()),
    nutrients: z.object({
      calories: z.literal(0),
      protein: z.literal(0),
      carbs: z.literal(0),
      fat: z.literal(0),
    }),
    items: z.array(z.never()),
    clarifyingQuestion: z.string(),
  }),
};
export function functionResponseSchema(
  name: string,
  input: unknown
): z.ZodType<Record<string, any>> {
  if (name === "workoutCommand") {
    const action = z
      .object({
        action: z.enum([
          "check",
          "start",
          "selectEquipmentProfile",
          "saveSet",
          "finish",
          "discard",
          "activatePlan",
          "changeSchedule",
          "undoScheduleChange",
        ]),
      })
      .parse(input).action;
    return commands[action];
  }
  if (!Object.hasOwn(schemas, name)) throw new Error("Unknown API action.");
  return schemas[name as keyof typeof schemas];
}
