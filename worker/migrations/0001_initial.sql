PRAGMA foreign_keys = ON;
CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, emailVerified INTEGER NOT NULL DEFAULT 0, image TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
CREATE TABLE session (id TEXT PRIMARY KEY, expiresAt INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, ipAddress TEXT, userAgent TEXT, userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE);
CREATE INDEX session_user ON session(userId);
CREATE TABLE account (id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, accessToken TEXT, refreshToken TEXT, idToken TEXT, accessTokenExpiresAt INTEGER, refreshTokenExpiresAt INTEGER, scope TEXT, password TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
CREATE INDEX account_user ON account(userId);
CREATE TABLE verification (id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expiresAt INTEGER NOT NULL, createdAt INTEGER, updatedAt INTEGER);
CREATE INDEX verification_identifier ON verification(identifier);
CREATE TABLE rateLimit (id TEXT PRIMARY KEY, key TEXT UNIQUE, count INTEGER, lastRequest INTEGER);
CREATE TABLE body_measurement (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX body_measurement_owner ON body_measurement(owner_id);
CREATE INDEX body_measurement_date ON body_measurement(owner_id, json_extract(data, '$.date'));
CREATE TABLE daily_check_in (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX daily_check_in_owner ON daily_check_in(owner_id);
CREATE INDEX daily_check_in_date ON daily_check_in(owner_id, json_extract(data, '$.date'));
CREATE TABLE dietary_profile (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX dietary_profile_owner ON dietary_profile(owner_id);
CREATE TABLE exercise (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX exercise_owner ON exercise(owner_id);
CREATE TABLE exercise_set (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  "workoutSessionId" TEXT REFERENCES workout_session(id) ON DELETE CASCADE,
  "workoutExerciseId" TEXT REFERENCES workout_exercise(id) ON DELETE CASCADE,
  "exerciseId" TEXT REFERENCES exercise(id) ON DELETE RESTRICT
);
CREATE INDEX exercise_set_owner ON exercise_set(owner_id);
CREATE INDEX exercise_set_workoutSessionId ON exercise_set("workoutSessionId");
CREATE INDEX exercise_set_workoutExerciseId ON exercise_set("workoutExerciseId");
CREATE INDEX exercise_set_exerciseId ON exercise_set("exerciseId");
CREATE TABLE food_entry (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX food_entry_owner ON food_entry(owner_id);
CREATE INDEX food_entry_date ON food_entry(owner_id, json_extract(data, '$.date'));
CREATE TABLE grocery_list (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX grocery_list_owner ON grocery_list(owner_id);
CREATE TABLE health_connection (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX health_connection_owner ON health_connection(owner_id);
CREATE INDEX health_connection_status ON health_connection(owner_id, json_extract(data, '$.status'));
CREATE TABLE health_import (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX health_import_owner ON health_import(owner_id);
CREATE INDEX health_import_status ON health_import(owner_id, json_extract(data, '$.status'));
CREATE TABLE health_metric (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX health_metric_owner ON health_metric(owner_id);
CREATE INDEX health_metric_date ON health_metric(owner_id, json_extract(data, '$.date'));
CREATE TABLE health_preference (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX health_preference_owner ON health_preference(owner_id);
CREATE TABLE meal_recommendation (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX meal_recommendation_owner ON meal_recommendation(owner_id);
CREATE TABLE muscle_rating_snapshot (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  "workoutSessionId" TEXT REFERENCES workout_session(id) ON DELETE CASCADE
);
CREATE INDEX muscle_rating_snapshot_owner ON muscle_rating_snapshot(owner_id);
CREATE INDEX muscle_rating_snapshot_workoutSessionId ON muscle_rating_snapshot("workoutSessionId");
CREATE INDEX muscle_rating_snapshot_date ON muscle_rating_snapshot(owner_id, json_extract(data, '$.date'));
CREATE TABLE personal_record (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  "workoutSessionId" TEXT REFERENCES workout_session(id) ON DELETE CASCADE,
  "exerciseId" TEXT REFERENCES exercise(id) ON DELETE RESTRICT
);
CREATE INDEX personal_record_owner ON personal_record(owner_id);
CREATE INDEX personal_record_workoutSessionId ON personal_record("workoutSessionId");
CREATE INDEX personal_record_exerciseId ON personal_record("exerciseId");
CREATE INDEX personal_record_date ON personal_record(owner_id, json_extract(data, '$.date'));
CREATE TABLE user_profile (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX user_profile_owner ON user_profile(owner_id);
CREATE TABLE weekly_meal_plan (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX weekly_meal_plan_owner ON weekly_meal_plan(owner_id);
CREATE TABLE weight_entry (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX weight_entry_owner ON weight_entry(owner_id);
CREATE INDEX weight_entry_date ON weight_entry(owner_id, json_extract(data, '$.date'));
CREATE TABLE workout_day (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  "planId" TEXT REFERENCES workout_plan(id) ON DELETE CASCADE
);
CREATE INDEX workout_day_owner ON workout_day(owner_id);
CREATE INDEX workout_day_planId ON workout_day("planId");
CREATE TABLE workout_exercise (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  "workoutDayId" TEXT REFERENCES workout_day(id) ON DELETE CASCADE,
  "exerciseId" TEXT REFERENCES exercise(id) ON DELETE RESTRICT
);
CREATE INDEX workout_exercise_owner ON workout_exercise(owner_id);
CREATE INDEX workout_exercise_workoutDayId ON workout_exercise("workoutDayId");
CREATE INDEX workout_exercise_exerciseId ON workout_exercise("exerciseId");
CREATE TABLE workout_plan (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data))
);
CREATE INDEX workout_plan_owner ON workout_plan(owner_id);
CREATE INDEX workout_plan_active ON workout_plan(owner_id, json_extract(data, '$.active'));
CREATE TABLE workout_session (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  "workoutDayId" TEXT REFERENCES workout_day(id) ON DELETE CASCADE,
  "planId" TEXT REFERENCES workout_plan(id) ON DELETE CASCADE
);
CREATE INDEX workout_session_owner ON workout_session(owner_id);
CREATE INDEX workout_session_workoutDayId ON workout_session("workoutDayId");
CREATE INDEX workout_session_planId ON workout_session("planId");
CREATE INDEX workout_session_date ON workout_session(owner_id, json_extract(data, '$.date'));
CREATE INDEX workout_session_status ON workout_session(owner_id, json_extract(data, '$.status'));
CREATE UNIQUE INDEX user_profile_single ON user_profile(owner_id);
CREATE UNIQUE INDEX dietary_profile_single ON dietary_profile(owner_id);
CREATE UNIQUE INDEX workout_one_active ON workout_session(owner_id) WHERE json_extract(data, '$.status') = 'active';
CREATE UNIQUE INDEX set_row_unique ON exercise_set(owner_id, workoutSessionId, json_extract(data, '$.rowKey'));
CREATE TABLE uploads (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, object_key TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE exercise_media (catalog_key TEXT PRIMARY KEY REFERENCES exercise(id), version INTEGER NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE api_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
