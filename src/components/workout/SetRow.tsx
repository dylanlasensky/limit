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
    <div className="mt-2 grid grid-cols-[20px_54px_minmax(0,1fr)_minmax(0,1fr)_36px_40px] items-center gap-2">
      <span className="text-center text-sm font-bold text-muted-foreground">{row.setNumber}</span>
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
          className="min-h-12 min-w-0 rounded-lg px-0.5 text-center text-xs tabular-nums text-primary underline decoration-primary/40 underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
        >
          {previous.weight}×{previous.reps}
        </button>
      ) : (
        <span className="text-center text-xs text-muted-foreground">—</span>
      )}
      <input
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
      <input
        aria-label={`Set ${row.setNumber} reps in reserve, optional`}
        disabled={saving}
        type="number"
        inputMode="numeric"
        value={row.rir ?? ""}
        placeholder="RIR"
        min="0"
        max="10"
        onChange={(e) => onEdit("rir", e.target.value)}
        className={`h-12 min-w-0 w-full rounded-xl border text-center text-sm tabular-nums outline-none transition-all ${done ? "border-primary/35 bg-primary/10 text-primary shadow-[inset_0_0_18px_hsl(var(--primary)/.08)]" : "border-border/50 bg-secondary/70 focus:border-primary/50"}`}
      />
      <motion.button
        whileTap={{ scale: 0.88 }}
        disabled={saving}
        onClick={onToggle}
        aria-label={done ? "Uncheck set" : "Complete set"}
        className={`grid h-12 place-items-center rounded-xl transition-all ${done ? "bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/.4)]" : "border border-border/50 bg-secondary/70 text-muted-foreground"}`}
      >
        {saving ? (
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
