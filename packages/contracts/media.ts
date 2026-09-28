import { z } from "zod";
const objectKey = z
  .string()
  .regex(/^[a-z0-9][a-z0-9/_.-]{0,240}$/i)
  .refine((s) => !s.includes(".."));
export const mediaSchema = z.object({
  catalogKey: z.string().min(1),
  poster: objectKey.nullable(),
  source: objectKey.nullable(),
  format: z.enum(["mp4", "webm"]).nullable(),
  caption: z.string().max(4000),
  angle: z.enum(["front", "side", "three-quarter", "multiple", "unspecified"]),
  duration: z.number().nonnegative().max(300),
  version: z.number().int().positive(),
  reviewStatus: z.enum(["missing", "draft", "approved"]),
  reviewer: z.string().max(200).nullable(),
  safetyClassification: z.enum(["general", "coaching-recommended"]),
  textFallback: z.array(z.string().max(2000)).max(20),
  license: z.string().max(1000).nullable(),
});
export type ExerciseMedia = z.infer<typeof mediaSchema>;
