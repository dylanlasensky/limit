import { z } from "zod";

const usage = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

export const ownerOpsSchema = z.object({
  environment: z.string(),
  sourceRevision: z.string(),
  workerVersion: z.string(),
  email: z.object({
    ready: z.boolean(),
    senderConfigured: z.boolean(),
    keyConfigured: z.boolean(),
    enabled: z.boolean(),
    daily: usage,
    monthly: usage,
  }),
  storage: z.object({
    requestsThisMonth: usage,
    uploadedBytesLifetime: usage,
    uploadedObjectsLifetime: usage,
  }),
  ai: z.object({ requestsToday: usage }),
  errors: z.array(
    z.object({ day: z.string(), stage: z.string(), count: z.number().int().nonnegative() })
  ),
  scope: z.literal(
    "LIMIT application reservations and recorded Worker errors; account-wide Cloudflare usage is checked separately"
  ),
});

export type OwnerOps = z.infer<typeof ownerOpsSchema>;
