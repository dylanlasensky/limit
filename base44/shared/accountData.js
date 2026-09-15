// One inventory drives export and erasure; the shared exercise catalog is not personal data.
export const ACCOUNT_ENTITIES = [
  "ExerciseSet",
  "WorkoutSession",
  "WorkoutExercise",
  "WorkoutDay",
  "WorkoutPlan",
  "FoodEntry",
  "DietaryProfile",
  "MealRecommendation",
  "WeeklyMealPlan",
  "GroceryList",
  "PersonalRecord",
  "WeightEntry",
  "BodyMeasurement",
  "HealthMetric",
  "DailyCheckIn",
  "HealthConnection",
  "HealthPreference",
  "HealthImport",
  "MuscleRatingSnapshot",
  "UserProfile",
];

export function accountFilter(userId) {
  if (typeof userId !== "string" || !userId) throw new Error("Authenticated account required.");
  // Explicit ownership wins over creator metadata on server-created records.
  return {
    $or: [
      { ownerId: userId },
      {
        $and: [
          { created_by_id: userId },
          { $or: [{ ownerId: { $exists: false } }, { ownerId: null }, { ownerId: "" }] },
        ],
      },
    ],
  };
}

export async function readAccountRows(entity, userId) {
  const query = accountFilter(userId),
    rows = new Map();
  for (let skip = 0; skip < 100000; skip += 500) {
    const page = await entity.filter(query, "created_date", 500, skip);
    if (!Array.isArray(page)) throw new Error("Account data could not be read completely.");
    for (const row of page) {
      if (!row?.id || !(row.ownerId === userId || (!row.ownerId && row.created_by_id === userId)))
        throw new Error("Account data ownership could not be verified.");
      if (rows.has(row.id)) throw new Error("Account data changed during export. Please retry.");
      const { workoutLockToken, workoutLockUntil, ...data } = row;
      rows.set(row.id, data);
    }
    if (page.length < 500) return [...rows.values()];
  }
  throw new Error("Account export is too large for one request. Contact support.");
}

export async function exportAccountData(client, user, now = new Date()) {
  const entities = {};
  for (const name of ACCOUNT_ENTITIES)
    entities[name] = await readAccountRows(client.entities[name], user.id);
  return {
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    account: {
      id: user.id,
      email: user.email,
      name: user.full_name || user.name || "",
      createdAt: user.created_date,
    },
    entities,
    scope:
      "Saved LIMIT records. Original uploaded files, service logs, and AI-provider records are not included.",
  };
}

export async function deleteAccountData(client, userId) {
  const query = accountFilter(userId),
    db = client.asServiceRole.entities;
  // Do not remove the identity until every entity confirms erasure. A failed request can be retried.
  for (const name of ACCOUNT_ENTITIES) {
    const result = await db[name].deleteMany(query);
    if (result?.success !== true) throw new Error("Account data deletion was not confirmed.");
    const remaining = await db[name].filter(query, "created_date", 1);
    if (!Array.isArray(remaining) || remaining.length)
      throw new Error("Some account data remains. Retry deletion.");
  }
  const deleted = await db.User.delete(userId);
  if (deleted?.success !== true) throw new Error("Account identity deletion was not confirmed.");
}
