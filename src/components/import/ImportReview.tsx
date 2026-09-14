import React from "react";
import { ArrowLeft, Copy, Loader2, Plus, ShieldCheck } from "lucide-react";
import ImportDayCard from "@/components/import/ImportDayCard";
interface ImportReviewProps {
  /** Regimen import flow state from use-regimen-import. */
  flow: Record<string, any>;
}
export default function ImportReview({ flow }: ImportReviewProps) {
  const uncertain = flow.draft.days
    .flatMap((day: any) => day.exercises)
    .filter((exercise: any) => exercise.matchConfidence < 70).length;
  return (
    <div>
      <header className="limit-hero rounded-[2rem] p-5">
        <button
          onClick={() => flow.setStage("source")}
          className="relative z-10 flex items-center gap-1 text-xs font-bold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Source
        </button>
        <div className="relative z-10 mt-5">
          <p className="limit-kicker">Review the work</p>
          <input
            value={flow.draft.name}
            onChange={(e) => flow.setDraft({ ...flow.draft, name: e.target.value })}
            className="mt-2 w-full bg-transparent text-4xl font-black italic tracking-[-.045em] outline-none"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            {flow.draft.days.length} training days ·{" "}
            {flow.draft.days.reduce((sum: number, day: any) => sum + day.exercises.length, 0)}{" "}
            exercises
          </p>
        </div>
      </header>
      {uncertain > 0 && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed">
            <b>{uncertain} matches need review.</b>
            <br />
            <span className="text-muted-foreground">
              LIMIT kept the original names instead of pretending uncertain matches were exact.
            </span>
          </p>
        </div>
      )}
      <div className="mt-5 space-y-4">
        {flow.draft.days.map((day: any, index: number) => (
          <ImportDayCard
            key={day.key}
            day={day}
            index={index}
            catalog={flow.catalog}
            onChange={(patch: any) => flow.day(index, patch)}
            onRemove={() => flow.removeDay(index)}
            onExercise={(exerciseIndex: number, patch: any) =>
              flow.exercise(index, exerciseIndex, patch)
            }
            onRemoveExercise={(exerciseIndex: number) => flow.removeExercise(index, exerciseIndex)}
            onAddExercise={() => flow.addExercise(index)}
          />
        ))}
      </div>
      {flow.draft.days.length < 7 && (
        <button
          onClick={flow.addDay}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 text-xs font-black text-primary"
        >
          <Plus className="h-4 w-4" />
          ADD TRAINING DAY
        </button>
      )}
      {flow.error && (
        <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          {flow.error}
        </p>
      )}
      <button
        disabled={flow.busy}
        onClick={() => flow.save(false)}
        className="limit-button mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-black disabled:opacity-40"
      >
        {flow.busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ShieldCheck className="h-5 w-5" />
        )}
        {flow.editing ? "SAVE & SET CURRENT" : "SET AS CURRENT PLAN"}
      </button>
      {flow.editing && (
        <button
          disabled={flow.busy}
          onClick={() => flow.save(true)}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-bold"
        >
          <Copy className="h-4 w-4" />
          DUPLICATE AS CURRENT
        </button>
      )}
    </div>
  );
}
