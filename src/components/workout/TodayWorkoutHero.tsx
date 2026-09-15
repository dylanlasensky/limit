import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw, CheckCircle2 } from "lucide-react";
import { estimateMinutes } from "@/lib/training/planService";

interface TodayWorkoutHeroProps {
  day?: Record<string, any> | null;
  exercises: any[];
  activeSession?: Record<string, any> | null;
  completedSession?: Record<string, any> | null;
  onPreview?: () => void;
}

// States: rest | not started | active (resume) | completed
export default function TodayWorkoutHero({
  day,
  exercises,
  activeSession,
  completedSession,
  onPreview,
}: TodayWorkoutHeroProps) {
  const nav = useNavigate();
  if (!day && !activeSession)
    return (
      <section className="limit-surface mt-5 rounded-3xl p-6">
        <p className="limit-kicker">Your next step</p>
        <h2 className="mt-3 text-2xl font-bold">Build your training week.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A plan that fits your goals, time, and equipment.
        </p>
        <button
          onClick={() => nav("/workout")}
          className="limit-button mt-5 min-h-12 w-full rounded-xl font-bold"
        >
          Set up my program
        </button>
      </section>
    );
  if (day?.isRest && !activeSession) {
    const next = day?.next;
    return (
      <section className="limit-hero mt-5 rounded-[2rem] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">
          Today
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Recovery day</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {next ? `Next: ${next.name} · ${next.label}` : "Rest and refuel."}
        </p>
      </section>
    );
  }
  const working = exercises.reduce((a, x) => a + (x.sets || 3), 0);
  const minutes = estimateMinutes(exercises);
  if (completedSession) {
    const mm = Math.floor((completedSession.durationMinutes || 0) / 60),
      rem = (completedSession.durationMinutes || 0) % 60;
    return (
      <section className="limit-hero mt-5 rounded-[2rem] border-primary/35 p-6 shadow-[0_20px_60px_hsl(var(--primary)/.1)]">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" /> Completed today
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{day?.name}</h2>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          {mm > 0 ? `${mm}h ${String(rem).padStart(2, "0")}m` : `${rem} min`} ·{" "}
          {completedSession.setCount || 0} sets ·{" "}
          {(completedSession.totalVolume || 0).toLocaleString()} lb
          {completedSession.prCount
            ? ` · ${completedSession.prCount} PR${completedSession.prCount > 1 ? "s" : ""}`
            : ""}
        </p>
      </section>
    );
  }
  if (activeSession) {
    const min = Math.max(
      1,
      Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 60000)
    );
    return (
      <section className="limit-hero mt-5 rounded-[2rem] border-primary/50 p-6 shadow-[0_20px_60px_hsl(var(--primary)/.14)]">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">
          Workout in progress
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{activeSession.name}</h2>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">{min} min elapsed</p>
        <button
          onClick={() => nav(`/live-workout/${activeSession.workoutDayId}`)}
          className="limit-button relative z-10 mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-black tracking-wide"
        >
          <RotateCcw className="h-4 w-4" /> RESUME
        </button>
      </section>
    );
  }
  return (
    <section className="limit-hero mt-5 rounded-[2rem] p-6">
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Today</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">{day?.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{(day?.targetMuscles || []).join(" • ")}</p>
      {exercises.length > 0 && (
        <p className="mt-3 text-xs font-bold tabular-nums text-muted-foreground">
          {exercises.length} EXERCISES · {working} WORKING SETS · ~{minutes} MIN
        </p>
      )}
      <button
        onClick={() => nav(`/live-workout/${day!.id}`)}
        className="limit-button relative z-10 mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-black tracking-wide"
      >
        START WORKOUT <ArrowRight className="h-4 w-4" />
      </button>
      {onPreview && (
        <button
          onClick={onPreview}
          className="relative z-10 mt-2 min-h-11 w-full text-sm font-semibold text-primary"
        >
          Preview today’s workout
        </button>
      )}
    </section>
  );
}
