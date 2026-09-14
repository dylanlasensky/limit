import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createFoodEntry, validateFoodEntry } from "@/lib/food-entry";
import { today, sumMacros } from "@/components/limit/data";
import NativeSelect from "@/components/limit/NativeSelect";
import type { FoodScanResult, ScannedMealItem } from "@/components/limit/foodImageAnalysis";
const macroKeys = ["calories", "protein", "carbs", "fat"];
const nutrientKeys = [...macroKeys, "fiber", "sugar", "sodium"];
interface ScannedMealEditorProps {
  result: FoodScanResult;
  conflicts: string[];
  onDone: () => void;
  initialMealType?: string;
}
export default function ScannedMealEditor({
  result,
  conflicts,
  onDone,
  initialMealType = "Dinner",
}: ScannedMealEditorProps) {
  const [items, setItems] = useState<ScannedMealItem[]>(result.items || []),
    [mealType, setMealType] = useState(initialMealType),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const totals = useMemo(() => sumMacros(items), [items]);
  const edit = (i: number, k: string, v: string) =>
    setItems((a) =>
      a.map((x, j) => {
        if (j !== i) return x;
        if (k === "amount") {
          const next = +v,
            ratio = x.amount && next ? next / x.amount : 1;
          return {
            ...x,
            amount: next,
            ...Object.fromEntries(
              nutrientKeys.map((m) => [m, Math.round((x[m] || 0) * ratio * 10) / 10])
            ),
          };
        }
        return { ...x, [k]: k === "name" || k === "unit" ? v : +v };
      })
    );
  const remove = (i: number) => setItems((a) => a.filter((_, j) => j !== i));
  const add = () =>
    setItems((a) => [
      ...a,
      { name: "", amount: 1, unit: "serving", calories: 0, protein: 0, carbs: 0, fat: 0 },
    ]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      for (const item of items)
        validateFoodEntry({ ...item, foodName: item.name, quantity: item.amount, mealType });
      await createFoodEntry({
        date: today(),
        mealType,
        foodName:
          items
            .map((x) => x.name)
            .filter(Boolean)
            .join(", ") || "Scanned meal",
        quantity: 1,
        unit: "meal",
        ...Object.fromEntries(
          nutrientKeys.map((k) => [k, items.reduce((sum, x) => sum + (+x[k] || 0), 0)])
        ),
        entryMethod: "scan_meal",
        estimated: true,
      });
      onDone();
    } catch (e: any) {
      setError(e.message || "Couldn’t save. Your meal is still here. Please retry.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold text-blue-500">AI MEAL ESTIMATE</p>
        <p className="mt-1 text-xs text-zinc-400">
          Estimated nutrition — adjust any food or portion before logging.
        </p>
      </div>
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-red-500/60 bg-red-950/40 p-3">
          <b className="text-red-300">Possible allergy conflict</b>
          <p className="mt-1 text-xs text-red-200">
            This meal may contain {conflicts.join(", ")}. Verify ingredients before eating; visual
            AI cannot confirm allergens.
          </p>
        </div>
      )}
      {items.map((x, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex gap-2">
            <input
              aria-label={`Food ${i + 1} name`}
              value={x.name}
              onChange={(e) => edit(i, "name", e.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent font-bold"
            />
            <button aria-label={`Remove food ${i + 1}`} onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label={`Food ${i + 1} amount`}
              type="number"
              value={x.amount || ""}
              onChange={(e) => edit(i, "amount", e.target.value)}
              className="h-10 rounded-lg border border-zinc-700 bg-transparent px-2"
            />
            <input
              aria-label={`Food ${i + 1} unit`}
              value={x.unit || ""}
              onChange={(e) => edit(i, "unit", e.target.value)}
              className="h-10 rounded-lg border border-zinc-700 bg-transparent px-2"
            />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {macroKeys.map((k) => (
              <label key={k} className="text-[10px] uppercase text-zinc-500">
                {k === "calories" ? "cal" : k}
                <input
                  type="number"
                  value={x[k] || 0}
                  onChange={(e) => edit(i, k, e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-800 bg-transparent px-1 text-center text-xs text-white"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 text-sm font-bold text-blue-500">
        <Plus className="h-4 w-4" />
        Add missing food
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="rounded-xl border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500">ESTIMATED TOTAL</p>
        <b className="text-2xl">{Math.round(totals.calories)} calories</b>
        <p className="mt-1 text-sm text-zinc-400">
          {Math.round(totals.protein)}g protein · {Math.round(totals.carbs)}g carbs ·{" "}
          {Math.round(totals.fat)}g fat
        </p>
      </div>
      <NativeSelect
        value={mealType}
        onChange={setMealType}
        options={[
          { value: "Breakfast", label: "Breakfast" },
          { value: "Lunch", label: "Lunch" },
          { value: "Dinner", label: "Dinner" },
          { value: "Snacks", label: "Snack" },
        ]}
        label="Meal"
      />
      <button
        disabled={saving || !items.length}
        onClick={save}
        className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white"
      >
        {saving ? "LOGGING…" : "LOG MEAL"}
      </button>
    </div>
  );
}
