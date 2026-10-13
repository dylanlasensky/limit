export const tables = {
  BodyMeasurement: "body_measurement",
  DailyCheckIn: "daily_check_in",
  DietaryProfile: "dietary_profile",
  Exercise: "exercise",
  ExerciseSet: "exercise_set",
  FoodEntry: "food_entry",
  MealShortcut: "meal_shortcut",
  GroceryList: "grocery_list",
  HealthConnection: "health_connection",
  HealthImport: "health_import",
  HealthMetric: "health_metric",
  HealthPreference: "health_preference",
  MealRecommendation: "meal_recommendation",
  MuscleRatingSnapshot: "muscle_rating_snapshot",
  PersonalRecord: "personal_record",
  UserProfile: "user_profile",
  WeeklyMealPlan: "weekly_meal_plan",
  WeightEntry: "weight_entry",
  WorkoutDay: "workout_day",
  WorkoutScheduleChange: "workout_schedule_change",
  WorkoutExercise: "workout_exercise",
  WorkoutPlan: "workout_plan",
  WorkoutSession: "workout_session",
} as const;
export const relations = {
  WorkoutDay: {
    planId: "WorkoutPlan",
  },
  WorkoutScheduleChange: {
    planId: "WorkoutPlan",
    fromDayId: "WorkoutDay",
    toDayId: "WorkoutDay",
  },
  WorkoutExercise: {
    workoutDayId: "WorkoutDay",
    exerciseId: "Exercise",
  },
  WorkoutSession: {
    workoutDayId: "WorkoutDay",
    planId: "WorkoutPlan",
  },
  ExerciseSet: {
    workoutSessionId: "WorkoutSession",
    workoutExerciseId: "WorkoutExercise",
    exerciseId: "Exercise",
  },
  PersonalRecord: {
    workoutSessionId: "WorkoutSession",
    exerciseId: "Exercise",
  },
  MuscleRatingSnapshot: {
    workoutSessionId: "WorkoutSession",
  },
} as const;
