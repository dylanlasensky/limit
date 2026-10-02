// The shipped website uses Vite. This adapter also keeps Expo web previews usable
// without requiring the experimental SQLite SharedArrayBuffer web runtime.
const prefix = (owner: string) => `limit-native-preview:${encodeURIComponent(owner)}:`;
const storageKey = (owner: string, key: string) => prefix(owner) + encodeURIComponent(key);
export const loadDraft = (owner: string, key: string) => {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(storageKey(owner, key)) || "null");
  } catch {
    return null;
  }
};
export const saveDraft = (owner: string, key: string, value: unknown) => {
  localStorage.setItem(storageKey(owner, key), JSON.stringify(value));
};
export const removeDraft = (owner: string, key: string) =>
  localStorage.removeItem(storageKey(owner, key));
export const clearDrafts = (owner: string) => {
  for (const key of Object.keys(localStorage))
    if (key.startsWith(prefix(owner))) localStorage.removeItem(key);
};
