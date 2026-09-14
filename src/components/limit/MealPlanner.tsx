import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { loadSavedMealWeek, saveMealWeek } from "@/lib/meal-plans";
import { createFoodEntry } from "@/lib/food-entry";
import {
  buildWeek,
  sumMacros,
  today,
  weekStart,
  type DietaryProfile,
  type PlannedMeal,
} from "@/components/limit/data";
import { format } from "date-fns";
import MealCard from "@/components/limit/MealCard";
import MealDetail from "@/components/limit/MealDetail";
import MealPrepCard from "@/components/limit/MealPrepCard";
interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  category: string;
  checked: boolean;
}
interface MealPlannerProps {
  profile: Record<string, any>;
  onLogged: () => void;
  mode?: string;
}
export default function MealPlanner({ profile, onLogged, mode }: MealPlannerProps) {
  const [diet, setDiet] = useState<DietaryProfile>({}),
    [savedWeekId, setSavedWeekId] = useState<string>(),
    [week, setWeek] = useState<PlannedMeal[][]>([]),
    [day, setDay] = useState(0),
    [detail, setDetail] = useState<PlannedMeal | undefined>(),
    [selected, setSelected] = useState<Array<PlannedMeal["key"]>>([]),
    [list, setList] = useState<GroceryItem[]>([]),
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
  }, [profile.calorieTarget]);
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
  const groceries = async () => {
    const meals = week.flat().filter((x) => selected.includes(x.key));
    const all = meals.flatMap((x) =>
      x.ingredients.map((ingredient) => ({ ...ingredient, portions: x.servings || 1 }))
    );
    const map: Record<string, number> = {};
    all.forEach((x) => {
      map[x.name] = (map[x.name] || 0) + x.portions;
    });
    const items = Object.entries(map).map(([name, qty]) => ({
      name,
      qty,
      unit: "recipe portion(s)",
      category: all.find((x) => x.name === name)?.category || "Other",
      checked: false,
    }));
    setList(items);
    await base44.entities.GroceryList.create({
      weekStart: format(weekStart(), "yyyy-MM-dd"),
      sourceMealIds: selected,
      items,
    });
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
              className={`min-w-14 rounded-xl px-2 py-3 text-xs font-bold ${day === i ? "bg-zinc-950 text-white dark:bg-blue-600 dark:text-white" : "bg-white dark:bg-zinc-900"}`}
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
        <p className="mb-4 text-xs text-zinc-500">
          Estimated meal ideas filtered by your saved restrictions, not a complete nutrition
          prescription. Check portions, labels, and ingredients.
        </p>
        <div className="space-y-3">
          {week[day].length < 4 && (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
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
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => void run(saveWeek, "Week saved.")}
            disabled={!week.flat().length}
            className="h-12 rounded-xl bg-zinc-950 font-bold text-white dark:bg-blue-600 dark:text-white"
          >
            Save week
          </button>
          <button
            disabled={!selected.length}
            onClick={() => void run(groceries, "Grocery list saved.")}
            className="h-12 rounded-xl border font-bold disabled:opacity-40"
          >
            Grocery list ({selected.length})
          </button>
        </div>
        {list.length > 0 && (
          <section className="mt-4 rounded-2xl bg-white p-4 dark:bg-zinc-900">
            <h3 className="font-bold">Grocery list</h3>
            {list.map((x, i) => (
              <label key={x.name} className="mt-3 flex gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={x.checked}
                  onChange={() =>
                    setList((l) => l.map((v, j) => (j === i ? { ...v, checked: !v.checked } : v)))
                  }
                />
                <span className={x.checked ? "line-through text-zinc-400" : ""}>
                  {x.name} × {x.qty}
                </span>
              </label>
            ))}
          </section>
        )}
      </fieldset>
      <MealDetail meal={detail} onClose={() => setDetail(undefined)} />
    </div>
  );
}
