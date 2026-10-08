import useWorkoutClock from "@/components/workout/useWorkoutClock";
import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { limitApi } from "@/api/client";
import useLiveWorkout from "@/hooks/use-live-workout";
import ExerciseCard from "@/components/workout/ExerciseCard";
import RestTimer from "@/components/workout/RestTimer";
import WorkoutComplete from "@/components/workout/WorkoutComplete";
import WorkoutSyncStatus from "@/components/workout/WorkoutSyncStatus";
import Elapsed from "@/components/workout/Elapsed";
import ScreenState from "@/components/limit/ScreenState";
import {
  equipmentAvailable,
  equipmentPool,
  suitableReplacement,
} from "@/lib/training/exerciseSelection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
export default function LiveWorkout() {
  const { workoutDayId } = useParams<{ workoutDayId: string }>(),
    nav = useNavigate(),
    live = useLiveWorkout(workoutDayId),
    [cancelOpen, setCancelOpen] = useState(false),
    [finishing, setFinishing] = useState(false),
    [discarding, setDiscarding] = useState(false),
    [finishError, setFinishError] = useState(""),
    [inlineError, setInlineError] = useState(""),
    [previewGymId, setPreviewGymId] = useState<string | null | undefined>(undefined),
    [selectingGym, setSelectingGym] = useState(false),
    [summary, setSummary] = useState<any | null>(null);
  const actionInFlight = useRef(false);
  const uiKey = live.session ? `limit-workout-ui:${live.session.ownerId}:${live.session.id}` : "";
  const clock = useWorkoutClock(uiKey);
  const { exercise: currentExercise, setExercise: setCurrentExercise, rest, setRest } = clock;
  const paused = clock.pausedAt !== null;
  if (live.loading)
    return (
      <main className="mx-auto min-h-screen max-w-md bg-background px-4 pt-8 text-foreground">
        <ScreenState loading />
      </main>
    );
  if (live.error || !live.workoutExercises.length)
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center bg-background px-5 text-foreground">
        <ScreenState
          title={live.error || "This workout has no exercises"}
          description={
            live.error
              ? "Your schedule is safe. Check your connection and try again."
              : "Rebuild your program from Profile to populate this session."
          }
          action={live.error ? "Retry" : "Back to workout"}
          onAction={live.error ? live.retry : () => nav("/workout")}
        />
      </main>
    );
  if (summary)
    return <WorkoutComplete summary={summary} onDone={() => nav("/workout", { replace: true })} />;
  const pending = live.rows.filter((r) => r.pending).length,
    syncing = live.savingIds.size > 0,
    doneExercises = live.workoutExercises.filter(
      (we) => !we.skipped && live.rows.some((r) => r.workoutExerciseId === we.id && r.completed)
    ).length;
  const gyms: any[] = live.profile?.equipmentProfiles || [];
  const selectedGym = gyms.find((gym) => gym.id === live.session?.equipmentProfileId);
  const previewGym = gyms.find((gym) => gym.id === previewGymId);
  const previewProfile = { equipment: previewGym?.equipment || live.profile?.equipment || [] };
  const unavailable = live.workoutExercises.filter((we) => {
    const exercise = live.exercisesById[we.exerciseId];
    return exercise && !equipmentAvailable(exercise, equipmentPool(previewProfile));
  });
  const handleToggle = async (key: string) => {
    const row = live.rows.find((r) => r.key === key),
      was = row?.completed,
      err = await live.toggle(key);
    setInlineError(err || "");
    if (!err && !was) {
      const we = live.workoutExercises.find((x) => x.id === row!.workoutExerciseId);
      setRest(Date.now() + (we?.restSeconds || 120) * 1000);
    }
  };
  const finish = async () => {
    if (actionInFlight.current) return;
    if (!live.current.current.some((r) => r.completed && !r.removed)) {
      setFinishError("Complete at least one set before finishing.");
      return;
    }
    actionInFlight.current = true;
    setFinishing(true);
    setFinishError("");
    const synced = await live.flush();
    if (!synced || live.current.current.some((r) => r.pending)) {
      setFinishError("Sync every completed set before finishing. Your entries are still safe.");
      setFinishing(false);
      actionInFlight.current = false;
      return;
    }
    try {
      const expectedSets = live.current.current
        .filter((r) => r.completed && r.savedId)
        .map((r) => ({ id: r.savedId, revision: r.revision }));
      const { data } = await limitApi.functions.invoke("workoutCommand", {
        action: "finish",
        sessionId: live.session!.id,
        expectedSets,
        pausedMilliseconds:
          clock.pausedMs + (clock.pausedAt === null ? 0 : Date.now() - clock.pausedAt),
      });
      live.clearDraft();
      try {
        localStorage.removeItem(uiKey);
      } catch {
        /* Storage can be unavailable. */
      }
      live.invalidateAll();
      setSummary(data.summary);
    } catch (e: any) {
      setFinishError(
        e?.response?.data?.error || "Couldn’t finish this workout. Your sets are still safe."
      );
      setFinishing(false);
      actionInFlight.current = false;
    }
  };
  const discard = async () => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setDiscarding(true);
    try {
      // Wait for any set currently being saved before changing session status.
      if (syncing && !(await live.flush()))
        throw new Error("Wait for your current save to finish before discarding.");
      await limitApi.functions.invoke("workoutCommand", {
        action: "discard",
        sessionId: live.session!.id,
      });
      live.clearDraft();
      try {
        localStorage.removeItem(uiKey);
      } catch {
        /* Storage can be unavailable. */
      }
      live.invalidateAll();
      nav("/workout", { replace: true });
    } catch (e: any) {
      setInlineError(
        e?.response?.data?.error || e.message || "Couldn’t discard this workout. Try again."
      );
    } finally {
      actionInFlight.current = false;
      setDiscarding(false);
    }
  };
  return (
    <main className="mx-auto min-h-screen max-w-md md:max-w-3xl lg:max-w-6xl bg-background px-4 md:px-6 pb-36 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 py-3 shadow-[0_14px_35px_hsl(var(--background)/.8)] backdrop-blur-2xl md:-mx-6 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            disabled={finishing || discarding}
            onClick={() => setCancelOpen(true)}
            aria-label="Leave workout"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">
              Live ·{" "}
              <Elapsed
                startedAt={live.session!.startedAt}
                pausedAt={clock.pausedAt}
                pausedMs={clock.pausedMs}
              />
            </p>
            <h1 className="truncate font-heading text-xl font-black uppercase">{live.day!.name}</h1>
          </div>
        </div>
        <button
          onClick={finish}
          disabled={finishing || discarding || !live.rows.some((r) => r.completed)}
          className="limit-button min-h-11 rounded-xl px-4 text-sm font-black disabled:opacity-50"
        >
          {finishing ? "Saving…" : "Finish"}
        </button>
      </header>
      <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>
          {doneExercises} / {live.workoutExercises.filter((x) => !x.skipped).length} exercises
        </span>
        <span>{live.rows.filter((r) => r.completed).length} sets done</span>
      </div>
      <WorkoutSyncStatus
        pending={pending}
        syncing={syncing}
        error={live.syncError}
        onRetry={live.flush}
      />
      {gyms.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border p-4">
          <label className="block text-sm font-bold" htmlFor="workout-gym">
            Today's gym
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Preview equipment gaps before choosing. Your program and completed sets stay unchanged.
          </p>
          <select
            id="workout-gym"
            className="mt-3 min-h-11 w-full rounded-xl border bg-background px-3"
            value={
              previewGymId === undefined
                ? live.session?.equipmentProfileId || ""
                : previewGymId || ""
            }
            onChange={(event) => setPreviewGymId(event.target.value || null)}
          >
            <option value="">Default equipment</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
          {previewGymId !== undefined && (
            <div className="mt-3 text-sm">
              {unavailable.length ? (
                <>
                  <p className="font-semibold">
                    {unavailable.length} movement{unavailable.length === 1 ? "" : "s"} need a
                    review:
                  </p>
                  <ul className="mt-2 space-y-2">
                    {unavailable.map((we) => {
                      const source = live.exercisesById[we.exerciseId];
                      const locked =
                        live.plan?.structureLocked ||
                        live.plan?.athleteMode === "track_only" ||
                        we.coachMandated;
                      const options = locked
                        ? []
                        : (live.allExercises || [])
                            .filter((item) => suitableReplacement(source, item, previewProfile))
                            .slice(0, 3);
                      return (
                        <li key={we.id} className="rounded-xl bg-secondary p-3">
                          <b>{we.exerciseName}</b> ·{" "}
                          {locked
                            ? "Locked by your program; ask your coach"
                            : options.length
                              ? `Consider ${options.map((item) => item.name).join(", ")}`
                              : "No suitable replacement found"}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p>All planned movements are available with this equipment.</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Selecting a gym never replaces movements automatically. Use each movement’s options
                to choose a substitution.
              </p>
              <button
                type="button"
                disabled={selectingGym}
                className="limit-button mt-3 min-h-11 rounded-xl px-4 text-sm font-bold"
                onClick={async () => {
                  setSelectingGym(true);
                  const error = await live.selectEquipmentProfile(previewGymId);
                  setSelectingGym(false);
                  if (error) setInlineError(error);
                  else setPreviewGymId(undefined);
                }}
              >
                Use {previewGym?.name || "default equipment"} for this workout
              </button>
            </div>
          )}
          {selectedGym && (
            <p className="mt-2 text-xs text-muted-foreground">
              Using {selectedGym.name} for replacement choices.
            </p>
          )}
        </div>
      )}
      {live.conflict && (
        <div role="alert" className="mb-4 rounded-xl border border-border p-4 text-sm">
          Another screen saved a different version. Your local edits have not replaced it.
          <button
            className="mt-2 block min-h-11 font-bold text-primary"
            onClick={() => {
              if (window.confirm("Replace this device’s unsynced edits with the saved workout?")) {
                live.clearDraft();
                try {
                  localStorage.removeItem(uiKey);
                } catch {
                  /* Storage can be unavailable. */
                }
                window.location.reload();
              }
            }}
          >
            Load saved version
          </button>
        </div>
      )}
      {(inlineError || finishError) && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          <b>{inlineError || finishError}</b>
          {finishError && (
            <button onClick={finish} className="mt-2 block min-h-9 font-bold text-primary">
              Try again
            </button>
          )}
        </div>
      )}
      <div className="mx-auto mt-5 max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            Movement {currentExercise + 1} of {live.workoutExercises.length}
          </p>
          <button
            className="min-h-11 rounded-xl border px-4 text-sm font-semibold"
            onClick={clock.togglePause}
          >
            {paused ? "Resume workout" : "Pause workout"}
          </button>
        </div>
        {paused && (
          <div
            role="status"
            className="mt-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm"
          >
            Workout paused. Your entries are saved on this device. Resume when you are ready.
          </div>
        )}
      </div>
      <fieldset disabled={finishing || discarding || paused} className="mx-auto min-w-0 max-w-2xl">
        {live.workoutExercises
          .slice(
            Math.min(currentExercise, live.workoutExercises.length - 1),
            Math.min(currentExercise, live.workoutExercises.length - 1) + 1
          )
          .map((we) => (
            <ExerciseCard
              key={we.id}
              workoutExercise={we}
              exercise={live.exercisesById[we.exerciseId]}
              rows={live.rows.filter((r) => r.workoutExerciseId === we.id)}
              previousSets={live.previousByExercise[we.exerciseName]}
              savingIds={live.savingIds}
              onEdit={live.edit}
              onToggle={handleToggle}
              onAddSet={() => live.addSet(we.id)}
              onRemoveSet={live.removeSet}
              allExercises={live.allExercises || Object.values(live.exercisesById)}
              profile={
                selectedGym ? { ...live.profile, equipment: selectedGym.equipment } : live.profile
              }
              plan={live.plan}
              onReplace={(e: any) => live.replaceExercise(we, e)}
              onSkip={() => live.skipExercise(we)}
            />
          ))}
      </fieldset>
      <nav
        aria-label="Workout exercises"
        className="mx-auto mt-5 flex max-w-2xl items-center justify-between gap-3"
      >
        <button
          disabled={currentExercise === 0}
          className="min-h-12 rounded-xl border px-4 text-sm disabled:opacity-40"
          onClick={() => setCurrentExercise((i) => Math.max(0, i - 1))}
        >
          Previous
        </button>
        <div className="min-w-0 text-center text-xs text-muted-foreground">
          {live.workoutExercises[currentExercise + 1] ? (
            <>
              Up next
              <br />
              <strong className="text-foreground">
                {live.workoutExercises[currentExercise + 1].exerciseName}
              </strong>
            </>
          ) : (
            "Last movement · finish when ready"
          )}
        </div>
        <button
          disabled={currentExercise >= live.workoutExercises.length - 1}
          className="limit-button min-h-12 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
          onClick={() =>
            setCurrentExercise((i) => Math.min(live.workoutExercises.length - 1, i + 1))
          }
        >
          Next
        </button>
      </nav>

      {rest && !paused && (
        <RestTimer
          endsAt={rest}
          onAdjust={(d: number) => setRest((r) => r! + d * 1000)}
          onSkip={() => setRest(null)}
        />
      )}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="max-w-sm rounded-3xl border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Your synced sets and device draft will be ready when you return. Discard only if you
              want to end it without counting it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep training</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nav("/workout")}
              className="bg-secondary text-foreground"
            >
              Save & leave
            </AlertDialogAction>
            <AlertDialogAction
              onClick={discard}
              className="bg-destructive text-destructive-foreground"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
