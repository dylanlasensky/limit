import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await req.json().catch(() => ({}));
    if (payload.dryRun === true) return Response.json({ ok: true, authenticated: true });
    if (payload.confirm !== true) return Response.json({ error: 'Confirmation required' }, { status: 400 });
    const entityNames = ['UserProfile','WorkoutPlan','WorkoutDay','WorkoutExercise','WorkoutSession','ExerciseSet','FoodEntry','DietaryProfile','MealRecommendation','WeeklyMealPlan','GroceryList','PersonalRecord','WeightEntry','BodyMeasurement','MuscleRatingSnapshot'];
    await Promise.all(entityNames.map((name) => base44.asServiceRole.entities[name].deleteMany({ $or: [{ created_by_id: user.id }, { ownerId: user.id }] })));
    await base44.asServiceRole.entities.User.delete(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: 'Account deletion did not finish. Please retry before signing out.' }, { status: 500 });
  }
}