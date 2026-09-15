import React from "react";
import { Plus, RefreshCw, Check } from "lucide-react";
import type { PlannedMeal } from "@/components/limit/data";
interface MealCardProps {
  meal: PlannedMeal;
  onOpen: () => void;
  onAdd: () => void;
  onSwap: () => void;
  selected: boolean;
  onSelect: () => void;
}
export default function MealCard({
  meal,
  onOpen,
  onAdd,
  onSwap,
  selected,
  onSelect,
}: MealCardProps) {
  return (
    <article className="limit-surface min-w-0 rounded-3xl p-4">
      <div className="flex gap-3">
        <button
          onClick={onSelect}
          aria-label={`Select ${meal.name} for groceries`}
          aria-pressed={selected}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
        >
          {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="text-xs font-medium text-primary">{meal.mealType}</p>
          <h3 className="mt-1 font-semibold">{meal.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {meal.ingredients?.map((x) => x.name).join(" • ")}
          </p>
          <p className="mt-2 text-xs">
            <b>{meal.calories}</b> cal · {meal.protein}g protein
          </p>
          <span className="mt-2 block text-xs font-medium text-primary">View recipe →</span>
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onAdd}
          className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add today
        </button>
        <button
          onClick={onSwap}
          className="flex h-11 items-center gap-1 rounded-xl bg-secondary px-3 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Swap
        </button>
      </div>
    </article>
  );
}
