import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { PlannedMeal } from "@/components/limit/data";
interface MealDetailProps {
  meal?: PlannedMeal | null;
  onClose: () => void;
}
export default function MealDetail({ meal, onClose }: MealDetailProps) {
  if (!meal) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="block max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border-border bg-card p-5 text-foreground sm:rounded-3xl">
        <p className="pr-8 text-xs font-medium text-primary">{meal.mealType} · estimate</p>
        <DialogTitle className="mt-2 pr-6 text-2xl font-semibold">{meal.name}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          {meal.servingSize} · {meal.prepMinutes} min
        </DialogDescription>
        <div className="my-5 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["Cal", meal.calories],
              ["Protein", meal.protein + "g"],
              ["Carbs", meal.carbs + "g"],
              ["Fat", meal.fat + "g"],
            ] as Array<[string, React.ReactNode]>
          ).map((x) => (
            <div key={x[0]} className="rounded-xl bg-secondary p-2">
              <b>{x[1]}</b>
              <p className="text-[10px] text-muted-foreground">{x[0]}</p>
            </div>
          ))}
        </div>
        <h3 className="font-bold">Ingredients</h3>
        {meal.ingredients?.map((x) => (
          <p key={x.name} className="mt-2 flex justify-between gap-4 text-sm">
            <span>{x.name}</span>
            <span className="text-right text-muted-foreground">{x.quantity}</span>
          </p>
        ))}
        <h3 className="mt-6 font-bold">Simple method</h3>
        {meal.instructions?.map((x, i) => (
          <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {i + 1}. {x}
          </p>
        ))}
        <p className="mt-6 rounded-xl border border-border bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
          Designed around saved restrictions. Always verify labels and cross-contact information for
          serious allergies.
        </p>
      </DialogContent>
    </Dialog>
  );
}
