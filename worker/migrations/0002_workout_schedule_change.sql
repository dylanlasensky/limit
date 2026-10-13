CREATE TABLE workout_schedule_change (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  "planId" TEXT REFERENCES workout_plan(id) ON DELETE CASCADE,
  "fromDayId" TEXT REFERENCES workout_day(id) ON DELETE CASCADE,
  "toDayId" TEXT REFERENCES workout_day(id) ON DELETE CASCADE
);
CREATE INDEX workout_schedule_change_owner_plan ON workout_schedule_change(owner_id, "planId");
CREATE INDEX workout_schedule_change_owner_date ON workout_schedule_change(owner_id, json_extract(data, '$.fromDate'));
