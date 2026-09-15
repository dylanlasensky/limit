import React, { useRef, useState } from "react";
import { createFoodEntry } from "@/lib/food-entry";
import { today } from "@/components/limit/data";
import NativeSelect from "@/components/limit/NativeSelect";
import type { FoodScanResult } from "@/components/limit/foodImageAnalysis";
const fields = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"];
interface ScannedFoodEditorProps {
  result: FoodScanResult;
  onDone: () => void;
  initialMealType?: string;
  entryDate?: string;
  onSavingChange?: (saving: boolean) => void;
}
export default function ScannedFoodEditor({
  result,
  onDone,
  initialMealType = "Breakfast",
  entryDate,
  onSavingChange,
}: ScannedFoodEditorProps) {
  const pending = useRef(false);
  const [servings, setServings] = useState(1),
    [name, setName] = useState(result.title || "Scanned food"),
    [mealType, setMealType] = useState(initialMealType),
    [n, setN] = useState<Record<string, number>>(result.nutrients || {}),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    onSavingChange?.(true);
    setError("");
    try {
      await createFoodEntry({
        date: entryDate || today(),
        mealType,
        foodName: name,
        quantity: servings,
        unit: "servings",
        ...Object.fromEntries(
          fields.map((k) => [k, Math.round((+n[k] || 0) * servings * 10) / 10])
        ),
        entryMethod: "scan_food",
        estimated: !result.reliable,
      });
      onDone();
    } catch (e: any) {
      setError(e.message || "Couldn’t save. Your scan is still here. Please retry.");
      pending.current = false;
      setSaving(false);
      onSavingChange?.(false);
    }
  };
  return (
    <fieldset disabled={saving} className="min-w-0 space-y-4">
      <div>
        <p className="text-xs font-bold text-primary">NUTRITION FOUND</p>
        <input
          aria-label="Scanned food name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-border bg-transparent px-3 font-bold"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">
          Serving size
          <input
            value={result.servingSize || "1 serving"}
            readOnly
            className="mt-1 h-11 w-full rounded-xl border border-border bg-secondary px-3 text-foreground"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Servings eaten
          <input
            type="number"
            min=".25"
            step=".25"
            value={servings}
            onChange={(e) => setServings(+e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-transparent px-3 text-foreground"
          />
        </label>
      </div>
      {(result.servingsPerContainer ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          {result.servingsPerContainer} servings per container
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Values below are per serving. Consumed totals update automatically.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {fields.slice(0, 4).map((k) => (
          <label key={k} className="text-xs capitalize text-muted-foreground">
            {k}
            <input
              type="number"
              value={n[k] || 0}
              onChange={(e) => setN({ ...n, [k]: +e.target.value })}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-transparent px-3 text-foreground"
            />
          </label>
        ))}
      </div>
      <div className="rounded-xl bg-secondary p-3 text-sm text-foreground">
        <b>Consumed total</b>
        <p className="mt-1 text-muted-foreground">
          {Math.round((n.calories || 0) * servings)} cal · {Math.round((n.protein || 0) * servings)}
          g protein · {Math.round((n.carbs || 0) * servings)}g carbs ·{" "}
          {Math.round((n.fat || 0) * servings)}g fat
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
        disabled={saving || !name}
        onClick={save}
        className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground"
      >
        {saving ? "ADDING…" : "ADD FOOD"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
