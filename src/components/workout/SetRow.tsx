import React from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { EditableSetField, WorkoutSetRow } from "@/components/workout/workoutDraft";

interface SetRowProps {
  row: WorkoutSetRow;
  previous?: { weight?: number | string; reps?: number | string; [key: string]: any } | null;
  onEdit: (field: EditableSetField, value: string) => void;
  onToggle: () => void;
  saving?: boolean;
}

export default function SetRow({ row, previous, onEdit, onToggle, saving }: SetRowProps) {
  const done = row.completed;
  const validPrevious =
    previous &&
    String(previous.weight ?? "").trim() !== "" &&
    Number.isFinite(Number(previous.weight)) &&
    Number(previous.weight) >= 0 &&
    Number(previous.weight) <= 2500 &&
    Number.isInteger(Number(previous.reps)) &&
    Number(previous.reps) >= 1 &&
    Number(previous.reps) <= 100;
  const canCopy = validPrevious && !done && !saving && !row.pending && !row.savedId;
  return (
    <div className="workout-set-row mt-2 grid grid-cols-[44px_44px_minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-1">
      <button
        type="button"
        aria-label={`Set ${row.setNumber} type: ${row.setType || "working"}. Tap to change`}
        disabled={done || saving || row.pending}
        onClick={() => onEdit("setType", row.setType === "warmup" ? "working" : "warmup")}
        className="workout-set-type min-h-12 text-center text-xs font-bold text-muted-foreground"
      >
        <span className="workout-stacked-label">Set </span>
        {row.setType === "warmup" ? "W" : row.setNumber}
      </button>
      {validPrevious ? (
        <button
          type="button"
          disabled={!canCopy}
          aria-label={`Copy previous values for set ${row.setNumber}: ${previous.weight} pounds, ${previous.reps} reps`}
          onClick={() => {
            if (!canCopy) return;
            onEdit("weight", String(previous.weight));
            onEdit("reps", String(previous.reps));
          }}
          className="workout-set-previous min-h-12 min-w-0 rounded-lg px-0.5 text-center text-xs tabular-nums text-primary underline decoration-primary/40 underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
        >
          <span className="workout-stacked-label">Previous</span>
          <span className="block break-all leading-tight">{previous.weight}</span>
          <span className="block break-all text-[11px] leading-tight">×{previous.reps}</span>
        </button>
      ) : (
        <span className="workout-set-previous text-center text-xs text-muted-foreground">—</span>
      )}
      <label className="workout-set-weight min-w-0">
        <span className="workout-stacked-label text-xs text-muted-foreground">Weight (lb)</span>
        <input
          data-workout-weight
          aria-label={`Set ${row.setNumber} weight in pounds`}
          min="0"
          max="2500"
          disabled={saving}
          type="number"
          inputMode="decimal"
          value={row.weight}
          placeholder={previous ? String(previous.weight) : "lb"}
          onChange={(e) => onEdit("weight", e.target.value)}
          className={`h-12 min-w-0 w-full rounded-xl border text-center font-bold tabular-nums outline-none transition-all ${done ? "border-primary/35 bg-primary/10 text-primary shadow-[inset_0_0_18px_hsl(var(--primary)/.08)]" : "border-border/50 bg-secondary/70 focus:border-primary/50"}`}
        />
      </label>
      <label className="workout-set-reps min-w-0">
        <span className="workout-stacked-label text-xs text-muted-foreground">Reps</span>
        <input
          aria-label={`Set ${row.setNumber} repetitions`}
          min="1"
          max="100"
          disabled={saving}
          type="number"
          inputMode="numeric"
          value={row.reps}
          placeholder={previous ? String(previous.reps) : "reps"}
          onChange={(e) => onEdit("reps", e.target.value)}
          className={`h-12 min-w-0 w-full rounded-xl border text-center font-bold tabular-nums outline-none transition-all ${done ? "border-primary/35 bg-primary/10 text-primary shadow-[inset_0_0_18px_hsl(var(--primary)/.08)]" : "border-border/50 bg-secondary/70 focus:border-primary/50"}`}
        />
      </label>
      <motion.button
        whileTap={{ scale: 0.88 }}
        disabled={saving}
        onClick={onToggle}
        aria-label={`${done ? "Uncheck" : "Complete"} set ${row.setNumber}`}
        className={`workout-set-done grid h-12 place-items-center rounded-xl transition-all ${done ? "bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/.4)]" : "border border-border/50 bg-secondary/70 text-muted-foreground"}`}
      >
        {row.pending && done ? (
          <span className="relative grid place-items-center">
            <Check className="h-5 w-5 opacity-60" />
            <Loader2 className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-spin" />
          </span>
        ) : saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : done ? (
          <Check className="h-5 w-5" />
        ) : (
          <span className="h-4 w-4 rounded-full border border-current" />
        )}
      </motion.button>
    </div>
  );
}
