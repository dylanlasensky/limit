import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  Utensils,
  PenLine,
  ChevronLeft,
  History,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { limitApi } from "@/api/client";
import { createFoodEntry } from "@/lib/food-entry";
import { today } from "@/components/limit/data";
import ManualFood from "@/components/limit/ManualFood";
import FoodPhotoScanner from "@/components/limit/FoodPhotoScanner";
import MealShortcuts from "@/components/limit/MealShortcuts";
import type { DietaryProfile } from "@/components/limit/data";
type AddFoodMode = "search" | "recent" | "shortcuts" | "food" | "meal" | "manual";
const options: Array<[string, LucideIcon, AddFoodMode, string]> = [
  ["Recent foods", History, "recent", "Quick-add something you logged"],
  ["Saved meals", Bookmark, "shortcuts", "Log several foods together"],
  ["Nutrition label", Camera, "food", "Scan a label or package"],
  ["Plate photo", Utensils, "meal", "Estimate an editable full meal"],
  ["Manual entry", PenLine, "manual", "Enter exact nutrition yourself"],
];
interface AddFoodFlowProps {
  dietaryProfile?: DietaryProfile | null;
  onDone: (saved?: boolean) => void;
  initialMealType?: string;
  entryDate?: string;
  onSavingChange?: (saving: boolean) => void;
}
export default function AddFoodFlow({
  dietaryProfile,
  onDone,
  initialMealType = "Breakfast",
  entryDate,
  onSavingChange,
}: AddFoodFlowProps) {
  const pending = useRef(false);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [mode, setMode] = useState<AddFoodMode | undefined>(),
    recent = useQuery({
      queryKey: ["recentFoods"],
      queryFn: () => limitApi.entities.FoodEntry.list("-created_date", 30),
      enabled: mode === "recent",
    });
  const savingChanged = (value: boolean) => {
    setSaving(value);
    onSavingChange?.(value);
  };
  if (mode)
    return (
      <div>
        <button
          onClick={() => setMode(undefined)}
          disabled={saving}
          className="mb-4 flex min-h-10 items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All options
        </button>
        <h3 className="mb-4 text-lg font-black">{options.find((x) => x[2] === mode)?.[0]}</h3>
        {["food", "meal"].includes(mode) ? (
          <FoodPhotoScanner
            entryDate={entryDate}
            onSavingChange={savingChanged}
            initialMealType={initialMealType}
            mode={mode as "food" | "meal"}
            dietaryProfile={dietaryProfile}
            onDone={onDone}
            onManual={() => setMode("manual")}
          />
        ) : mode === "shortcuts" ? (
          <MealShortcuts
            entryDate={entryDate}
            initialMealType={initialMealType}
            onDone={onDone}
            onSavingChange={savingChanged}
          />
        ) : mode === "recent" ? (
          <div className="space-y-2">
            {recent.isLoading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
            ) : (
              [...new Map((recent.data || []).map((x: any) => [x.foodName, x])).values()]
                .slice(0, 12)
                .map((x) => (
                  <button
                    key={x.foodName}
                    disabled={saving}
                    onClick={async () => {
                      if (pending.current) return;
                      pending.current = true;
                      savingChanged(true);
                      setError("");
                      try {
                        const {
                          mealType,
                          foodName,
                          quantity,
                          unit,
                          calories,
                          protein,
                          carbs,
                          fat,
                          fiber,
                          sugar,
                          sodium,
                          estimated,
                          ingredients,
                          possibleAllergens,
                        } = x;
                        await createFoodEntry({
                          mealType: initialMealType,
                          foodName,
                          quantity,
                          unit,
                          calories,
                          protein,
                          carbs,
                          fat,
                          fiber,
                          sugar,
                          sodium,
                          estimated,
                          ingredients,
                          possibleAllergens,
                          date: entryDate || today(),
                          entryMethod: "recent",
                        });
                        onDone();
                      } catch {
                        setError("Couldn’t add this food. Please try again.");
                        savingChanged(false);
                        pending.current = false;
                      }
                    }}
                    className="flex min-h-14 w-full justify-between rounded-xl bg-secondary p-4 text-left text-sm"
                  >
                    <b>{x.foodName}</b>
                    <span>{x.calories || 0} cal</span>
                  </button>
                ))
            )}
            {(error || recent.error) && (
              <p role="alert" className="text-sm text-destructive">
                {error || "Couldn’t load recent foods."}
              </p>
            )}
            {!recent.isLoading && !recent.data?.length && (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Foods you log will appear here for one-tap reuse.
              </p>
            )}
          </div>
        ) : (
          <ManualFood
            entryDate={entryDate}
            onSavingChange={savingChanged}
            initialMealType={initialMealType}
            entryMethod={mode}
            onDone={onDone}
          />
        )}
      </div>
    );
  return (
    <div className="grid gap-2">
      {options.map(([label, Icon, value, description]) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-background px-4 text-left"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </span>
          <span>
            <b className="block text-sm">{label}</b>
            <span className="text-xs text-muted-foreground">{description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
