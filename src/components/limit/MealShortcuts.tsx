import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { limitApi } from "@/api/client";
import { today } from "@/components/limit/data";
import {
  logMealShortcut,
  portionedItem,
  saveMealShortcut,
  shortcutItemFromFood,
  type ShortcutItem,
} from "@/lib/meal-shortcuts";

interface Props {
  entryDate?: string;
  initialMealType: string;
  onDone: (saved?: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

export default function MealShortcuts({
  entryDate,
  initialMealType,
  onDone,
  onSavingChange,
}: Props) {
  const client = useQueryClient();
  const shortcuts = useQuery({
    queryKey: ["mealShortcuts"],
    queryFn: () => limitApi.entities.MealShortcut.list("name", 100),
  });
  const recent = useQuery({
    queryKey: ["recentFoods"],
    queryFn: () => limitApi.entities.FoodEntry.list("-created_date", 100),
  });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [active, setActive] = useState<null | { id: string; name: string; items: ShortcutItem[] }>(
    null
  );
  const [portions, setPortions] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operationId = useRef(crypto.randomUUID());
  const pending = useRef(false);
  const foods = [
    ...new Map(
      (recent.data || [])
        .filter((row) => row.entryMethod !== "meal_shortcut")
        .map((row) => [row.foodName, row])
    ).values(),
  ];

  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onSavingChange?.(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t save. Please retry.");
    } finally {
      pending.current = false;
      setBusy(false);
      onSavingChange?.(false);
    }
  };

  if (active)
    return (
      <fieldset disabled={busy} className="space-y-3">
        <button type="button" className="text-sm text-primary" onClick={() => setActive(null)}>
          ← Saved meals
        </button>
        <h4 className="font-bold">{active.name}</h4>
        <p className="text-xs text-muted-foreground">
          Adjust each portion before logging. Nutrition updates with the portion.
        </p>
        {active.items.map((item, index) => (
          <label
            key={index}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
          >
            <span>
              {item.foodName}
              {item.estimated ? " · estimate" : ""}
            </span>
            <span className="flex items-center gap-2">
              <input
                aria-label={`${item.foodName} portion`}
                type="number"
                min="0.01"
                max="10000"
                step="any"
                value={portions[index] ?? ""}
                onChange={(event) =>
                  setPortions((old) =>
                    old.map((value, i) => (i === index ? Number(event.target.value) : value))
                  )
                }
                className="h-10 w-20 rounded-lg border border-border bg-background px-2"
              />
              {item.unit}
            </span>
          </label>
        ))}
        {active.items.some((item) => item.estimated) && (
          <p className="text-xs text-muted-foreground">
            Some nutrition values are estimates. Verify before relying on them.
          </p>
        )}
        {[...new Set(active.items.flatMap((item) => item.possibleAllergens || []))].length > 0 && (
          <p className="rounded-xl border border-destructive/60 p-3 text-sm">
            Possible allergens:{" "}
            {[...new Set(active.items.flatMap((item) => item.possibleAllergens || []))].join(", ")}.
            Verify ingredients before eating.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          className="min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground"
          onClick={() =>
            void run(async () => {
              await logMealShortcut(
                active.name,
                active.items,
                portions,
                initialMealType,
                entryDate || today(),
                operationId.current
              );
              void client.invalidateQueries({ queryKey: ["foodEntries", entryDate || today()] });
              onDone(true);
            })
          }
        >
          Log this meal once
        </button>
        <button
          type="button"
          disabled={busy}
          className="min-h-11 w-full rounded-xl border border-border text-sm"
          onClick={() =>
            void run(async () => {
              const items = active.items.map((item, index) => portionedItem(item, portions[index]));
              const saved = await limitApi.entities.MealShortcut.update(active.id, {
                name: active.name,
                items,
              });
              setActive(saved);
              void client.invalidateQueries({ queryKey: ["mealShortcuts"] });
            })
          }
        >
          Save portions as default
        </button>
      </fieldset>
    );

  if (creating)
    return (
      <fieldset disabled={busy} className="space-y-3">
        <button type="button" className="text-sm text-primary" onClick={() => setCreating(false)}>
          ← Saved meals
        </button>
        <input
          aria-label="Shortcut name"
          placeholder="Usual breakfast"
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3"
        />
        <p className="text-xs text-muted-foreground">
          Select at least two foods from your recent diary. Their portions and estimate labels are
          saved.
        </p>
        {recent.isLoading ? (
          <p>Loading foods…</p>
        ) : (
          foods.map((food) => (
            <label
              key={food.id}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-border p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(food.id)}
                onChange={(event) =>
                  setSelected((old) =>
                    event.target.checked ? [...old, food.id] : old.filter((id) => id !== food.id)
                  )
                }
              />
              <span>
                {food.foodName} · {food.quantity} {food.unit || "servings"}
                {food.estimated ? " · estimate" : ""}
              </span>
            </label>
          ))
        )}
        {!recent.isLoading && foods.length < 2 && (
          <p className="text-sm text-muted-foreground">
            Log at least two foods before making a meal shortcut.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={busy || !name.trim() || selected.length < 2 || selected.length > 20}
          className="min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50"
          onClick={() =>
            void run(async () => {
              const saved = await saveMealShortcut(
                name,
                selected.map((id) => shortcutItemFromFood(foods.find((food) => food.id === id)!))
              );
              await client.invalidateQueries({ queryKey: ["mealShortcuts"] });
              setCreating(false);
              setSelected([]);
              setName("");
              setActive(saved);
              setPortions(saved.items.map((item) => item.quantity));
              operationId.current = crypto.randomUUID();
            })
          }
        >
          Save shortcut
        </button>
      </fieldset>
    );

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="min-h-12 w-full rounded-xl border border-primary text-sm font-bold text-primary"
        onClick={() => setCreating(true)}
      >
        Create meal shortcut
      </button>
      {shortcuts.isLoading ? (
        <p>Loading saved meals…</p>
      ) : (
        shortcuts.data?.map((shortcut) => (
          <button
            type="button"
            key={shortcut.id}
            className="flex min-h-14 w-full items-center justify-between rounded-xl bg-secondary p-4 text-left text-sm"
            onClick={() => {
              setActive(shortcut);
              setPortions(shortcut.items.map((item) => item.quantity));
              operationId.current = crypto.randomUUID();
            }}
          >
            <b>{shortcut.name}</b>
            <span>{shortcut.items.length} foods</span>
          </button>
        ))
      )}
      {shortcuts.error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t load saved meals.
        </p>
      )}
      {!shortcuts.isLoading && !shortcuts.data?.length && (
        <p className="text-sm text-muted-foreground">
          Save a meal you eat often to log its foods together.
        </p>
      )}
    </div>
  );
}
