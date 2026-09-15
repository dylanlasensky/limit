import { useState } from "react";
import { storageGet, storageSet } from "@/lib/storage";

export function readFavorites(userId: string): string[] {
  try {
    const saved = JSON.parse(
      storageGet("localStorage", "limit-exercise-favorites:" + userId) || "[]"
    );
    return Array.isArray(saved) ? saved.filter((x) => typeof x === "string").slice(0, 2000) : [];
  } catch {
    return [];
  }
}

// A per-account convenience on this device, not a claim of cloud synchronization.
export default function useExerciseFavorites(userId: string) {
  const [state, setState] = useState(() => ({ userId, keys: readFavorites(userId) }));
  const keys = state.userId === userId ? state.keys : readFavorites(userId);
  function toggle(key: string) {
    const next = keys.includes(key) ? keys.filter((x) => x !== key) : [...keys, key];
    storageSet("localStorage", "limit-exercise-favorites:" + userId, JSON.stringify(next));
    setState({ userId, keys: next });
  }
  return { favorites: new Set(keys), toggle };
}
