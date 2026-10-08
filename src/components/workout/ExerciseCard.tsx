import ExerciseMedia from "./ExerciseMedia";
import WorkoutHelp from "./WorkoutHelp";
import React, { useState } from "react";
import { Calculator, Trash2 } from "lucide-react";
import SetRow from "@/components/workout/SetRow";
import ExerciseOptions from "@/components/workout/ExerciseOptions";
import ExerciseDetails from "@/components/workout/ExerciseDetails";
import PlateCalculator from "@/components/workout/PlateCalculator";
import { suggestProgression } from "@/lib/training/e1rm";
import type { EditableSetField, WorkoutSetRow } from "@/components/workout/workoutDraft";
interface ExerciseCardProps {
  workoutExercise: Record<string, any>;
  exercise?: Record<string, any> | null;
  rows: WorkoutSetRow[];
  previousSets?: any[];
  onEdit: (key: string, field: EditableSetField, value: string) => void;
  onToggle: (key: string) => void;
  onAddSet: () => void;
  timeBudget?: boolean;
  onRemoveSet: (key: string) => void;
  savingIds: Set<string>;
  allExercises: any[];
  profile?: Record<string, any> | null;
  onLoadIncrementChange?: (increment: number) => Promise<void>;
  plan?: Record<string, any> | null;
  onReplace: (exercise: any) => void;
  onSkip: () => void;
}
export default function ExerciseCard({
  workoutExercise,
  exercise,
  rows,
  previousSets = [],
  onEdit,
  onToggle,
  onAddSet,
  timeBudget = false,
  onRemoveSet,
  savingIds,
  allExercises,
  profile,
  onLoadIncrementChange,
  plan,
  onReplace,
  onSkip,
}: ExerciseCardProps) {
  const [compact, setCompact] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [stepError, setStepError] = useState("");
  const [stepSaving, setStepSaving] = useState(false);
  const usesPlates = /barbell|smith|trap bar|landmine/i.test(
    exercise?.equipment || workoutExercise.equipment || workoutExercise.exerciseName || ""
  );
  const [details, setDetails] = useState(false),
    locked =
      plan?.structureLocked || plan?.athleteMode === "track_only" || workoutExercise.coachMandated,
    increment = profile?.loadIncrements?.[workoutExercise.exerciseId] || 5,
    suggestion = locked
      ? null
      : suggestProgression(previousSets, workoutExercise.repMin, workoutExercise.repMax, increment);
  return (
    <section
      className={`limit-surface mt-5 min-w-0 rounded-[1.5rem] p-3 sm:p-5 transition-opacity ${workoutExercise.skipped ? "opacity-55" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold leading-snug tracking-tight">
            {workoutExercise.exerciseName}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {exercise?.primaryMuscle || workoutExercise.primaryMuscle || "Other"} ·{" "}
            {exercise?.category || workoutExercise.category || "Exercise"} ·{" "}
            {workoutExercise.repMin}–{workoutExercise.repMax} reps
          </p>
        </div>
        <ExerciseOptions
          exercise={exercise}
          workoutExercise={workoutExercise}
          allExercises={allExercises}
          profile={profile}
          canReplace={!rows.some((r) => r.savedId || r.pending)}
          locked={locked}
          onReplace={onReplace}
          onSkip={onSkip}
          onDetails={() => setDetails(true)}
        />
      </div>
      {workoutExercise.skipped ? (
        <button
          onClick={onSkip}
          className="mt-4 h-11 w-full rounded-xl bg-secondary text-sm font-bold"
        >
          Restore exercise
        </button>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={compact}
              onClick={() => setCompact(!compact)}
              className="min-h-11 rounded-xl bg-secondary px-3 text-xs font-semibold"
            >
              {compact ? "Show movement guide" : "Compact logger"}
            </button>
            <button
              type="button"
              onClick={() => {
                onSkip();
              }}
              className="min-h-11 rounded-xl px-3 text-xs font-semibold text-primary"
            >
              Pain or discomfort? Skip this movement
            </button>
          </div>
          {!compact && (
            <>
              <ExerciseMedia exercise={exercise || workoutExercise} />
              <WorkoutHelp />
            </>
          )}
          {previousSets.length > 0 ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              LAST TIME{" "}
              <span className="ml-1 font-bold tabular-nums text-foreground">
                {previousSets
                  .slice(0, 4)
                  .map((s) => `${s.weight} × ${s.reps}`)
                  .join("  ·  ")}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground">FIRST LOGGED SESSION</p>
          )}
          {suggestion && (
            <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/[.06] p-3">
              <p className="limit-kicker">NEXT TARGET · {suggestion.weight} LB</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.note}</p>
            </div>
          )}
          {!locked && onLoadIncrementChange && (
            <label className="mt-3 block text-xs text-muted-foreground">
              Available load increase for this exercise
              <select
                className="ml-2 min-h-11 rounded-xl border border-input bg-background px-2 text-foreground"
                aria-label={`Load increase for ${workoutExercise.exerciseName}`}
                value={increment}
                disabled={stepSaving}
                onChange={async (event) => {
                  setStepError("");
                  setStepSaving(true);
                  try {
                    await onLoadIncrementChange(Number(event.target.value));
                  } catch {
                    setStepError("Couldn’t save the load increase. Try again.");
                  } finally {
                    setStepSaving(false);
                  }
                }}
              >
                {[2.5, 5, 10, 15, 20].map((step) => (
                  <option key={step} value={step}>
                    +{step} lb
                  </option>
                ))}
              </select>
              <span className="mt-1 block">
                Suggestions only. Set weight and reps remain yours to edit.
              </span>
              {stepError && (
                <span role="alert" className="mt-1 block text-destructive">
                  {stepError}
                </span>
              )}
            </label>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3">
            {previousSets.length > 0 && (
              <p className="py-2 text-xs text-muted-foreground">
                Select a previous set to copy its weight and reps.
              </p>
            )}
            {usesPlates && (
              <button
                type="button"
                onClick={() => setCalculatorOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-xs font-semibold text-primary"
              >
                <Calculator aria-hidden className="h-4 w-4" />
                Plate calculator
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-[22px_48px_minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Set</span>
            <span>Prev</span>
            <span>Lb</span>
            <span>Reps</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={row.key} className="relative">
              <SetRow
                row={row}
                previous={previousSets[row.setNumber - 1] || previousSets.at(-1)}
                saving={savingIds.has(row.key)}
                onEdit={(k, v) => onEdit(row.key, k, v)}
                onToggle={() => onToggle(row.key)}
              />
              {index >= workoutExercise.sets && !row.savedId && !row.pending && (
                <button
                  aria-label={`Delete set ${row.setNumber}`}
                  onClick={() => onRemoveSet(row.key)}
                  className="absolute -right-2 -top-1 grid h-6 w-6 place-items-center rounded-full bg-secondary text-muted-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {!locked && (
            <button
              onClick={onAddSet}
              disabled={rows.length >= 30}
              className="mt-4 min-h-11 w-full rounded-xl border border-dashed border-border/70 bg-secondary/30 text-xs font-black tracking-wide text-muted-foreground transition-colors active:bg-secondary disabled:opacity-40"
            >
              {timeBudget ? "+ ADD SET · EXTENDS TODAY" : "+ ADD SET"}
            </button>
          )}
        </>
      )}
      <ExerciseDetails exercise={exercise} open={details} onOpenChange={setDetails} />
      {calculatorOpen && (
        <PlateCalculator
          initialWeight={
            rows.find((row) => !row.completed && row.weight)?.weight ||
            rows.find((row) => row.weight)?.weight ||
            (previousSets[0]?.weight != null ? String(previousSets[0].weight) : "")
          }
          onClose={() => setCalculatorOpen(false)}
        />
      )}
    </section>
  );
}
