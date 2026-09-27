import { useEffect, useState } from "react";
type Clock = { exercise: number; pausedAt: number | null; pausedMs: number; rest: number | null };
const empty: Clock = { exercise: 0, pausedAt: null, pausedMs: 0, rest: null };
export function elapsedMilliseconds(
  start: number,
  now: number,
  pausedAt: number | null,
  pausedMs: number
) {
  return Math.max(0, (pausedAt ?? now) - start - pausedMs);
}
export default function useWorkoutClock(key: string) {
  const [state, setState] = useState<{ key: string; value: Clock }>({ key: "", value: empty });
  useEffect(() => {
    if (!key) return;
    let value = empty;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (
        saved &&
        Number.isInteger(saved.exercise) &&
        saved.exercise >= 0 &&
        Number.isFinite(saved.pausedMs)
      )
        value = {
          exercise: saved.exercise,
          pausedMs: Math.max(0, saved.pausedMs),
          pausedAt: Number.isFinite(saved.pausedAt) ? saved.pausedAt : null,
          rest: Number.isFinite(saved.rest) ? saved.rest : null,
        };
    } catch {
      /* Storage can be unavailable. */
    }
    setState({ key, value });
  }, [key]);
  useEffect(() => {
    if (!key || state.key !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      /* Storage can be unavailable. */
    }
  }, [key, state]);
  const update = (fn: (c: Clock) => Clock) =>
    setState((s) => ({ key, value: fn(s.key === key ? s.value : empty) }));
  const value = state.key === key ? state.value : empty;
  return {
    ...value,
    setExercise: (fn: (n: number) => number) => update((c) => ({ ...c, exercise: fn(c.exercise) })),
    setRest: (value: number | null | ((n: number | null) => number | null)) =>
      update((c) => ({ ...c, rest: typeof value === "function" ? value(c.rest) : value })),
    togglePause: () =>
      update((c) => {
        const now = Date.now();
        return c.pausedAt === null
          ? { ...c, pausedAt: now }
          : {
              ...c,
              pausedAt: null,
              pausedMs: c.pausedMs + now - c.pausedAt,
              rest: c.rest ? c.rest + now - c.pausedAt : null,
            };
      }),
  };
}
