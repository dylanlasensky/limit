import { openDatabaseSync } from "expo-sqlite";
const db = openDatabaseSync("limit-drafts.db");
db.execSync(
  "CREATE TABLE IF NOT EXISTS drafts (key TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL)"
);
export const loadDraft = (owner: string, key: string) => {
  const row = db.getFirstSync<{ payload: string }>(
    "SELECT payload FROM drafts WHERE key=? AND owner=?",
    key,
    owner
  );
  try {
    return row ? JSON.parse(row.payload) : null;
  } catch {
    return null;
  }
};
export const saveDraft = (owner: string, key: string, value: unknown) =>
  db.runSync(
    "INSERT INTO drafts(key,owner,payload) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload WHERE owner=excluded.owner",
    key,
    owner,
    JSON.stringify(value)
  );
export const removeDraft = (owner: string, key: string) =>
  db.runSync("DELETE FROM drafts WHERE key=? AND owner=?", key, owner);
export const clearDrafts = (owner: string) => db.runSync("DELETE FROM drafts WHERE owner=?", owner);
