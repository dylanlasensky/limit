import { z } from "zod";
export const entitySchemas = {
  BodyMeasurement: z.object({
    date: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    waist: z.number().finite().min(0).max(1000000).optional(),
    chest: z.number().finite().min(0).max(1000000).optional(),
    arms: z.number().finite().min(0).max(1000000).optional(),
    thighs: z.number().finite().min(0).max(1000000).optional(),
    hips: z.number().finite().min(0).max(1000000).optional(),
    shoulders: z.number().finite().min(0).max(1000000).optional(),
    unit: z.string().max(2000).optional(),
  }),
  DailyCheckIn: z.object({
    date: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    energy: z.number().finite().min(1).max(5).nullable().optional(),
    soreness: z.number().finite().min(1).max(5).nullable().optional(),
    mood: z.number().finite().min(1).max(5).nullable().optional(),
    stress: z.number().finite().min(1).max(5).nullable().optional(),
    sleepQuality: z.number().finite().min(1).max(5).nullable().optional(),
    note: z.string().max(1000).optional(),
    tags: z.array(z.string().max(2000)).max(20).optional(),
  }),
  DietaryProfile: z.object({
    allergies: z.array(z.string().max(2000)).max(1000).optional(),
    intolerances: z.array(z.string().max(2000)).max(1000).optional(),
    foodsToAvoid: z.array(z.string().max(2000)).max(1000).optional(),
    dietaryPreferences: z.array(z.string().max(2000)).max(1000).optional(),
    likedFoods: z.array(z.string().max(2000)).max(1000).optional(),
    dislikedFoods: z.array(z.string().max(2000)).max(1000).optional(),
    preferredProteinSources: z.array(z.string().max(2000)).max(1000).optional(),
    cookingSkill: z.string().max(2000).optional(),
    maxCookingTime: z.string().max(2000).optional(),
    budgetFriendly: z.boolean().optional(),
    mealPrepPreference: z.boolean().optional(),
  }),
  Exercise: z.object({
    catalogKey: z.string().max(2000).optional(),
    catalogVersion: z.number().finite().min(0).max(1000000).optional(),
    aliases: z.array(z.string().max(2000)).max(1000).optional(),
    movementPattern: z.string().max(2000).optional(),
    difficulty: z.string().max(2000).optional(),
    trainingFocus: z.string().max(2000).optional(),
    programEligible: z.boolean().optional(),
    selectionPriority: z.number().finite().min(0).max(1000000).optional(),
    instructions: z.array(z.string().max(2000)).max(1000).optional(),
    coachingRecommended: z.boolean().optional(),
    name: z.string().max(2000),
    primaryMuscle: z.string().max(2000),
    secondaryMuscles: z.array(z.string().max(2000)).max(1000).optional(),
    equipment: z.string().max(2000).optional(),
    category: z.string().max(2000).optional(),
    repMin: z.number().finite().min(0).max(1000000).optional(),
    repMax: z.number().finite().min(0).max(1000000).optional(),
  }),
  ExerciseSet: z.object({
    workoutSessionId: z.string().max(2000),
    workoutExerciseId: z.string().max(2000).optional(),
    rowKey: z.string().max(2000).optional(),
    revision: z.string().max(2000).optional(),
    exerciseId: z.string().max(2000).optional(),
    exerciseName: z.string().max(2000),
    primaryMuscle: z.string().max(2000).optional(),
    setNumber: z.number().finite().min(0).max(1000000),
    setType: z.enum(["working", "warmup", "drop", "failure"] as const).optional(),
    weight: z.number().finite().min(0).max(1000000).optional(),
    reps: z.number().finite().min(0).max(1000000).optional(),
    rir: z.number().finite().min(0).max(1000000).optional(),
    completed: z.boolean().optional(),
    timestamp: z.string().max(2000).optional(),
  }),
  FoodEntry: z.object({
    date: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snacks"] as const),
    foodName: z.string().max(2000),
    quantity: z.number().finite().min(0).max(1000000).optional(),
    unit: z.string().max(2000).optional(),
    calories: z.number().finite().min(0).max(1000000).optional(),
    protein: z.number().finite().min(0).max(1000000).optional(),
    carbs: z.number().finite().min(0).max(1000000).optional(),
    fat: z.number().finite().min(0).max(1000000).optional(),
    fiber: z.number().finite().min(0).max(1000000).optional(),
    sugar: z.number().finite().min(0).max(1000000).optional(),
    sodium: z.number().finite().min(0).max(1000000).optional(),
    entryMethod: z.string().max(2000).optional(),
    estimated: z.boolean().optional(),
  }),
  GroceryList: z.object({
    weekStart: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    sourceMealIds: z.array(z.string().max(2000)).max(1000).optional(),
    items: z
      .array(z.record(z.string().max(100), z.unknown()))
      .max(1000)
      .optional(),
  }),
  HealthConnection: z.object({
    provider: z.enum(["apple_health", "health_connect"] as const),
    status: z.enum(["connected", "disconnected", "needs_attention"] as const),
    permissionStatus: z.string().max(120).optional(),
    capabilities: z.array(z.string().max(2000)).max(1000).optional(),
    deviceNames: z.array(z.string().max(120)).max(20).optional(),
    lastSyncedAt: z.string().max(2000).optional(),
    lastSyncMessage: z.string().max(2000).optional(),
  }),
  HealthImport: z.object({
    provider: z.enum(["apple_health", "health_connect"] as const),
    startedAt: z.string().max(2000),
    completedAt: z.string().max(2000).optional(),
    status: z.enum(["running", "succeeded", "failed"] as const),
    createdCount: z.number().finite().int().min(0).max(1000000).optional(),
    updatedCount: z.number().finite().int().min(0).max(1000000).optional(),
    unchangedCount: z.number().finite().int().min(0).max(1000000).optional(),
    message: z.string().max(240).optional(),
  }),
  HealthMetric: z.object({
    date: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    recordedAt: z.string().max(2000).optional(),
    metric: z.enum([
      "steps",
      "active_calories",
      "distance",
      "exercise_minutes",
      "sleep_duration",
      "sleep_score",
      "resting_heart_rate",
      "heart_rate_variability",
      "respiratory_rate",
      "oxygen_saturation",
      "readiness_score",
      "stress_score",
      "weight",
      "body_fat",
      "fat_mass",
      "lean_body_mass",
      "skeletal_muscle_mass",
      "body_water",
      "bone_mass",
      "visceral_fat",
      "waist_circumference",
      "hip_circumference",
    ] as const),
    value: z.number().finite().min(0).max(1000000),
    unit: z.string().max(2000),
    source: z.enum([
      "manual",
      "limit",
      "apple_health",
      "health_connect",
      "oura",
      "whoop",
      "garmin",
      "fitbit",
      "withings",
      "other",
    ] as const),
    sourceRecordId: z.string().max(240).optional(),
    sourceDevice: z.string().max(120).optional(),
    aggregation: z.enum(["daily", "sample"] as const).optional(),
    importedAt: z.string().max(2000).optional(),
    metadata: z.record(z.string().max(100), z.unknown()).optional(),
  }),
  HealthPreference: z.object({
    hiddenMetrics: z
      .array(
        z.enum([
          "steps",
          "active_calories",
          "distance",
          "exercise_minutes",
          "sleep_duration",
          "sleep_score",
          "resting_heart_rate",
          "heart_rate_variability",
          "respiratory_rate",
          "oxygen_saturation",
          "readiness_score",
          "stress_score",
          "weight",
          "body_fat",
          "fat_mass",
          "lean_body_mass",
          "skeletal_muscle_mass",
          "body_water",
          "bone_mass",
          "visceral_fat",
          "waist_circumference",
          "hip_circumference",
        ] as const)
      )
      .max(22),
    preferredSources: z.record(z.string().max(100), z.unknown()),
  }),
  MealRecommendation: z.object({
    name: z.string().max(2000),
    mealType: z.string().max(2000),
    ingredients: z
      .array(
        z.object({
          name: z.string().max(200),
          quantity: z.string().max(100),
          category: z.string().max(100),
        })
      )
      .max(1000)
      .optional(),
    servingSize: z.string().max(2000).optional(),
    servings: z.number().finite().min(0).max(1000000).optional(),
    calories: z.number().finite().min(0).max(1000000).optional(),
    protein: z.number().finite().min(0).max(1000000).optional(),
    carbs: z.number().finite().min(0).max(1000000).optional(),
    fat: z.number().finite().min(0).max(1000000).optional(),
    instructions: z.array(z.string().max(2000)).max(1000).optional(),
    prepMinutes: z.number().finite().min(0).max(1000000).optional(),
    estimatedNutrition: z.boolean().optional(),
    generatedForDate: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    selected: z.boolean().optional(),
  }),
  MuscleRatingSnapshot: z.object({
    date: z.string().max(2000),
    workoutSessionId: z.string().max(2000).optional(),
    overallLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Elite"] as const),
    overallScore: z.number().finite().min(0).max(1000000),
    muscleScores: z.record(z.string().max(100), z.number()).optional(),
    muscleLevels: z
      .record(z.string().max(100), z.enum(["Beginner", "Intermediate", "Advanced", "Elite"]))
      .optional(),
    confidence: z.record(z.string().max(100), z.number()).optional(),
    details: z
      .record(
        z.enum([
          "Chest",
          "Shoulders",
          "Back",
          "Biceps",
          "Triceps",
          "Quads",
          "Hamstrings",
          "Glutes",
          "Calves",
          "Core",
        ]),
        z.object({
          score: z.number(),
          level: z.enum(["Beginner", "Intermediate", "Advanced", "Elite"]),
          confidence: z.number(),
          sets: z.number(),
          sessions: z.number(),
          exercises: z.array(z.string().optional()),
          best: z.array(
            z.object({
              score: z.number(),
              weight: z.number(),
              session: z.string().optional(),
              exercise: z.string().optional(),
              load: z.number(),
              reps: z.number(),
              e1rm: z.number(),
              kind: z.enum(["compound", "dumbbell", "bodyweight", "machine", "isolation"]),
            })
          ),
        })
      )
      .optional(),
  }),
  PersonalRecord: z.object({
    workoutSessionId: z.string().max(2000).optional(),
    exerciseId: z.string().max(2000).optional(),
    exerciseName: z.string().max(2000),
    type: z.string().max(2000),
    value: z.number().finite().min(0).max(1000000),
    weight: z.number().finite().min(0).max(1000000).optional(),
    reps: z.number().finite().min(0).max(1000000).optional(),
    date: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  UserProfile: z.object({
    name: z.string().max(2000),
    birthDate: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    sex: z.string().max(2000).optional(),
    heightCm: z.number().finite().min(0).max(1000000).optional(),
    heightFeet: z.number().finite().min(0).max(1000000).optional(),
    heightInches: z.number().finite().min(0).max(1000000).optional(),
    currentWeight: z.number().finite().min(0).max(1000000).optional(),
    goalWeight: z.number().finite().min(0).max(1000000).optional(),
    activityLevel: z.string().max(2000).optional(),
    fitnessGoal: z.string().max(2000).optional(),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    injuries: z.array(z.string().min(1).max(200)).max(20).optional(),
    trainingDays: z.array(z.string().max(2000)).max(1000).optional(),
    availableDays: z.array(z.string().max(2000)).max(1000).optional(),
    sessionLength: z.number().finite().min(0).max(1000000).optional(),
    priorityMuscles: z.array(z.string().max(2000)).max(1000).optional(),
    equipment: z.array(z.string().max(2000)).max(1000).optional(),
    workoutSplit: z.string().max(2000).optional(),
    calorieTarget: z.number().finite().min(0).max(1000000).optional(),
    proteinTarget: z.number().finite().min(0).max(1000000).optional(),
    carbTarget: z.number().finite().min(0).max(1000000).optional(),
    fatTarget: z.number().finite().min(0).max(1000000).optional(),
    targetsCustomized: z.boolean().optional(),
    targetExplanation: z.string().max(2000).optional(),
    measurementSystemVersion: z.string().max(2000).optional(),
    units: z.enum(["imperial", "metric"] as const).optional(),
    onboardingComplete: z.boolean().optional(),
  }),
  WeeklyMealPlan: z.object({
    weekStart: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    mealIds: z.array(z.string().max(2000)).max(1000).optional(),
    calorieTotalsByDay: z.record(z.string().max(100), z.unknown()).optional(),
    macroTotalsByDay: z.record(z.string().max(100), z.unknown()).optional(),
  }),
  WeightEntry: z.object({
    date: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    weight: z.number().finite().min(0).max(1000000),
    unit: z.enum(["lb", "kg"] as const).optional(),
  }),
  WorkoutDay: z.object({
    planId: z.string().max(2000).optional(),
    weekday: z.number().finite().min(0).max(1000000),
    name: z.string().max(2000),
    targetMuscles: z.array(z.string().max(2000)).max(1000).optional(),
    isRest: z.boolean().optional(),
    coachMandated: z.boolean().optional(),
    fixedSchedule: z.boolean().optional(),
  }),
  WorkoutExercise: z.object({
    workoutDayId: z.string().max(2000),
    exerciseId: z.string().max(2000).optional(),
    exerciseName: z.string().max(2000),
    primaryMuscle: z.string().max(2000).optional(),
    category: z.string().max(2000).optional(),
    equipment: z.string().max(2000).optional(),
    order: z.number().finite().min(0).max(1000000).optional(),
    sets: z.number().finite().min(0).max(1000000).optional(),
    repMin: z.number().finite().min(0).max(1000000).optional(),
    repMax: z.number().finite().min(0).max(1000000).optional(),
    restSeconds: z.number().finite().min(0).max(1000000).optional(),
    notes: z.string().max(2000).optional(),
    progressionNotes: z.string().max(2000).optional(),
    importedName: z.string().max(2000).optional(),
    matchConfidence: z.number().finite().min(0).max(1000000).optional(),
    coachMandated: z.boolean().optional(),
  }),
  WorkoutPlan: z.object({
    name: z.string().max(2000),
    description: z.string().max(2000).optional(),
    goal: z.string().max(2000).optional(),
    daysPerWeek: z.number().finite().min(0).max(1000000).optional(),
    programType: z.string().max(2000).optional(),
    sessionDurationTarget: z.number().finite().min(0).max(1000000).optional(),
    priorityMuscles: z.array(z.string().max(2000)).max(1000).optional(),
    recommended: z.boolean().optional(),
    active: z.boolean().optional(),
    sourceType: z
      .enum(["limit_generated", "pasted_text", "uploaded_file", "manual"] as const)
      .optional(),
    sport: z.string().max(2000).optional(),
    seasonPhase: z
      .enum(["in_season", "off_season", "pre_season", "not_applicable"] as const)
      .optional(),
    coachProvided: z.boolean().optional(),
    athleteMode: z
      .enum(["track_only", "smart_progression", "accessory_suggestions"] as const)
      .optional(),
    structureLocked: z.boolean().optional(),
    importNotes: z.string().max(2000).optional(),
  }),
  WorkoutSession: z.object({
    workoutDayId: z.string().max(2000).optional(),
    planId: z.string().max(2000).optional(),
    name: z.string().max(2000),
    date: z
      .string()
      .max(2000)
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string().max(2000).optional(),
    startedAt: z.string().max(2000).optional(),
    completedAt: z.string().max(2000).optional(),
    durationMinutes: z.number().finite().min(0).max(1000000).optional(),
    status: z.enum(["active", "completed", "skipped"] as const),
    targetMuscles: z.array(z.string().max(2000)).max(1000).optional(),
    timeBudget: z
      .object({
        minutes: z.number().int().min(20).max(120),
        estimatedMinutes: z.number().int().nonnegative(),
        exercises: z
          .array(z.object({ id: z.string().max(2000), sets: z.number().int().min(1).max(30) }))
          .max(100),
      })
      .optional(),
    notes: z.string().max(2000).optional(),
    totalVolume: z.number().finite().min(0).max(1000000).optional(),
    setCount: z.number().finite().min(0).max(1000000).optional(),
    prCount: z.number().finite().min(0).max(1000000).optional(),
    completionSummary: z.record(z.string().max(100), z.unknown()).optional(),
    analyticsStatus: z.enum(["pending", "complete"] as const).optional(),
  }),
} as const;
export type EntityName = keyof typeof entitySchemas;
export type EntityData<N extends EntityName> = z.infer<(typeof entitySchemas)[N]>;
export type SavedRecord<N extends EntityName> = EntityData<N> & {
  id: string;
  created_by_id: string;
  ownerId: string;
  created_date: string;
  updated_date: string;
};
export const entityNames = Object.keys(entitySchemas) as EntityName[];
export const metadataSchema = z.object({
  id: z.string().min(1),
  created_by_id: z.string(),
  ownerId: z.string(),
  created_date: z.string(),
  updated_date: z.string(),
});
export function recordSchema<N extends EntityName>(
  name: N
): z.ZodIntersection<(typeof entitySchemas)[N], typeof metadataSchema> {
  return z.intersection(entitySchemas[name], metadataSchema);
}
export const errorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  requestId: z.string().optional(),
});
export type ApiUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  created_date?: string;
  full_name?: string;
};
