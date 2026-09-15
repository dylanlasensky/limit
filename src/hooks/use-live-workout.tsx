import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import { useAuth } from "@/lib/AuthContext";
import { draftKey, readDraft, initialRows } from "@/components/workout/workoutDraft";
import useWorkoutRows from "@/components/workout/useWorkoutRows";

export interface WorkoutRow {
  key: string;
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  setNumber: number;
  weight: string;
  reps: string;
  rir: any;
  completed: boolean;
  savedId: string | null;
  revision: string;
  pending: boolean;
  operationId?: string;
  removed?: boolean;
  [key: string]: any;
}

export interface WorkoutRowsApi {
  rows: WorkoutRow[];
  setRows: (next: WorkoutRow[] | ((rows: WorkoutRow[]) => WorkoutRow[])) => void;
  savingIds: Set<string>;
  syncError: string;
  conflict: boolean;
  flush: () => Promise<boolean>;
  edit: (key: string, field: string, value: any) => void;
  toggle: (key: string) => Promise<string | null>;
  addSet: (workoutExerciseId: string) => void;
  removeSet: (key: string) => void;
  current: React.MutableRefObject<WorkoutRow[]>;
}

export interface LiveWorkoutState {
  loading: boolean;
  day: any | null;
  plan?: any;
  workoutExercises: any[];
  exercisesById: Record<string, any>;
  allExercises?: any[];
  profile?: any;
  previousByExercise: Record<string, any[]>;
  session: any | null;
  error: string | null;
  offline?: boolean;
}

export default function useLiveWorkout(workoutDayId: string | undefined) {
  const { user } = useAuth(),
    client = useQueryClient(),
    key = user?.id ? draftKey(user.id, workoutDayId as string) : null;
  const [state, setState] = useState<LiveWorkoutState>({
      loading: true,
      day: null,
      workoutExercises: [],
      exercisesById: {},
      previousByExercise: {},
      session: null,
      error: null,
    }),
    [attempt, retry] = useState(0);
  const rowState = useWorkoutRows(state, key) as unknown as WorkoutRowsApi;
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      const draft = readDraft(key);
      try {
        setState((s) => ({ ...s, loading: true, error: null }));
        const [day, templates, exercises, profiles] = await Promise.all([
          base44.entities.WorkoutDay.get(workoutDayId as string),
          base44.entities.WorkoutExercise.filter({ workoutDayId }),
          listExercises(),
          base44.entities.UserProfile.list(),
        ]);
        const plan = await base44.entities.WorkoutPlan.get((day as any).planId);
        const { data } = await base44.functions.invoke("workoutCommand", {
          action: "start",
          workoutDayId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const session = data.session;
        if (data.redirectWorkoutDayId && data.redirectWorkoutDayId !== workoutDayId) {
          window.location.replace(`/live-workout/${data.redirectWorkoutDayId}`);
          return;
        }
        if (session.status === "completed") {
          window.location.replace(`/workout/history/${session.id}`);
          return;
        }
        const [savedSets, completedSessions] = await Promise.all([
          base44.entities.ExerciseSet.filter({ workoutSessionId: session.id }),
          base44.entities.WorkoutSession.filter({ status: "completed" }, "-completedAt", 30),
        ]);
        const recentSets = completedSessions.length
          ? await base44.entities.ExerciseSet.filter(
              {
                workoutSessionId: { $in: completedSessions.map((s: any) => s.id) },
                completed: true,
              },
              "-timestamp",
              1000
            )
          : [];
        const exercisesById: Record<string, any> = Object.fromEntries(
          exercises.map((e: any) => [e.id, e])
        );
        const workoutExercises: any[] = templates
          .sort((a: any, b: any) => a.order - b.order)
          .map((we: any) => {
            const saved = savedSets.find((s: any) => s.workoutExerciseId === we.id);
            const local =
              draft?.session?.id === session.id
                ? draft!.workoutExercises?.find((e: any) => e.id === we.id)
                : null;
            return (
              local ||
              (saved
                ? { ...we, exerciseId: saved.exerciseId, exerciseName: saved.exerciseName }
                : we)
            );
          });
        const previousByExercise: Record<string, any[]> = {};
        workoutExercises.forEach((we) => {
          const previous = completedSessions.find(
            (s: any) =>
              s.id !== session.id &&
              recentSets.some(
                (r: any) => r.workoutSessionId === s.id && r.exerciseName === we.exerciseName
              )
          );
          previousByExercise[we.exerciseName] = recentSets
            .filter(
              (r: any) => r.workoutSessionId === previous?.id && r.exerciseName === we.exerciseName
            )
            .sort((a: any, b: any) => a.setNumber - b.setNumber);
        });
        if (cancelled) return;
        rowState.setRows(
          initialRows(
            workoutExercises,
            exercisesById,
            savedSets,
            draft?.session?.id === session.id ? draft!.rows : []
          )
        );
        setState({
          loading: false,
          day,
          plan,
          workoutExercises,
          exercisesById,
          allExercises: exercises,
          profile: profiles[0] || {},
          previousByExercise,
          session,
          error: null,
        });
      } catch (e: any) {
        if (cancelled) return;
        if (draft?.session?.status === "active") {
          rowState.setRows(draft.rows);
          setState({ ...draft, loading: false, error: null, offline: true } as LiveWorkoutState);
        } else
          setState((s) => ({
            ...s,
            loading: false,
            error: e?.response?.data?.error || "Couldn’t load this workout.",
          }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, workoutDayId, attempt]);
  const invalidateAll = () =>
    [
      "activePlan",
      "workoutHistory",
      "activeSession",
      "todaySession",
      "muscleRatingData",
      "progressRatingData",
      "progressData",
      "homeWorkoutHistory",
      "libraryRecentSets",
      "workoutExercises",
      "personalRecords",
      "workoutDetail",
    ].forEach((k) => client.invalidateQueries({ queryKey: [k] }));
  const replaceExercise = (we: any, exercise: any) => {
    setState((s) => ({
      ...s,
      workoutExercises: s.workoutExercises.map((x) =>
        x.id === we.id ? { ...x, exerciseId: exercise.id, exerciseName: exercise.name } : x
      ),
    }));
    rowState.setRows((rs) =>
      rs.map((r) =>
        r.workoutExerciseId === we.id
          ? {
              ...r,
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              primaryMuscle: exercise.primaryMuscle,
              weight: "",
              reps: "",
              completed: false,
            }
          : r
      )
    );
  };
  const skipExercise = (we: any) =>
    setState((s) => ({
      ...s,
      workoutExercises: s.workoutExercises.map((x) =>
        x.id === we.id ? { ...x, skipped: !x.skipped } : x
      ),
    }));
  useEffect(() => {
    if (key && state.session) rowState.setRows((rs) => rs);
  }, [state.workoutExercises]);
  return {
    ...state,
    ...rowState,
    replaceExercise,
    skipExercise,
    retry: () => retry((n: number) => n + 1),
    clearDraft: () => {
      // A completed server save must not be reported as failed just because
      // the browser cannot clear storage. Reload ignores completed drafts.
      try {
        if (key) localStorage.removeItem(key);
      } catch {
        /* Best effort. */
      }
    },
    invalidateAll,
  };
}
