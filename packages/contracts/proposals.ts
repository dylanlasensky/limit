import { z } from "zod";
const row = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  primaryMuscle: z.string(),
  equipment: z.string(),
  category: z.string(),
  sets: z.number().int().min(1).max(6),
  repMin: z.number().int().min(1).max(30),
  repMax: z.number().int().min(1).max(50),
  restSeconds: z.number().int().min(30).max(300),
  order: z.number().int(),
  notes: z.string(),
  progressionNotes: z.string(),
});
export const proposalSchema = z.object({
  id: z.string(),
  name: z.string(),
  explanation: z.string(),
  createdAt: z.string(),
  profileRevision: z.string(),
  previousPlanId: z.string().nullable(),
  days: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        name: z.string(),
        isRest: z.boolean(),
        exercises: z.array(row).max(10),
      })
    )
    .length(7),
});
export type PlanProposal = z.infer<typeof proposalSchema>;
