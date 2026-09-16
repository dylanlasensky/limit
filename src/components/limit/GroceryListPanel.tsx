import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw, ShoppingBasket } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import useLocalDate from "@/hooks/use-local-date";
import type { PlannedMeal } from "@/components/limit/data";
import {
  buildGroceryList,
  groceryKey,
  groceryText,
  loadGroceryList,
  setGroceryChecked,
  type SavedGroceryList,
} from "@/lib/grocery-lists";

export default function GroceryListPanel({ meals }: { meals: PlannedMeal[] }) {
  const { user } = useAuth(),
    date = useLocalDate();
  const week = format(startOfWeek(new Date(`${date}T12:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const [list, setList] = useState<SavedGroceryList | null>(null),
    [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const busy = useRef(false),
    generation = useRef(0),
    retry = useRef<(() => Promise<SavedGroceryList>) | null>(null);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    setMessage("");
    setSaving(false);
    busy.current = false;
    retry.current = null;
    try {
      const saved = await loadGroceryList(user?.id || "", week);
      if (generation.current === current) setList(saved);
    } catch {
      if (generation.current === current)
        setError("Couldn’t load your saved grocery list. Reload before changing it.");
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [user?.id, week]);
  useEffect(() => {
    setList(null);
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const save = async (
    operation: () => Promise<SavedGroceryList>,
    success: string,
    rollback?: () => void
  ) => {
    if (busy.current || loading) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    retry.current = operation;
    const current = generation.current;
    try {
      const saved = await operation();
      if (generation.current === current) {
        setList(saved);
        setMessage(success);
        retry.current = null;
      }
    } catch (reason: any) {
      if (generation.current === current) {
        rollback?.();
        setError(
          reason?.message || "Couldn’t save this change. Your previous list is still shown."
        );
      }
    } finally {
      if (generation.current === current) {
        busy.current = false;
        setSaving(false);
      }
    }
  };
  const copy = async () => {
    if (!list) return;
    try {
      await navigator.clipboard.writeText(groceryText(list.items));
      setMessage("Remaining ingredients copied.");
    } catch {
      setMessage("Copy isn’t available here. You can still use the checklist below.");
    }
  };
  const checked = list?.items.filter((item) => item.checked).length || 0;
  const categories = [...new Set(list?.items.map((item) => item.category) || [])];
  return (
    <section aria-label="Saved grocery list" className="limit-surface mt-5 rounded-3xl p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="limit-kicker text-muted-foreground">Plan once. Shop easier.</p>
          <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <ShoppingBasket className="h-5 w-5 text-primary" aria-hidden />
            Grocery list
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Week of {format(new Date(`${week}T12:00:00`), "MMM d")}
          </p>
        </div>
        <button
          aria-label="Reload grocery list"
          disabled={saving || loading}
          onClick={() => void load()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </header>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Saved with your account. Quantities are recipe portions, not shopping weights—check each
        recipe for amounts. Checks are kept when an ingredient’s quantity stays the same.
      </p>
      {loading && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Loading your list…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"
        >
          <p>{error}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {retry.current && (
              <button
                disabled={saving}
                onClick={() => void save(retry.current!, "Grocery list saved.")}
                className="min-h-11 font-semibold text-primary"
              >
                Retry save
              </button>
            )}
            <button
              disabled={saving || loading}
              onClick={() => void load()}
              className="min-h-11 font-semibold"
            >
              Reload saved list
            </button>
          </div>
        </div>
      )}
      <button
        disabled={saving || loading || !meals.length || (!!error && !list)}
        onClick={() =>
          void save(() => buildGroceryList(user?.id || "", week, meals), "Grocery list saved.")
        }
        className="mt-4 min-h-12 w-full rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {saving
          ? "Saving grocery list…"
          : `${list ? "Update" : "Build"} list from ${meals.length} selected meal${meals.length === 1 ? "" : "s"}`}
      </button>
      {!meals.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          Select meals with the + button above to build or update this week’s list.
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-xs text-primary">
          {message}
        </p>
      )}
      {list && (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tabular-nums">
              {checked} of {list.items.length} ingredients checked
            </p>
            <button
              disabled={checked === list.items.length}
              onClick={copy}
              className="flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy remaining
            </button>
          </div>
          <div
            role="progressbar"
            aria-label="Grocery shopping progress"
            aria-valuenow={checked}
            aria-valuemin={0}
            aria-valuemax={list.items.length}
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${list.items.length ? (checked / list.items.length) * 100 : 0}%` }}
            />
          </div>
          <fieldset disabled={saving || loading} className="min-w-0">
            {categories.map((category) => (
              <div key={category} className="mt-5">
                <h4 className="text-xs font-semibold text-muted-foreground">{category}</h4>
                <div className="mt-1 divide-y divide-border">
                  {list.items
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <label
                        key={groceryKey(item)}
                        className="flex min-h-14 cursor-pointer items-center gap-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(event) => {
                            const nextChecked = event.target.checked;
                            const previousList = list;
                            const key = groceryKey(item);
                            setList({
                              ...list,
                              items: list.items.map((entry) =>
                                groceryKey(entry) === key
                                  ? { ...entry, checked: nextChecked }
                                  : entry
                              ),
                            });
                            void save(
                              () => setGroceryChecked(previousList, item, nextChecked),
                              "Shopping progress saved.",
                              () => setList(previousList)
                            );
                          }}
                          className="h-5 w-5 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm font-medium ${item.checked ? "text-muted-foreground line-through" : ""}`}
                          >
                            {item.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {item.qty} {item.unit}
                          </span>
                        </span>
                        {item.checked && <Check className="h-4 w-4 text-primary" aria-hidden />}
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </fieldset>
        </>
      )}
      {!loading && !error && !list && (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Your next shopping trip starts here. Choose a few meals, then build your list.
        </p>
      )}
    </section>
  );
}