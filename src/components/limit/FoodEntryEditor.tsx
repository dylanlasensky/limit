import React, { useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { deleteFoodEntry, updateFoodEntry } from "@/lib/food-entry";
import { foodSourceLabel } from "@/lib/food-diary";
import useLocalDate from "@/hooks/use-local-date";
import NativeSelect from "@/components/limit/NativeSelect";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

interface FoodEntryEditorProps {
  entry: Record<string, any>;
  onClose: () => void;
  onSaved: (entry: Record<string, any>) => void;
  onDeleted: () => void;
  onSavingChange?: (saving: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

export default function FoodEntryEditor({
  entry,
  onClose,
  onSaved,
  onDeleted,
  onSavingChange,
  onCloseAutoFocus,
}: FoodEntryEditorProps) {
  const [draft, setDraft] = useState({ ...entry });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = useRef(false);
  const today = useLocalDate();
  const set = (key: string, value: unknown) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onSavingChange?.(true);
    setError("");
    try {
      const saved = await updateFoodEntry(entry, draft);
      onSaved(saved);
    } catch (failure: any) {
      setError(
        failure?.status || failure?.response
          ? "Couldn’t save your changes. Your edits are still here; please retry."
          : failure.message || "Couldn’t save your changes. Please retry."
      );
      pending.current = false;
      setBusy(false);
      onSavingChange?.(false);
    }
  };
  const remove = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onSavingChange?.(true);
    setError("");
    try {
      await deleteFoodEntry(entry.id);
      onDeleted();
    } catch {
      setError("Couldn’t confirm removal. Your edits are still here; please retry.");
      pending.current = false;
      setBusy(false);
      onSavingChange?.(false);
    }
  };
  return (
    <Drawer open autoFocus dismissible={!busy} onOpenChange={(open) => !open && !busy && onClose()}>
      <DrawerContent className="bg-card text-foreground" onCloseAutoFocus={onCloseAutoFocus}>
        <div className="mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="limit-kicker">Your food diary</p>
              <DrawerTitle className="mt-2 text-2xl font-semibold tracking-tight">
                Edit food entry
              </DrawerTitle>
            </div>
            <button
              aria-label="Close food editor"
              disabled={busy}
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <DrawerDescription className="mt-2 text-sm">
            Correct what you logged. Changes update this diary entry, not the original food.
          </DrawerDescription>
          <div className="my-4 rounded-xl border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold">{foodSourceLabel(entry)}</p>
            {entry.estimated && (
              <p className="mt-1">
                Editing an estimate does not verify it. Check portions and nutrition against a
                reliable source.
              </p>
            )}
          </div>
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <label className="block text-xs font-medium text-muted-foreground">
              Food name
              <input
                value={draft.foodName || ""}
                onChange={(event) => set("foodName", event.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-border bg-transparent px-3 text-sm text-foreground"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="min-w-0 text-xs font-medium text-muted-foreground">
                Diary date
                <input
                  type="date"
                  max={today}
                  value={draft.date}
                  onChange={(event) => set("date", event.target.value)}
                  className="mt-1 h-12 w-full min-w-0 rounded-xl border border-border bg-transparent px-2 text-sm text-foreground"
                />
              </label>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Meal</p>
                <NativeSelect
                  label="Edit meal"
                  value={draft.mealType}
                  onChange={(value) => set("mealType", value)}
                  options={["Breakfast", "Lunch", "Dinner", "Snacks"]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Portion quantity
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="any"
                  value={draft.quantity ?? ""}
                  onChange={(event) =>
                    set("quantity", event.target.value === "" ? "" : +event.target.value)
                  }
                  className="mt-1 h-12 w-full rounded-xl border border-border bg-transparent px-3 text-sm text-foreground"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Portion unit
                <input
                  value={draft.unit ?? ""}
                  placeholder="servings, cups, oz…"
                  onChange={(event) => set("unit", event.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-border bg-transparent px-3 text-sm text-foreground"
                />
              </label>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nutrition values are totals for the full portion. Changing quantity does not
              automatically scale them.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {["calories", "protein", "carbs", "fat"].map((key) => (
                <label key={key} className="text-xs font-medium capitalize text-muted-foreground">
                  {key}
                  {key !== "calories" ? " (g)" : ""}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={draft[key] ?? ""}
                    onChange={(event) =>
                      set(key, event.target.value === "" ? "" : +event.target.value)
                    }
                    className="mt-1 h-12 w-full rounded-xl border border-border bg-transparent px-3 text-sm text-foreground"
                  />
                </label>
              ))}
            </div>
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer py-1 text-xs font-medium">
                More nutrition details
              </summary>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["fiber", "sugar", "sodium"].map((key) => (
                  <label key={key} className="text-xs capitalize text-muted-foreground">
                    {key} ({key === "sodium" ? "mg" : "g"})
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={draft[key] ?? 0}
                      onChange={(event) => set(key, +event.target.value)}
                      className="mt-1 h-11 w-full rounded-lg border border-border bg-transparent px-2 text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
            </details>
            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {!confirmDelete ? (
              <>
                <button
                  onClick={save}
                  className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
                >
                  {busy ? "Saving…" : "Save food changes"}
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(true);
                    setError("");
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-medium text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove from diary
                </button>
              </>
            ) : (
              <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <h3 className="text-sm font-semibold">Remove this food entry?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  This removes {entry.foodName} and its nutrition from your diary. It cannot be
                  undone.
                </p>
                <button
                  onClick={remove}
                  className="mt-3 h-12 w-full rounded-xl bg-destructive font-semibold text-destructive-foreground"
                >
                  {busy ? "Removing…" : "Confirm removal"}
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    setError("");
                  }}
                  className="mt-1 min-h-11 w-full text-sm font-medium"
                >
                  Keep entry
                </button>
              </section>
            )}
          </fieldset>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
