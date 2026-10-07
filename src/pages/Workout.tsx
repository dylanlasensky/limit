import React, { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { limitApi } from "@/api/client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import SegmentedTabs from "@/components/limit/SegmentedTabs";
import ScreenState from "@/components/limit/ScreenState";
import ExerciseLibrary from "@/components/workout/ExerciseLibrary";
import { addDays, format, startOfWeek } from "date-fns";
import useActivePlan, { todayWeekday } from "@/hooks/use-active-plan";
import { scheduledDay, useWeekSchedule } from "@/hooks/use-week-schedule";
import WeekScheduleEditor from "@/components/workout/WeekScheduleEditor";
import WeekStrip from "@/components/workout/WeekStrip";
import TodayWorkoutHero from "@/components/workout/TodayWorkoutHero";
import PlanOptions from "@/components/workout/PlanOptions";
import PullToRefresh from "@/components/limit/PullToRefresh";
import useLocalDate from "@/hooks/use-local-date";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import WorkoutPreview from "@/components/workout/WorkoutPreview";
import { uniqueHistory } from "@/lib/training/workoutHistory";

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
  const [previewDay, setPreviewDay] = useState<Record<string, any> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab =
    ({ exercises: "Exercises", history: "History" } as Record<string, string>)[
      searchParams.get("tab") || ""
    ] || "Schedule";
  const setTab = (value: string) =>
    setSearchParams(value === "Schedule" ? {} : { tab: value.toLowerCase() }, { replace: true });
  const nav = useNavigate();
  const planQuery = useActivePlan();
  const changesQuery = useWeekSchedule(planQuery.data?.plan?.id, user?.id, currentDate);
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
      limitApi.entities.WorkoutExercise.filter(
        { workoutDayId: { $in: (planQuery.data?.days || []).map((d) => d.id) } },
        "order",
        500
      ),
    staleTime: 60000,
  });
  const historyQuery = useInfiniteQuery({
    queryKey: ["workoutHistory", user?.id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      limitApi.entities.WorkoutSession.filter({ status: "completed" }, "-date", 30, pageParam),
    getNextPageParam: (last, _pages, offset) => (last.length === 30 ? offset + 30 : undefined),
    staleTime: 30000,
  });
  const activeQuery = useQuery({
    queryKey: ["activeSession"],
    queryFn: () => limitApi.entities.WorkoutSession.filter({ status: "active" }, "-created_date"),
    staleTime: 15000,
  });
  const weekStartKey = format(
    startOfWeek(new Date(`${currentDate}T12:00:00`), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const weekSessionsQuery = useQuery({
    queryKey: ["workoutWeekSessions", user?.id, weekStartKey],
    enabled: !!user?.id,
    queryFn: () =>
      limitApi.entities.WorkoutSession.filter({ date: { $gte: weekStartKey } }, "-date", 100),
    staleTime: 15000,
  });
  const recentSetsQuery = useQuery({
    queryKey: ["libraryRecentSets", user?.id],
    enabled: tab === "Exercises" && !!user?.id,
    queryFn: () => limitApi.entities.ExerciseSet.filter({ completed: true }, "-timestamp", 300),
    staleTime: 30000,
  });

  const { plan, days = [] } = planQuery.data || {};
  const changes = changesQuery.data || [];
  const exercises: any[] = exQuery.data || [],
    history = uniqueHistory(historyQuery.data?.pages || []);
  const weekday = todayWeekday();
  const weekStartDate = startOfWeek(new Date(`${currentDate}T12:00:00`), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStartDate, i), "yyyy-MM-dd")
  );
  const visibleDays = weekDates.map((date, i) => {
    const recurring = days.find((d: any) => d.weekday === i);
    const effective = scheduledDay(days, changes, date);
    return effective
      ? { ...effective, weekday: i, temporary: effective.id !== recurring?.id }
      : {
          ...recurring,
          weekday: i,
          isRest: true,
          name: "Rest",
          temporary: !!recurring && !recurring.isRest,
        };
  });
  const today = visibleDays[weekday];
  const completedWeekdays = new Set(
    history
      .filter((s) => weekDates.includes(s.date || ""))
      .map((s) => weekDates.indexOf(s.date || ""))
  );
  const trainingDays = days.filter((d: any) => !d.isRest);
  const todayStr = currentDate;
  const activeSession = activeQuery.data?.[0];
  const activeDay = days.find((d: any) => d.id === activeSession?.workoutDayId);
  const completedToday = history.find((s) => s.date === todayStr);
  const nextDay = today?.isRest
    ? (() => {
        for (let i = 1; i <= 7; i++) {
          const futureDate = format(addDays(new Date(`${currentDate}T12:00:00`), i), "yyyy-MM-dd");
          const d = scheduledDay(days, changes, futureDate);
          if (d?.isRest) continue;
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
      changesQuery.refetch(),
      historyQuery.refetch(),
      activeQuery.refetch(),
      weekSessionsQuery.refetch(),
      weQuery.refetch(),
      exQuery.refetch(),
      ...(tab === "Exercises" ? [recentSetsQuery.refetch()] : []),
    ]);
  if (
    tab === "Schedule" &&
    (planQuery.error ||
      weQuery.error ||
      (historyQuery.error && !history.length) ||
      activeQuery.error ||
      weekSessionsQuery.error ||
      (plan && changesQuery.error))
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
            <div className="lg:grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
              <div className="min-w-0 lg:sticky lg:top-6">
                <WeekStrip
                  days={visibleDays}
                  completedWeekdays={completedWeekdays}
                  onPreview={setPreviewDay}
                />
                <TodayWorkoutHero
                  day={activeDay || nextDay}
                  exercises={(weQuery.data || []).filter(
                    (x: any) => x.workoutDayId === (activeDay?.id || today?.id)
                  )}
                  activeSession={activeSession}
                  completedSession={activeDay ? null : completedToday}
                  onPreview={() => setPreviewDay(activeDay || today || null)}
                />
                {activeSession && activeSession.workoutDayId !== today?.id && (
                  <p className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
                    You have a workout in progress from another day. Resume it from its schedule row
                    or it will stay open.
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <p className="mb-2 mt-7 lg:mt-0 text-xs font-black tracking-[.16em] text-muted-foreground">
                  {plan.name.toUpperCase()} · {plan.daysPerWeek} DAYS
                </p>
                {plan.description && (
                  <details className="mb-4 rounded-2xl border border-border bg-card px-4 py-3">
                    <summary className="cursor-pointer py-1 text-sm font-semibold">
                      About your plan
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {plan.description}
                    </p>
                  </details>
                )}
                <div className="space-y-2">
                  {visibleDays.map((d: any) => (
                    <div
                      key={d.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${d.weekday === weekday ? "border-primary/40 bg-primary/[.07] shadow-[inset_3px_0_0_hsl(var(--primary))]" : "border-border/50 bg-card/60"}`}
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {WEEKDAY_LABELS[d.weekday]}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
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
                          {d.temporary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-black tracking-wider text-primary">
                              THIS WEEK
                            </span>
                          )}
                        </div>
                        {!d.isRest && (
                          <p className="text-xs text-muted-foreground">
                            {
                              (weQuery.data || []).filter((x: any) => x.workoutDayId === d.id)
                                .length
                            }{" "}
                            exercises
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewDay(d)}
                          aria-label={`Preview ${WEEKDAY_LABELS[d.weekday]} ${d.name}`}
                          className="min-h-11 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground"
                        >
                          Preview
                        </button>
                        {!d.isRest && (
                          <button
                            onClick={() => nav(`/live-workout/${d.id}`)}
                            className={`rounded-xl px-4 py-2.5 text-sm font-bold ${activeSession?.workoutDayId === d.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                          >
                            {activeSession?.workoutDayId === d.id ? "Resume" : "Start"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <WeekScheduleEditor
                  plan={plan}
                  days={days}
                  changes={changes}
                  history={weekSessionsQuery.data || []}
                  activeSession={activeSession}
                  today={currentDate}
                  userId={user?.id}
                />
                <PlanOptions
                  plan={plan}
                  onGenerate={() => nav("/profile")}
                  onImport={() => nav("/workout/import")}
                  onEdit={() => nav(`/workout/import?plan=${plan.id}`)}
                />
              </div>
            </div>
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

        {tab === "History" && (
          <WorkoutHistory
            sessions={history}
            loading={historyQuery.isLoading}
            error={!!historyQuery.error}
            hasMore={!!historyQuery.hasNextPage}
            loadingMore={historyQuery.isFetchingNextPage}
            onLoadMore={() => void historyQuery.fetchNextPage()}
            onRetry={() => void historyQuery.refetch()}
            today={currentDate}
          />
        )}
        <WorkoutPreview
          loading={weQuery.isLoading}
          day={previewDay}
          rows={weQuery.data || []}
          exercises={exercises}
          activeSession={activeSession}
          onClose={() => setPreviewDay(null)}
          onStart={(dayId) => {
            setPreviewDay(null);
            nav(`/live-workout/${dayId}`);
          }}
        />
      </div>
    </PullToRefresh>
  );
}
