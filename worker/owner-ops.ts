import { ownerOpsSchema } from "../packages/contracts/ownerOps";
import { emailConfigured } from "./email";
import { ApiError } from "./errors";

export async function ownerOperations(env: Env, userId: string) {
  if (!env.OWNER_USER_ID || userId !== env.OWNER_USER_ID)
    throw new ApiError("Not found.", 404, "NOT_FOUND");
  const [storage, ai, email, errors] = await Promise.all([
    env.ACCOUNT_COORDINATOR.getByName("system-storage-budget").inspectBudget(),
    env.ACCOUNT_COORDINATOR.getByName("system-ai-budget").inspectBudget(),
    env.ACCOUNT_COORDINATOR.getByName("system-email-budget").inspectEmailBudget(),
    env.DB.prepare(
      "SELECT day, stage, count FROM operational_error_count WHERE day >= ? ORDER BY day DESC, count DESC LIMIT 50"
    )
      .bind(new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
      .all<{ day: string; stage: string; count: number }>(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  return Response.json(
    ownerOpsSchema.parse({
      environment: env.ENVIRONMENT,
      sourceRevision: env.SOURCE_REVISION,
      workerVersion: env.CF_VERSION_METADATA?.id || "local",
      email: {
        ready: emailConfigured(env),
        senderConfigured: !!env.EMAIL_FROM,
        keyConfigured: !!env.RESEND_API_KEY,
        enabled: env.EMAIL_ENABLED === "true",
        daily: { used: email?.day === today ? email.daily : 0, limit: 25 },
        monthly: { used: email?.month === month ? email.monthly : 0, limit: 500 },
      },
      storage: {
        requestsThisMonth: { used: storage?.period === month ? storage.count : 0, limit: 20000 },
        uploadedBytesLifetime: { used: storage?.bytes || 0, limit: 256 * 1024 * 1024 },
        uploadedObjectsLifetime: { used: storage?.objects || 0, limit: 1000 },
      },
      ai: { requestsToday: { used: ai?.period === today ? ai.count : 0, limit: 10 } },
      errors: errors.results,
      scope:
        "LIMIT application reservations and recorded Worker errors; account-wide Cloudflare usage is checked separately",
    }),
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
