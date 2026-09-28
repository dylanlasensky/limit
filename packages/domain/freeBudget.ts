export type Budget = { period: string; count: number; bytes: number; objects: number };

// Each environment reserves far less than the shared account's R2 free allowance.
// Reservations are never refunded, including failed writes and deleted objects.
export function reserveBudget(
  old: Budget | undefined,
  kind: "storage" | "ai",
  bytes: number,
  now = new Date()
): Budget | null {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > 8 * 1024 * 1024) return null;
  const period = now.toISOString().slice(0, kind === "ai" ? 10 : 7);
  const previous = old || { period, count: 0, bytes: 0, objects: 0 };
  const count = previous.period === period ? previous.count : 0;
  if (
    count >= (kind === "ai" ? 10 : 20000) ||
    previous.bytes + bytes > 256 * 1024 * 1024 ||
    (bytes > 0 && previous.objects >= 1000)
  )
    return null;
  return {
    period,
    count: count + 1,
    bytes: previous.bytes + bytes,
    objects: previous.objects + (bytes > 0 ? 1 : 0),
  };
}
