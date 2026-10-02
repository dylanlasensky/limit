export type EmailBudget = { day: string; month: string; daily: number; monthly: number };
export function reserveEmailBudget(previous?: EmailBudget, now = new Date()): EmailBudget | null {
  const day = now.toISOString().slice(0, 10),
    month = day.slice(0, 7);
  const daily = previous?.day === day ? previous.daily : 0;
  const monthly = previous?.month === month ? previous.monthly : 0;
  // Preview + production together reserve at most 50/day and 1,000/month.
  if (daily >= 25 || monthly >= 500) return null;
  return { day, month, daily: daily + 1, monthly: monthly + 1 };
}
