import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  Utensils,
  Store,
  PenLine,
  ChevronLeft,
  History,
  type LucideIcon,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createFoodEntry } from "@/lib/food-entry";
import { today } from "@/components/limit/data";
import ManualFood from "@/components/limit/ManualFood";
import FoodPhotoScanner from "@/components/limit/FoodPhotoScanner";
import type { DietaryProfile } from "@/components/limit/data";
type AddFoodMode = "search" | "recent" | "food" | "meal" | "restaurant" | "manual";
const options: Array<[string, LucideIcon, AddFoodMode, string]> = [
  ["Recent foods", History, "recent", "Quick-add something you logged"],
  ["Nutrition label", Camera, "food", "Scan a label or package"],
  ["Plate photo", Utensils, "meal", "Estimate an editable full meal"],
  ["Restaurant meal", Store, "restaurant", "Log an estimated restaurant item"],
  ["Manual entry", PenLine, "manual", "Enter exact nutrition yourself"],
];
interface AddFoodFlowProps {
  dietaryProfile?: DietaryProfile | null;
  onDone: (saved?: boolean) => void;
  initialMealType?: string;
}
export default function AddFoodFlow({
  dietaryProfile,
  onDone,
  initialMealType = "Breakfast",
}: AddFoodFlowProps) {
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [mode, setMode] = useState<AddFoodMode | undefined>(),
    recent = useQuery({
      queryKey: ["recentFoods"],
      queryFn: () => base44.entities.FoodEntry.list("-created_date", 30),
      enabled: mode === "recent",
    });
  if (mode)
    return (
      <div>
        <button
          onClick={() => setMode(undefined)}
          className="mb-4 flex min-h-10 items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All options
        </button>
        <h3 className="mb-4 text-lg font-black">{options.find((x) => x[2] === mode)?.[0]}</h3>
        {["food", "meal"].includes(mode) ? (
          <FoodPhotoScanner
            initialMealType={initialMealType}
            mode={mode as "food" | "meal"}
            dietaryProfile={dietaryProfile}
            onDone={onDone}
            onManual={() => setMode("manual")}
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
                      if (saving) return;
                      setSaving(true);
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
                          date: today(),
                          entryMethod: "recent",
                        });
                        onDone();
                      } catch {
                        setError("Couldn’t add this food. Please try again.");
                      } finally {
                        setSaving(false);
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
            initialMealType={initialMealType}
            entryMethod={mode}
            estimated={mode === "restaurant"}
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
