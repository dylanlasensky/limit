export const tables = {
  BodyMeasurement: "body_measurement",
  DailyCheckIn: "daily_check_in",
  DietaryProfile: "dietary_profile",
  Exercise: "exercise",
  ExerciseSet: "exercise_set",
  FoodEntry: "food_entry",
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
  WorkoutExercise: "workout_exercise",
  WorkoutPlan: "workout_plan",
  WorkoutSession: "workout_session",
} as const;
export const relations = {
  WorkoutDay: {
    planId: "WorkoutPlan",
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
