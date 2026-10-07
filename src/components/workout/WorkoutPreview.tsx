import { Clock3, Dumbbell, Play, RotateCcw } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { estimateMinutes } from "@/lib/training/planService";
import ScreenState from "@/components/limit/ScreenState";
import { previewSessionBudget } from "../../../packages/domain/sessionBudget.js";
import { useEffect, useState } from "react";

export default function WorkoutPreview({
  day,
  rows,
  exercises,
  activeSession,
  plan,
  loading = false,
  onClose,
  onStart,
}: {
  day?: Record<string, any> | null;
  rows: Record<string, any>[];
  exercises: Record<string, any>[];
  activeSession?: Record<string, any> | null;
  plan?: Record<string, any> | null;
  loading?: boolean;
  onClose: () => void;
  onStart: (
    dayId: string,
    timeBudgetMinutes?: number,
    timeBudgetPreview?: { id: string; sets: number }[]
  ) => void;
}) {
  const [budget, setBudget] = useState<number | null>(null);
  useEffect(() => setBudget(null), [day?.id]);
  const selected = rows
    .filter((row) => row.workoutDayId === day?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const workingSets = selected.reduce((sum, row) => sum + (row.sets || 3), 0);
  const resume = activeSession?.workoutDayId === day?.id;
  const otherActive = activeSession && !resume;
  const locked = !!(
    plan?.structureLocked ||
    plan?.athleteMode === "track_only" ||
    day?.coachMandated ||
    day?.fixedSchedule
  );
  const adaptation = budget === null ? null : previewSessionBudget(selected, budget);
  const previewRows = adaptation?.available ? adaptation.selected : selected;
  return (
    <Drawer
      open={!!day}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent className="bg-card text-foreground">
        <section className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 text-left">
            <DrawerDescription className="text-xs font-semibold uppercase tracking-widest text-primary">
              Workout preview
            </DrawerDescription>
            <DrawerTitle className="mt-1 text-2xl font-semibold tracking-tight">
              {day?.name || "Your workout"}
            </DrawerTitle>
          </DrawerHeader>
          {loading && !day?.isRest ? (
            <ScreenState loading />
          ) : day?.isRest ? (
            <p className="mb-5 rounded-2xl bg-secondary p-5 text-sm leading-relaxed text-muted-foreground">
              No workout is scheduled for this day. Make space for recovery, or preview another day
              in your training week.
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium">
                <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2">
                  <Dumbbell className="h-3.5 w-3.5" aria-hidden />
                  {previewRows.length} {previewRows.length === 1 ? "exercise" : "exercises"} ·{" "}
                  {budget !== null && adaptation?.available
                    ? previewRows.reduce((sum: number, row: any) => sum + row.sets, 0)
                    : workingSets}{" "}
                  sets
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  About{" "}
                  {adaptation?.available
                    ? adaptation.estimatedMinutes
                    : estimateMinutes(selected)}{" "}
                  min
                </span>
              </div>
              <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
                Plan your equipment and see what’s ahead. Previewing does not start a session or
                change your workout history.
              </p>
              {!resume && !otherActive && selected.length > 2 && !locked && (
                <div className="mb-5 rounded-2xl border border-border p-4">
                  <label htmlFor="session-budget" className="block text-sm font-semibold">
                    Time available today
                  </label>
                  <select
                    id="session-budget"
                    value={budget ?? ""}
                    onChange={(event) =>
                      setBudget(event.target.value ? Number(event.target.value) : null)
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Full workout</option>
                    {[20, 30, 40, 45, 60].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                  {adaptation && (
                    <div role="status" className="mt-3 text-sm text-muted-foreground">
                      {adaptation.available ? (
                        <>
                          <p>
                            One session only: about {adaptation.estimatedMinutes} min. The first two
                            movements and prescribed rest stay in place.
                          </p>
                          <p className="mt-2">
                            Today:{" "}
                            {adaptation.selected
                              .map((row: any) => `${row.exerciseName} (${row.sets} sets)`)
                              .join(", ")}
                            .
                          </p>
                          {adaptation.removed.length > 0 && (
                            <p className="mt-2">
                              Left out today:{" "}
                              {adaptation.removed.map((row: any) => row.exerciseName).join(", ")}.
                            </p>
                          )}
                          <p className="mt-2">
                            Your recurring program stays the same. Starting confirms this shorter
                            session.
                          </p>
                        </>
                      ) : (
                        <p>{adaptation.reason}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {locked && (
                <p className="mb-4 text-xs text-muted-foreground">
                  This prescribed workout keeps its full structure.
                </p>
              )}
              <ol className="space-y-3">
                {previewRows.map((row: any, index: number) => {
                  const exercise = exercises.find((item) => item.id === row.exerciseId);
                  const reps =
                    row.reps ||
                    (row.repMin != null && row.repMin === row.repMax
                      ? row.repMin
                      : `${row.repMin || 8}–${row.repMax || 12}`);
                  return (
                    <li key={row.id || index} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold">
                            {row.exerciseName || exercise?.name || "Exercise"}
                          </h3>
                          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                            {row.sets || 3} sets × {reps} reps
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {[
                              exercise?.equipment || row.equipment,
                              exercise?.primaryMuscle || row.primaryMuscle,
                              `${row.restSeconds ?? 90}s rest`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {row.notes && (
                            <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                              {row.notes}
                            </p>
                          )}
                          {row.progressionNotes && (
                            <details className="mt-3 text-xs text-muted-foreground">
                              <summary className="cursor-pointer py-2 font-semibold">
                                How to progress
                              </summary>
                              <p className="mt-1 leading-relaxed">{row.progressionNotes}</p>
                            </details>
                          )}
                          {row.coachMandated && (
                            <p className="mt-2 text-xs font-medium text-primary">
                              Coach-prescribed movement
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {!selected.length && (
                <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  No exercises are saved for this day yet. Edit your program to add movements before
                  starting.
                </p>
              )}
              {otherActive ? (
                <div className="mt-5 rounded-2xl bg-secondary p-4">
                  <p className="text-sm">
                    Another workout is in progress. Finish it before starting this session.
                  </p>
                  <button
                    onClick={() => onStart(activeSession.workoutDayId)}
                    className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Resume active workout
                  </button>
                </div>
              ) : (
                <button
                  disabled={!selected.length || (budget !== null && !adaptation?.available)}
                  onClick={() =>
                    day?.id &&
                    onStart(
                      day.id,
                      budget ?? undefined,
                      adaptation?.available
                        ? adaptation.selected.map((row: any) => ({ id: row.id, sets: row.sets }))
                        : undefined
                    )
                  }
                  className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-40"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  {resume ? "Resume workout" : "Start this workout"}
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="mt-3 min-h-12 w-full rounded-xl bg-secondary text-sm font-semibold"
          >
            Back to schedule
          </button>
        </section>
      </DrawerContent>
    </Drawer>
  );
}
