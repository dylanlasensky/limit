import { base44 } from "@/api/base44Client";
import { epley } from "@/lib/training/e1rm";

// Compact, structured coach context. Small targeted queries — never raw record dumps.
export async function buildCoachContext() {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [profiles, plans, foods, sessions, records, snapshots, weights, diets] = await Promise.all([
    base44.entities.UserProfile.list(),
    base44.entities.WorkoutPlan.filter({ active: true }, "-created_date", 1),
    base44.entities.FoodEntry.filter({ date }),
    base44.entities.WorkoutSession.filter({ status: "completed" }, "-date", 5),
    base44.entities.PersonalRecord.list("-date", 8),
    base44.entities.MuscleRatingSnapshot.list("-date", 1),
    base44.entities.WeightEntry.list("-date", 8),
    base44.entities.DietaryProfile.list(),
  ]);
  const p: any = profiles[0] || {},
    plan = plans[0],
    snap = snapshots[0],
    diet: any = diets[0] || {};
  const days: any[] = plan ? await base44.entities.WorkoutDay.filter({ planId: plan.id }) : [];
  const todayDay = days.find((d) => d.weekday === (new Date().getDay() + 6) % 7);
  const macros = foods.reduce(
    (a, f: any) => ({
      calories: a.calories + (f.calories || 0),
      protein: a.protein + (f.protein || 0),
      carbs: a.carbs + (f.carbs || 0),
      fat: a.fat + (f.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return {
    profile: {
      name: p.name,
      goal: p.fitnessGoal,
      experience: p.experienceLevel,
      weightLb: p.currentWeight,
      goalWeightLb: p.goalWeight,
    },
    program: plan
      ? {
          name: plan.name,
          daysPerWeek: plan.daysPerWeek,
          week: days.map(
            (d) => `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.weekday]}: ${d.name}`
          ),
        }
      : null,
    today: todayDay ? { workout: todayDay.isRest ? "Rest" : todayDay.name } : null,
    recentWorkouts: sessions.map((s: any) => ({
      name: s.name,
      date: s.date,
      minutes: s.durationMinutes,
      sets: s.setCount,
      volumeLb: s.totalVolume,
      prs: s.prCount,
    })),
    recentPRs: records.map((r: any) => ({
      exercise: r.exerciseName,
      type: r.type,
      value: r.value,
      date: r.date,
    })),
    muscleRating: snap
      ? { overall: `${snap.overallLevel} ${snap.overallScore}`, muscles: snap.muscleScores }
      : null,
    nutritionToday: {
      eaten: macros,
      targets: {
        calories: p.calorieTarget,
        protein: p.proteinTarget,
        carbs: p.carbTarget,
        fat: p.fatTarget,
      },
    },
    weightTrendLb: weights.map(
      (w: any) => `${w.date}: ${w.unit === "kg" ? Math.round(w.weight * 2.20462) : w.weight}`
    ),
    restrictions: { allergies: diet.allergies || [], preferences: diet.dietaryPreferences || [] },
  };
}

export const e1rmOf = (weight: number, reps: number): number => Math.round(epley(weight, reps));
