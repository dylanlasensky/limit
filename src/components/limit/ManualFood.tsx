import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
}
export default function ManualFood({
  onDone,
  entryMethod = "manual",
  estimated = false,
}: ManualFoodProps) {
  const [f, setF] = useState<ManualFoodForm>({
      mealType: "Breakfast",
      quantity: 1,
      unit: "servings",
      estimated,
    }),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    client = useQueryClient(),
    set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    const date = today(),
      item = { ...f, date, entryMethod },
      key = ["foodEntries", date],
      previous = client.getQueryData<any[]>(key) || [],
      optimistic = { ...item, id: `pending-${Date.now()}` };
    setSaving(true);
    setError("");
    client.setQueryData(key, [...previous, optimistic]);
    try {
      const saved = await base44.entities.FoodEntry.create(item);
      client.setQueryData(key, (old: any[] | undefined) =>
        (old || []).map((x) => (x.id === optimistic.id ? saved : x))
      );
      onDone(true);
    } catch {
      client.setQueryData(key, previous);
      setError("Couldn’t add this food. Check your connection and try again.");
      setSaving(false);
    }
  };
  return (
    <div className="space-y-3">
      <input
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
              onChange={(e) => set(x, +e.target.value)}
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
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      <button
        onClick={save}
        disabled={!f.foodName || saving}
        className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-40"
      >
        {saving ? "ADDING…" : "ADD FOOD"}
      </button>
    </div>
  );
}
