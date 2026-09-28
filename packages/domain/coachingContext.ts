import { adultNutritionAvailable } from "./coachSafety.js";
import { validateNutrition } from "./proposals";

export function coachingContext(
  profile: Record<string, any>,
  diet: Record<string, any> | undefined,
  sessions: Record<string, any>[],
  today = new Date().toISOString().slice(0, 10)
) {
  const recent = sessions.filter(
    (s) =>
      s.status === "completed" &&
      typeof s.date === "string" &&
      s.date <= today &&
      Date.parse(today) - Date.parse(s.date) < 14 * 86400000
  );
  const lines = [
    `You completed ${recent.length} workout${recent.length === 1 ? "" : "s"} in the last two weeks.`,
  ];
  if (profile.availableDays?.length)
    lines.push(
      `Your saved schedule has ${profile.availableDays.length} training days per week, with ${profile.sessionLength || "your chosen"} minutes per session. Build consistency with that schedule before adding more sessions.`
    );
  const restrictions = [
    ...(diet?.allergies || []),
    ...(diet?.intolerances || []),
    ...(diet?.foodsToAvoid || []),
    ...(diet?.dietaryPreferences || []),
  ];
  if (restrictions.length)
    lines.push(
      `Your saved food constraints: ${[...new Set(restrictions)].join(", ")}. Check ingredient labels and cross-contact information; this coach does not clear foods as allergy-safe.`
    );
  if (profile.injuries?.length)
    lines.push(
      "You listed a movement limitation. Automatic new plans are paused until you have appropriate professional guidance."
    );
  try {
    const targets = validateNutrition(
      {
        calories: profile.calorieTarget,
        protein: profile.proteinTarget,
        carbs: profile.carbTarget,
        fat: profile.fatTarget,
      },
      adultNutritionAvailable(profile.birthDate, today)
    );
    lines.push(
      `Your existing saved target is ${targets.calories} calories, ${targets.protein} g protein, ${targets.carbs} g carbohydrate and ${targets.fat} g fat. These are your saved estimates; this conversation does not change them.`
    );
  } catch {
    /* Missing, unsafe or non-adult targets are never repeated as advice. */
  }
  return lines.join("\n\n");
}
