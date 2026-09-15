import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Utensils } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { sumMacros } from "@/components/limit/data";
import useLocalDate from "@/hooks/use-local-date";
import ScreenState from "@/components/limit/ScreenState";
import useActivePlan, { todayWeekday } from "@/hooks/use-active-plan";
import HomeWorkout from "@/components/limit/HomeWorkout";
import MacroCard from "@/components/limit/MacroCard";
import PullToRefresh from "@/components/limit/PullToRefresh";
import SectionHeading from "@/components/limit/SectionHeading";
import WeeklyActivity from "@/components/limit/WeeklyActivity";
import HomeHealthBrief from "@/components/health/HomeHealthBrief";
import {
  readHealthMetrics,
  readDailyCheckIn,
  type HealthMetricRecord,
} from "@/lib/health/health-data";
import { listFoodEntries } from "@/lib/food-entry";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default function Home() {
  const date = useLocalDate();
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 30000,
  });
  const foodsQuery = useQuery({
    queryKey: ["foodEntries", date],
    queryFn: () => listFoodEntries(date),
    staleTime: 30000,
  });
  const planQuery = useActivePlan();
  const workoutExercises = useQuery({
    queryKey: ["workoutExercises", planQuery.data?.plan?.id],
    enabled: !!planQuery.data?.days?.length,
    queryFn: () => {
      const days = planQuery.data?.days;
      if (!days?.length) return [];
      return base44.entities.WorkoutExercise.filter(
        { workoutDayId: { $in: days.map((d) => d.id) } },
        "order",
        500
      );
    },
    staleTime: 60000,
  });
  const sessionsQuery = useQuery({
    queryKey: ["todaySession", date],
    queryFn: async () => {
      const [todayRows, activeRows] = await Promise.all([
        base44.entities.WorkoutSession.filter({ date }),
        base44.entities.WorkoutSession.filter({ status: "active" }, "-created_date", 10),
      ]);
      return [...new Map([...activeRows, ...todayRows].map((x: any) => [x.id, x])).values()];
    },
    staleTime: 15000,
  });
  const historyQuery = useQuery({
    queryKey: ["homeWorkoutHistory"],
    staleTime: 30000,
    queryFn: () => base44.entities.WorkoutSession.filter({ status: "completed" }, "-date", 100),
  });
  const healthQuery = useQuery({
    queryKey: ["todayHealth", date],
    queryFn: () => readHealthMetrics({ from: date, through: date }),
    staleTime: 30000,
  });
  const checkInQuery = useQuery({
    queryKey: ["dailyCheckIn", date],
    queryFn: () => readDailyCheckIn(date),
    staleTime: 30000,
  });

  const p: any = profile.data?.[0] || {};
  const foods: any[] = foodsQuery.data || [];
  const { days = [], plan } = planQuery.data || {};
  const sessions: any[] = historyQuery.data || [];
  const m = sumMacros(foods);
  const weekday = todayWeekday();
  const day = days.find((x: any) => x.weekday === weekday);
  const dayExercises = (workoutExercises.data || []).filter((x: any) => x.workoutDayId === day?.id);
  const todaySessions: any[] = sessionsQuery.data || [];
  const activeSession = todaySessions.find((s) => s.status === "active");
  const activeDay = days.find((d: any) => d.id === activeSession?.workoutDayId);
  const completedSession = todaySessions.find(
    (s) => s.status === "completed" && s.workoutDayId === day?.id
  );
  const heroLine = completedSession
    ? "Workout complete. Make room for recovery."
    : activeSession
      ? "Your workout is ready when you are."
      : day && !day.isRest
        ? "A little stronger, one session at a time."
        : days.length
          ? "Room to recover. Space to grow."
          : "Your training, nutrition, and progress in one place.";
  const hasTargets = !!p.calorieTarget;

  const refresh = () =>
    Promise.all([
      profile.refetch(),
      foodsQuery.refetch(),
      planQuery.refetch(),
      workoutExercises.refetch(),
      sessionsQuery.refetch(),
      historyQuery.refetch(),
      healthQuery.refetch(),
      checkInQuery.refetch(),
    ]);
  if (profile.isLoading || planQuery.isLoading || sessionsQuery.isLoading)
    return <ScreenState loading />;
  if (profile.error || planQuery.error || sessionsQuery.error || workoutExercises.error) {
    return (
      <ScreenState
        title="Couldn’t load your dashboard"
        description="We couldn’t retrieve all your data. Try again to see your saved progress."
        onAction={() => void refresh()}
      />
    );
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        <header className="mb-6 px-1 pb-1 pt-3">
          <div className="relative z-10">
            <p className="limit-kicker">{format(new Date(), "EEEE, MMM d")}</p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-[-.04em] sm:text-4xl">
              {greeting()}
              {p.name ? `, ${p.name.split(" ")[0]}` : ""}
            </h1>
            {heroLine && (
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {heroLine}
              </p>
            )}
          </div>
        </header>
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="min-w-0">
            <HomeWorkout
              day={activeDay || day}
              exercises={
                activeDay
                  ? (workoutExercises.data || []).filter(
                      (x: any) => x.workoutDayId === activeDay.id
                    )
                  : dayExercises
              }
              activeSession={activeSession}
              completedSession={activeDay ? null : completedSession}
            />
            <div className="mb-5 mt-4 grid grid-cols-2 gap-3">
              {[
                { to: "/workout?tab=exercises", label: "Exercise library", Icon: BookOpen },
                { to: "/nutrition", label: "Food diary", Icon: Utensils },
              ].map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 text-xs font-semibold transition-colors hover:border-primary/50"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1">{label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            {(healthQuery.isLoading || checkInQuery.isLoading) && (
              <div
                className="mt-5 h-40 animate-pulse rounded-3xl bg-card/70"
                aria-label="Loading daily brief"
              />
            )}
            {!healthQuery.isLoading &&
              !checkInQuery.isLoading &&
              !healthQuery.error &&
              !checkInQuery.error && (
                <HomeHealthBrief
                  date={date}
                  rows={(healthQuery.data || []) as HealthMetricRecord[]}
                  checkIn={checkInQuery.data}
                  onCheckInSaved={(saved) => client.setQueryData(["dailyCheckIn", date], saved)}
                />
              )}
            {(healthQuery.error || checkInQuery.error) && (
              <Link
                to="/progress"
                className="mt-4 block rounded-2xl border border-border bg-card p-4 text-sm"
              >
                Your daily brief couldn’t load. Open Health to try again →
              </Link>
            )}
            {!!sessions.length && !historyQuery.error && (
              <div className="mt-4">
                <WeeklyActivity
                  sessions={sessions}
                  date={date}
                  goal={plan?.daysPerWeek || p.trainingDays?.length}
                />
              </div>
            )}
          </div>
        </div>
        <SectionHeading label="Today" title="Nutrition" to="/nutrition" action="Log food" />
        {foodsQuery.error ? (
          <button
            onClick={() => foodsQuery.refetch()}
            className="min-h-14 w-full rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground"
          >
            Nutrition couldn’t load · Retry
          </button>
        ) : foodsQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-card" aria-label="Loading nutrition" />
        ) : hasTargets ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MacroCard label="Calories" value={m.calories} goal={p.calorieTarget} unit="" />
            <MacroCard label="Protein" value={m.protein} goal={p.proteinTarget} />
            <MacroCard label="Carbs" value={m.carbs} goal={p.carbTarget} />
            <MacroCard label="Fat" value={m.fat} goal={p.fatTarget} />
          </div>
        ) : profile.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-card/70" />
            ))}
          </div>
        ) : (
          <Link
            to="/profile#nutrition"
            className="block rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground"
          >
            Set your nutrition targets in Profile to track macros here.
            <span className="mt-3 block font-semibold text-primary">Set up nutrition →</span>
          </Link>
        )}
      </div>
    </PullToRefresh>
  );
}
