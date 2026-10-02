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
  reviewStatus: z.enum(["missing", "draft", "technical", "blocked", "approved"]),
  reviewer: z.string().max(200).nullable(),
  safetyClassification: z.enum(["general", "coaching-recommended"]),
  textFallback: z.array(z.string().max(2000)).max(20),
  license: z.string().max(1000).nullable(),
  generated: z.boolean().default(false),
  technicalChecks: z.array(z.string().max(100)).max(20).default([]),
  videoSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable()
    .default(null),
  posterSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable()
    .default(null),
  reviewEvidence: z.string().max(500).nullable().default(null),
  blockReason: z.string().max(2000).default(""),
});
export type ExerciseMedia = z.infer<typeof mediaSchema>;

export function playableMedia(media: ExerciseMedia) {
  if (!media.source || !media.format || !media.license) return false;
  if (media.reviewStatus === "approved") return !!(media.reviewer && media.reviewEvidence);
  return (
    media.reviewStatus === "technical" &&
    media.generated &&
    !!media.videoSha256 &&
    ["exact-catalog-key", "fixed-framing", "silent", "h264-yuv420p", "full-decode"].every((check) =>
      media.technicalChecks.includes(check)
    )
  );
}
