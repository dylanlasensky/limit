import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { loadSavedMealWeek, saveMealWeek } from "@/lib/meal-plans";
import { createFoodEntry } from "@/lib/food-entry";
import { format, startOfWeek } from "date-fns";
import useLocalDate from "@/hooks/use-local-date";
import {
  buildWeek,
  sumMacros,
  today,
  type DietaryProfile,
  type PlannedMeal,
} from "@/components/limit/data";
import MealCard from "@/components/limit/MealCard";
import MealDetail from "@/components/limit/MealDetail";
import MealPrepCard from "@/components/limit/MealPrepCard";
import GroceryListPanel from "@/components/limit/GroceryListPanel";
interface MealPlannerProps {
  profile: Record<string, any>;
  onLogged: () => void;
  mode?: string;
}
export default function MealPlanner({ profile, onLogged, mode }: MealPlannerProps) {
  const currentDate = useLocalDate();
  const currentWeek = format(
    startOfWeek(new Date(`${currentDate}T12:00:00`), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const [diet, setDiet] = useState<DietaryProfile>({}),
    [savedWeekId, setSavedWeekId] = useState<string>(),
    [week, setWeek] = useState<PlannedMeal[][]>([]),
    [day, setDay] = useState(0),
    [detail, setDetail] = useState<PlannedMeal | undefined>(),
    [selected, setSelected] = useState<Array<PlannedMeal["key"]>>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loadError, setLoadError] = useState(false);
  const run = async (action: () => Promise<void>, success: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("Couldn’t save this change. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setWeek([]);
    setSelected([]);
    base44.entities.DietaryProfile.list()
      .then(async (x: any[]) => {
        const saved = await loadSavedMealWeek(x[0] || {});
        if (cancelled) return;
        setDiet(x[0] || {});
        setSavedWeekId(saved?.id);
        setWeek(saved?.week || buildWeek(profile, x[0] || {}));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profile.calorieTarget, currentWeek]);
  const add = async (m: PlannedMeal) => {
    await createFoodEntry({
      date: today(),
      mealType: m.mealType,
      foodName: m.name,
      quantity: 1,
      unit: "serving",
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      entryMethod: "meal_plan",
      estimated: true,
    });
    onLogged();
  };
  const swap = (m: PlannedMeal, i: number) => {
    const nw = buildWeek(profile, diet);
    const replacement = nw[(day + 1) % 7].find((x) => x.mealType === m.mealType);
    if (replacement)
      setWeek((w) =>
        w.map((d, di) =>
          di === day
            ? d.map((x, mi) =>
                mi === i ? { ...replacement, key: x.key, generatedForDate: x.generatedForDate } : x
              )
            : d
        )
      );
  };
  if (loadError)
    return (
      <p role="alert">
        Couldn’t load your meal plan and dietary preferences. Reopen this section to retry.
      </p>
    );
  if (!week.length) return <p role="status">Loading meal ideas…</p>;
  const totals = sumMacros(week[day]);
  const saveWeek = async () => {
    const saved = await saveMealWeek(week, savedWeekId);
    setSavedWeekId(saved.id);
  };
  return (
    <div>
      {message && (
        <p role="status" className="mb-3 rounded-xl border border-border p-3 text-sm">
          {message}
        </p>
      )}
      <fieldset disabled={busy} className="min-w-0">
        {mode === "Meal Plan" && (
          <MealPrepCard
            meal={week[day].find((x) => x.mealType === "Lunch")}
            onAdd={(m) => {
              setSelected((s) => [...new Set([...s, m.key])]);
              setWeek((w) => w.map((day) => day.map((meal) => (meal.key === m.key ? m : meal))));
              setMessage(
                `${m.servings} batch servings selected for groceries. Nutrition shown is per serving.`
              );
            }}
          />
        )}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {week.map((_, i) => (
            <button
              key={i}
              onClick={() => setDay(i)}
              aria-pressed={day === i}
              className={`min-w-14 rounded-xl px-2 py-3 text-xs font-semibold ${day === i ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
            </button>
          ))}
        </div>
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">
          <b>Planned day</b>
          <p>
            {totals.calories} cal · {totals.protein}g protein
            {profile.calorieTarget ? ` · Your target: ${profile.calorieTarget} cal` : ""}
          </p>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Estimated meal ideas filtered by your saved restrictions, not a complete nutrition
          prescription. Check portions, labels, and ingredients.
        </p>
        <div className="grid items-start gap-3 md:grid-cols-2">
          {week[day].length < 4 && (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground md:col-span-2">
              Some meal slots have no matching ideas for your restrictions. Add your own food
              without relaxing your exclusions.
            </p>
          )}
          {week[day].map((m, i) => (
            <MealCard
              key={m.key}
              meal={m}
              selected={selected.includes(m.key)}
              onSelect={() =>
                setSelected((s) =>
                  s.includes(m.key) ? s.filter((x) => x !== m.key) : [...s, m.key]
                )
              }
              onOpen={() => setDetail(m)}
              onAdd={() => void run(() => add(m), "Added to today’s food log.")}
              onSwap={() => swap(m, i)}
            />
          ))}
        </div>
        <div className="mt-5">
          <button
            onClick={() => void run(saveWeek, "Week saved.")}
            disabled={!week.flat().length}
            className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            Save week
          </button>
        </div>
        <GroceryListPanel meals={week.flat().filter((meal) => selected.includes(meal.key))} />
      </fieldset>
      <MealDetail meal={detail} onClose={() => setDetail(undefined)} />
    </div>
  );
}
