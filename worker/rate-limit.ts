import { ApiError } from "./errors";
export async function rateLimit(db: D1Database, key: string, max: number, seconds = 60) {
  const now = Date.now(),
    reset = now + seconds * 1000;
  const row = await db
    .prepare(
      `INSERT INTO api_rate_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at <= ? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at <= ? THEN ? ELSE reset_at END RETURNING count`
    )
    .bind(key, reset, now, now, reset)
    .first<{ count: number }>();
  if (!row || row.count > max)
    throw new ApiError("Too many requests. Please try again shortly.", 429, "RATE_LIMITED");
}
