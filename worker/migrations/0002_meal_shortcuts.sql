CREATE TABLE meal_shortcut (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX meal_shortcut_owner ON meal_shortcut(owner_id);
CREATE UNIQUE INDEX food_entry_shortcut_log ON food_entry(owner_id, json_extract(data, '$.shortcutLogId')) WHERE json_extract(data, '$.shortcutLogId') IS NOT NULL;
