import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFoodEntry, validateFoodEntry } from "@/lib/food-entry";
import { today } from "@/components/limit/data";
import NativeSelect from "@/components/limit/NativeSelect";
const units = ["oz", "lb", "cups", "tbsp", "tsp", "servings", "pieces"];
interface ManualFoodForm {
  mealType: string;
  quantity: number;
  unit: string;
  estimated: boolean;
  foodName?: string;
  [key: string]: any;
}
interface ManualFoodProps {
  onDone: (saved?: boolean) => void;
  entryMethod?: string;
  estimated?: boolean;
  initialMealType?: string;
  entryDate?: string;
  onSavingChange?: (saving: boolean) => void;
}
export default function ManualFood({
  onDone,
  entryMethod = "manual",
  estimated = false,
  initialMealType = "Breakfast",
  entryDate,
  onSavingChange,
}: ManualFoodProps) {
  const [f, setF] = useState<ManualFoodForm>({
      mealType: initialMealType,
      quantity: 1,
      unit: "servings",
      estimated,
    }),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    client = useQueryClient(),
    set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const submitting = useRef(false);
  const save = async () => {
    if (submitting.current) return;
    try {
      validateFoodEntry(f);
    } catch (e: any) {
      setError(e.message);
      return;
    }
    submitting.current = true;
    const date = entryDate || today(),
      item = { ...f, date, entryMethod },
      key = ["foodEntries", date],
      optimistic = { ...item, id: `pending-${Date.now()}` };
    setSaving(true);
    onSavingChange?.(true);
    setError("");
    try {
      await client.cancelQueries({ queryKey: key });
      // An unresolved diary is not an empty diary. Never seed a partial list
      // while its first read is still pending or unavailable.
      client.setQueryData(key, (old: any[] | undefined) =>
        Array.isArray(old) ? [...old, optimistic] : old
      );
      const saved = await createFoodEntry(item);
      client.setQueryData(key, (old: any[] | undefined) =>
        Array.isArray(old)
          ? [...old.filter((x) => x.id !== optimistic.id && x.id !== saved.id), saved]
          : old
      );
      void client.invalidateQueries({ queryKey: key });
      onDone(true);
      void client.invalidateQueries({ queryKey: ["recentFoods"] });
    } catch {
      client.setQueryData(key, (old: any[] | undefined) =>
        Array.isArray(old) ? old.filter((x) => x.id !== optimistic.id) : old
      );
      void client.invalidateQueries({ queryKey: key });
      setError("Couldn’t add this food. Check your connection and try again.");
      setSaving(false);
      onSavingChange?.(false);
      submitting.current = false;
    }
  };
  return (
    <fieldset disabled={saving} className="min-w-0 space-y-3">
      <input
        aria-label="Food name"
        className="h-12 w-full rounded-xl border border-border bg-transparent px-3"
        placeholder={entryMethod === "search" ? "Food name" : "Food name"}
        value={f.foodName || ""}
        onChange={(e) => set("foodName", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          aria-label="Quantity"
          type="number"
          inputMode="decimal"
          value={f.quantity}
          onChange={(e) => set("quantity", +e.target.value)}
          className="h-12 min-w-0 rounded-xl border border-border bg-transparent px-3"
        />
        <NativeSelect
          value={f.unit}
          onChange={(v) => set("unit", v)}
          options={units}
          label="Unit"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Enter nutrition totals for the full portion you ate.
      </p>
      <NativeSelect
        value={f.mealType}
        onChange={(v) => set("mealType", v)}
        options={["Breakfast", "Lunch", "Dinner", { value: "Snacks", label: "Snack" }]}
        label="Meal"
      />
      <div className="grid grid-cols-2 gap-2">
        {["calories", "protein", "carbs", "fat"].map((x) => (
          <label key={x} className="text-xs capitalize text-muted-foreground">
            {x}
            {x !== "calories" ? " (g)" : ""}
            <input
              type="number"
              inputMode="decimal"
              className="mt-1 h-12 w-full rounded-xl border border-border bg-transparent px-3"
              value={f[x] ?? ""}
              onChange={(e) => set(x, e.target.value === "" ? "" : +e.target.value)}
            />
          </label>
        ))}
      </div>
      {estimated && (
        <p className="text-xs text-muted-foreground">
          Restaurant nutrition can vary. This entry will be marked as estimated.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        onClick={save}
        disabled={!f.foodName || saving}
        className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-40"
      >
        {saving ? "ADDING…" : "ADD FOOD"}
      </button>
    </fieldset>
  );
}
