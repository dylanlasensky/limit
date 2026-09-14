import React from "react";
import { X } from "lucide-react";
import type { PlannedMeal } from "@/components/limit/data";
interface MealDetailProps {
  meal?: PlannedMeal | null;
  onClose: () => void;
}
export default function MealDetail({ meal, onClose }: MealDetailProps) {
  if (!meal) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <section className="mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-white p-5 dark:bg-zinc-900">
        <button onClick={onClose} className="float-right p-2">
          <X />
        </button>
        <p className="text-xs font-bold uppercase text-lime-600">{meal.mealType} · estimate</p>
        <h2 className="mt-2 text-2xl font-black">{meal.name}</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {meal.servingSize} · {meal.prepMinutes} min
        </p>
        <div className="my-5 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["Cal", meal.calories],
              ["Protein", meal.protein + "g"],
              ["Carbs", meal.carbs + "g"],
              ["Fat", meal.fat + "g"],
            ] as Array<[string, React.ReactNode]>
          ).map((x) => (
            <div className="rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800">
              <b>{x[1]}</b>
              <p className="text-[10px] text-zinc-500">{x[0]}</p>
            </div>
          ))}
        </div>
        <h3 className="font-bold">Ingredients</h3>
        {meal.ingredients?.map((x) => (
          <p className="mt-2 flex justify-between text-sm">
            <span>{x.name}</span>
            <span className="text-zinc-500">{x.quantity}</span>
          </p>
        ))}
        <h3 className="mt-6 font-bold">Simple method</h3>
        {meal.instructions?.map((x, i) => (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {i + 1}. {x}
          </p>
        ))}
        <p className="mt-6 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          Designed around saved restrictions. Always verify labels and cross-contact information for
          serious allergies.
        </p>
      </section>
    </div>
  );
}
