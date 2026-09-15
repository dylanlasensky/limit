// Nonessential browser storage must never prevent the app from opening.
export function storageGet(kind: "localStorage" | "sessionStorage", key: string) {
  try {
    return window[kind].getItem(key);
  } catch {
    return null;
  }
}
export function storageSet(kind: "localStorage" | "sessionStorage", key: string, value: string) {
  try {
    window[kind].setItem(key, value);
  } catch {
    /* Private mode / quota. */
  }
}
export function storageRemove(kind: "localStorage" | "sessionStorage", key: string) {
  try {
    window[kind].removeItem(key);
  } catch {
    /* Storage can be unavailable. */
  }
}

// Remove only LIMIT-owned private state. Never clear another app's storage.
export function clearPrivateState(userId?: string) {
  for (const kind of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[kind];
      for (const key of Object.keys(storage)) {
        if (
          key.startsWith("limit-tab-route:") ||
          key.startsWith("limit-scroll:") ||
          (userId && key === "limit-exercise-favorites:" + userId) ||
          (userId && key.startsWith("limit-workout-v2:" + userId + ":"))
        )
          storage.removeItem(key);
      }
    } catch {
      /* Logging out must still succeed. */
    }
  }
}
