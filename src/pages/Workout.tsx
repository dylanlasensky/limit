import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import SegmentedTabs from "@/components/limit/SegmentedTabs";
import ScreenState from "@/components/limit/ScreenState";
import ExerciseLibrary from "@/components/workout/ExerciseLibrary";
import { format, startOfWeek } from "date-fns";
import useActivePlan, { todayWeekday } from "@/hooks/use-active-plan";
import WeekStrip from "@/components/workout/WeekStrip";
import TodayWorkoutHero from "@/components/workout/TodayWorkoutHero";
import PlanOptions from "@/components/workout/PlanOptions";
import PullToRefresh from "@/components/limit/PullToRefresh";
import useLocalDate from "@/hooks/use-local-date";

const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function Workout() {
  const currentDate = useLocalDate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab =
    ({ exercises: "Exercises", history: "History" } as Record<string, string>)[
      searchParams.get("tab") || ""
    ] || "Schedule";
  const setTab = (value: string) =>
    setSearchParams(value === "Schedule" ? {} : { tab: value.toLowerCase() }, { replace: true });
  const nav = useNavigate();
  const planQuery = useActivePlan();
  const exQuery = useQuery({
    queryKey: ["exercises"],
    queryFn: () => listExercises(),
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
  const weQuery = useQuery({
    queryKey: ["workoutExercises", planQuery.data?.plan?.id],
    enabled: !!planQuery.data?.days?.length,
    queryFn: () =>
      base44.entities.WorkoutExercise.filter(
        { workoutDayId: { $in: (planQuery.data?.days || []).map((d) => d.id) } },
        "order",
        500
      ),
    staleTime: 60000,
  });
  const historyQuery = useQuery({
    queryKey: ["workoutHistory"],
    queryFn: () => base44.entities.WorkoutSession.filter({ status: "completed" }, "-date", 30),
    staleTime: 30000,
  });
  const activeQuery = useQuery({
    queryKey: ["activeSession"],
    queryFn: () => base44.entities.WorkoutSession.filter({ status: "active" }, "-created_date"),
    staleTime: 15000,
  });
  const recentSetsQuery = useQuery({
    queryKey: ["libraryRecentSets", user?.id],
    enabled: tab === "Exercises" && !!user?.id,
    queryFn: () => base44.entities.ExerciseSet.filter({ completed: true }, "-timestamp", 300),
    staleTime: 30000,
  });

  const { plan, days = [] } = planQuery.data || {};
  const exercises: any[] = exQuery.data || [],
    history: any[] = historyQuery.data || [];
  const weekday = todayWeekday();
  const today = days.find((d: any) => d.weekday === weekday);
  const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const completedWeekdays = new Set(
    history
      .filter((s) => s.date >= format(weekStartDate, "yyyy-MM-dd"))
      .map((s) => days.findIndex((d: any) => d.id === s.workoutDayId))
      .filter((i) => i >= 0)
      .map((i): number => days[i].weekday)
  );
  const trainingDays = days.filter((d: any) => !d.isRest);
  const todayStr = currentDate;
  const activeSession = activeQuery.data?.[0];
  const activeDay = days.find((d: any) => d.id === activeSession?.workoutDayId);
  const completedToday = history.find((s) => s.workoutDayId === today?.id && s.date === todayStr);
  const nextDay = today?.isRest
    ? (() => {
        for (let i = 1; i <= 7; i++) {
          const d = days.find((x: any) => x.weekday === (weekday + i) % 7 && !x.isRest);
          if (d)
            return {
              ...today,
              next: {
                name: d.name,
                label: i === 1 ? "Tomorrow" : WEEKDAY_LABELS[(weekday + i) % 7],
              },
            };
        }
        return today;
      })()
    : today;

  const refresh = () =>
    Promise.all([
      planQuery.refetch(),
      historyQuery.refetch(),
      activeQuery.refetch(),
      weQuery.refetch(),
      exQuery.refetch(),
      ...(tab === "Exercises" ? [recentSetsQuery.refetch()] : []),
    ]);
  if (
    tab !== "Exercises" &&
    (planQuery.error || weQuery.error || historyQuery.error || activeQuery.error)
  ) {
    return (
      <ScreenState
        title="Couldn’t load your workouts"
        description="Your saved program hasn’t changed. Please try again."
        onAction={() => void refresh()}
      />
    );
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        <header
          className={
            tab === "Exercises"
              ? "flex items-end justify-between px-1 pb-1 pt-3"
              : "limit-hero flex items-end justify-between rounded-[2rem] p-5"
          }
        >
          <div className="relative z-10">
            <p className="limit-kicker">Move with purpose</p>
            <h1 className="limit-page-title">Workout</h1>
          </div>
          {plan && (
            <div className="relative z-10 text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                This week
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-primary">
                {completedWeekdays.size}
                <span className="text-sm text-muted-foreground"> / {trainingDays.length}</span>
              </p>
            </div>
          )}
        </header>
        <SegmentedTabs
          options={["Schedule", "Exercises", "History"]}
          value={tab}
          onChange={setTab}
          label="Workout sections"
        />
        {tab === "Schedule" &&
          (planQuery.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-card/70" />
              ))}
            </div>
          ) : !plan ? (
            <section className="rounded-3xl border border-border bg-card p-8 text-center">
              <h2 className="text-xl font-black">No workout plan</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Answer a few questions and LIMIT will build and schedule your training week.
              </p>
              <button
                onClick={() => nav("/onboarding")}
                className="limit-button mt-5 h-12 rounded-xl px-6 font-bold"
              >
                Build my plan
              </button>
              <button
                onClick={() => nav("/workout/import")}
                className="mt-3 min-h-11 w-full text-xs font-bold text-muted-foreground"
              >
                Already have a program? Use your own
              </button>
            </section>
          ) : (
            <>
              <WeekStrip days={days} completedWeekdays={completedWeekdays} />
              <TodayWorkoutHero
                day={activeDay || nextDay}
                exercises={(weQuery.data || []).filter(
                  (x: any) => x.workoutDayId === (activeDay?.id || today?.id)
                )}
                activeSession={activeSession}
                completedSession={activeDay ? null : completedToday}
              />
              {activeSession && activeSession.workoutDayId !== today?.id && (
                <p className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
                  You have a workout in progress from another day. Resume it from its schedule row
                  or it will stay open.
                </p>
              )}
              <p className="mb-2 mt-7 text-xs font-black tracking-[.16em] text-muted-foreground">
                {plan.name.toUpperCase()} · {plan.daysPerWeek} DAYS
              </p>
              <div className="space-y-2">
                {days.map((d: any) => (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${d.weekday === weekday ? "border-primary/40 bg-primary/[.07] shadow-[inset_3px_0_0_hsl(var(--primary))]" : "border-border/50 bg-card/60"}`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {WEEKDAY_LABELS[d.weekday]}
                      </p>
                      <div className="flex items-center gap-2">
                        <b className={d.isRest ? "text-muted-foreground" : ""}>{d.name}</b>
                        {d.coachMandated && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-black tracking-wider text-primary">
                            COACH
                          </span>
                        )}
                        {d.fixedSchedule && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[8px] font-black tracking-wider text-muted-foreground">
                            FIXED
                          </span>
                        )}
                      </div>
                      {!d.isRest && (
                        <p className="text-xs text-muted-foreground">
                          {(weQuery.data || []).filter((x: any) => x.workoutDayId === d.id).length}{" "}
                          exercises
                        </p>
                      )}
                    </div>
                    {!d.isRest && (
                      <button
                        onClick={() => nav(`/live-workout/${d.id}`)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold ${activeSession?.workoutDayId === d.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                      >
                        {activeSession?.workoutDayId === d.id ? "Resume" : "Start"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <PlanOptions
                plan={plan}
                onGenerate={() => nav("/profile")}
                onImport={() => nav("/workout/import")}
                onEdit={() => nav(`/workout/import?plan=${plan.id}`)}
              />
            </>
          ))}

        {tab === "Exercises" && (
          <ExerciseLibrary
            exercises={exercises}
            loading={exQuery.isLoading}
            error={!!exQuery.error}
            onRetry={() => void exQuery.refetch()}
            userId={user?.id || "guest"}
            recentSets={recentSetsQuery.data || []}
            recentLoading={recentSetsQuery.isLoading}
            recentError={!!recentSetsQuery.error}
            onRetryRecent={() => void recentSetsQuery.refetch()}
          />
        )}

        {tab === "History" &&
          (history.length ? (
            history.map((x) => (
              <button
                key={x.id}
                onClick={() => nav(`/workout/history/${x.id}`)}
                className="mt-3 w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary"
              >
                <div className="flex justify-between">
                  <b>{x.name}</b>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {format(new Date(`${x.date}T12:00:00`), "MMM d").toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {x.durationMinutes ? `${x.durationMinutes} min · ` : ""}
                  {x.setCount ? `${x.setCount} sets · ` : ""}
                  {Math.round(x.totalVolume || 0).toLocaleString()} lb
                  {x.prCount ? ` · ${x.prCount} PR${x.prCount > 1 ? "s" : ""}` : ""}
                </p>
              </button>
            ))
          ) : (
            <section className="rounded-3xl border border-border bg-card p-8 text-center">
              <h2 className="font-black">Your training history starts here.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Finish your first workout and it will show up in History.
              </p>
            </section>
          ))}
      </div>
    </PullToRefresh>
  );
}
