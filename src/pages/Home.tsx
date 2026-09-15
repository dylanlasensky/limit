import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import { sumMacros } from "@/components/limit/data";
import useLocalDate from "@/hooks/use-local-date";
import ScreenState from "@/components/limit/ScreenState";
import { calculateMuscleRating, emptyRating } from "@/components/limit/muscleRating";
import { profileWeightLb } from "@/components/limit/nutritionTargets";
import useActivePlan, { todayWeekday } from "@/hooks/use-active-plan";
import HomeWorkout from "@/components/limit/HomeWorkout";
import MacroCard from "@/components/limit/MacroCard";
import MuscleRatingPreview from "@/components/limit/MuscleRatingPreview";
import PullToRefresh from "@/components/limit/PullToRefresh";
import SectionHeading from "@/components/limit/SectionHeading";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default function Home() {
  const date = useLocalDate();
  const profile = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 30000,
  });
  const foodsQuery = useQuery({
    queryKey: ["foodEntries", date],
    queryFn: () => base44.entities.FoodEntry.filter({ date }),
    staleTime: 30000,
  });
  const planQuery = useActivePlan();
  const weightsQuery = useQuery({
    queryKey: ["weightEntries"],
    queryFn: async () => (await base44.entities.WeightEntry.list("-date", 30)).reverse(),
    staleTime: 30000,
  });
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
  const ratingData = useQuery({
    queryKey: ["muscleRatingData"],
    staleTime: 30000,
    queryFn: async () => {
      const [sets, exercises, sessions, records] = await Promise.all([
        base44.entities.ExerciseSet.list("-timestamp", 2000),
        listExercises(),
        base44.entities.WorkoutSession.list("-date", 100),
        base44.entities.PersonalRecord.list("-date", 10),
      ]);
      return { sets, exercises, sessions, records };
    },
  });

  const p: any = profile.data?.[0] || {};
  const foods: any[] = foodsQuery.data || [];
  const { days = [] } = planQuery.data || {};
  const weights: any[] = weightsQuery.data || [];
  const data = ratingData.data;
  const rating = data ? calculateMuscleRating({ ...data, profile: p, weights }) : emptyRating();
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
    ? "Session done. Recover well."
    : activeSession
      ? "Finish what you started."
      : day && !day.isRest
        ? "Beat last week."
        : days.length
          ? "Recovery day."
          : "";
  const latestWeight = weights.at(-1)
    ? Math.round(
        (weights.at(-1)!.unit === "kg"
          ? weights.at(-1)!.weight * 2.20462
          : weights.at(-1)!.weight) * 10
      ) / 10
    : Math.round(profileWeightLb(p) * 10) / 10 || null;
  const hasTargets = !!p.calorieTarget;

  const refresh = () =>
    Promise.all([
      profile.refetch(),
      foodsQuery.refetch(),
      planQuery.refetch(),
      weightsQuery.refetch(),
      workoutExercises.refetch(),
      sessionsQuery.refetch(),
      ratingData.refetch(),
    ]);
  if (profile.isLoading || planQuery.isLoading || sessionsQuery.isLoading)
    return <ScreenState loading />;
  if (
    profile.error ||
    planQuery.error ||
    sessionsQuery.error ||
    foodsQuery.error ||
    weightsQuery.error ||
    ratingData.error ||
    workoutExercises.error
  ) {
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
        <header className="limit-hero mb-7 rounded-[2rem] px-5 py-6">
          <span className="pointer-events-none absolute -bottom-5 right-1 text-[5.5rem] font-black italic leading-none tracking-[-.08em] text-foreground/[.025]">
            LIMIT
          </span>
          <div className="relative z-10">
            <p className="limit-kicker">{format(new Date(), "EEEE, MMM d")}</p>
            <h1 className="mt-3 break-words text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">
              {greeting()}
              {p.name ? `, ${p.name.split(" ")[0]}` : ""}
            </h1>
            {heroLine && (
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{heroLine}</p>
            )}
          </div>
        </header>
        <HomeWorkout
          day={activeDay || day}
          exercises={
            activeDay
              ? (workoutExercises.data || []).filter((x: any) => x.workoutDayId === activeDay.id)
              : dayExercises
          }
          activeSession={activeSession}
          completedSession={activeDay ? null : completedSession}
        />
        <SectionHeading label="Today" title="Nutrition" to="/nutrition" action="Log food" />
        {hasTargets ? (
          <div className="grid grid-cols-2 gap-3">
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
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Set your nutrition targets in Profile to track macros here.
          </p>
        )}
        <MuscleRatingPreview rating={rating} />
        <SectionHeading label="Latest signal" title="Recent performance" to="/progress" />
        {data?.records?.length ? (
          <section className="limit-surface relative overflow-hidden rounded-3xl p-5">
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
            <p className="limit-kicker">Personal record</p>
            <div className="relative mt-4 flex items-end justify-between gap-3">
              <div>
                <b className="text-lg">{data.records[0].exerciseName}</b>
                <p className="mt-1 text-sm text-muted-foreground">{data.records[0].date}</p>
              </div>
              <b className="text-right tabular-nums">
                {data.records[0].type === "e1rm"
                  ? `${data.records[0].value} lb e1RM`
                  : `${data.records[0].value} lb`}
              </b>
            </div>
          </section>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            Complete a workout to unlock progression insights and personal records.
          </p>
        )}
        <section className="limit-surface mt-7 rounded-3xl p-5">
          <p className="limit-kicker text-muted-foreground">Body signal</p>
          {latestWeight ? (
            <div className="mt-3 flex items-end justify-between">
              <div>
                <b className="text-3xl tabular-nums">{latestWeight}</b>
                <span className="ml-1 text-sm text-muted-foreground">lb</span>
              </div>
              {p.goalWeight ? (
                <p className="text-sm tabular-nums text-muted-foreground">Goal {p.goalWeight}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Log your first weigh-in from Progress.
            </p>
          )}
        </section>
      </div>
    </PullToRefresh>
  );
}
