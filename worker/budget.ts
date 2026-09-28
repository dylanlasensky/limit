import { ApiError } from "./errors";
export async function storageBudget(env: Env, bytes = 0) {
  const allowed = await env.ACCOUNT_COORDINATOR.getByName("system-storage-budget").reserve(
    "storage",
    bytes
  );
  if (!allowed)
    throw new ApiError(
      "The free storage allowance for this test app is reached. Your workout drafts stay on this device.",
      503,
      "FREE_LIMIT_REACHED"
    );
}
export async function aiBudget(env: Env) {
  const allowed = await env.ACCOUNT_COORDINATOR.getByName("system-ai-budget").reserve("ai", 0);
  if (!allowed)
    throw new ApiError(
      "Today’s free AI allowance is used. Deterministic guidance and workout logging are still available.",
      503,
      "FREE_LIMIT_REACHED"
    );
}
