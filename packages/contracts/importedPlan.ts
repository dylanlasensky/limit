import { z } from "zod";
export const parsedPlan = z.object({
  name: z.string().min(1).max(160),
  notes: z.string().max(3000).optional(),
  days: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        weekday: z.number().int().min(0).max(6).optional(),
        coachMandated: z.boolean().optional(),
        fixedSchedule: z.boolean().optional(),
        exercises: z
          .array(
            z.object({
              name: z.string().min(1).max(160),
              sets: z.number().int().min(1).max(6),
              repMin: z.number().int().min(1).max(30),
              repMax: z.number().int().min(1).max(50),
              restSeconds: z.number().int().min(30).max(300),
              notes: z.string().max(2000).optional(),
              progressionNotes: z.string().max(2000).optional(),
              coachMandated: z.boolean().optional(),
            })
          )
          .min(1)
          .max(10),
      })
    )
    .min(1)
    .max(7),
});
