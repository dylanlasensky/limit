import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO, subDays } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import { calculateMuscleRating, emptyRating } from "@/components/limit/muscleRating";
import MuscleRatingPanel from "@/components/limit/MuscleRatingPanel";
import ProgressOverview from "@/components/limit/ProgressOverview";
import WeightProgress from "@/components/limit/WeightProgress";
import SegmentedTabs from "@/components/limit/SegmentedTabs";
import ScreenState from "@/components/limit/ScreenState";
import PullToRefresh from "@/components/limit/PullToRefresh";
import { profileWeightLb } from "@/components/limit/nutritionTargets";
import useLocalDate from "@/hooks/use-local-date";
import WeeklyActivity from "@/components/limit/WeeklyActivity";
import NativeSelect from "@/components/limit/NativeSelect";

const ranges: Record<string, number> = { 1: 30, 3: 90, 6: 180, 12: 365, ALL: Infinity };
const tabs: Record<string, string> = {
  overview: "Overview",
  "muscle-rating": "Muscle Rating",
  strength: "Strength",
  weight: "Weight",
};

export default function Progress() {
  const [params, setParams] = useSearchParams();
  const tab = tabs[params.get("tab") || "overview"] || "Overview";
  const setTab = (value: string) =>
    setParams({ tab: Object.keys(tabs).find((key) => tabs[key] === value) || "overview" });
  const [range, setRange] = useState<string>("3");
  const [strengthExercise, setStrengthExercise] = useState("");
  const date = useLocalDate();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["progressData"],
    queryFn: async () => {
      const [weights, profiles, sets, exercises, sessions, snapshots, records] = await Promise.all([
        base44.entities.WeightEntry.list("-date", 500).then((rows) => rows.reverse()),
        base44.entities.UserProfile.list(),
        base44.entities.ExerciseSet.list("-timestamp", 2000),
        listExercises(),
        base44.entities.WorkoutSession.filter({ status: "completed" }, "-date", 500),
        base44.entities.MuscleRatingSnapshot.list("-date", 100),
        base44.entities.PersonalRecord.list("-date", 500),
      ]);
      return { weights, profile: profiles[0] || {}, sets, exercises, sessions, snapshots, records };
    },
  });
  const addWeight = useMutation({
    mutationFn: (weight: number) =>
      base44.entities.WeightEntry.create({ date, weight, unit: "lb" }),
    onSuccess: () => {
      for (const key of ["progressData", "weightEntries", "muscleRatingData"])
        void client.invalidateQueries({ queryKey: [key] });
    },
  });

  if (query.isLoading) return <ScreenState loading />;
  if (query.error)
    return (
      <ScreenState
        title="Couldn’t load progress"
        description="Your history is safe. Try loading it again."
        onAction={() => query.refetch()}
      />
    );

  const data = query.data!;
  const cutoff =
    ranges[range] === Infinity
      ? "0000-00-00"
      : format(subDays(parseISO(date), ranges[range]), "yyyy-MM-dd");
  const sessions = data.sessions.filter((item: any) => item.date >= cutoff);
  const records = data.records.filter((item: any) => item.date >= cutoff);
  const sets = data.sets.filter((item: any) =>
    sessions.some((session: any) => session.id === item.workoutSessionId)
  );
  const weights = data.weights
    .filter((item: any) => item.date >= cutoff)
    .map((item: any) => ({
      ...item,
      weight: item.unit === "kg" ? Math.round(item.weight * 2.20462 * 10) / 10 : item.weight,
      unit: "lb",
    }));
  const rating = calculateMuscleRating({ ...(data as any), profile: data.profile });
  const current =
    weights.at(-1)?.weight || Math.round(profileWeightLb(data.profile) * 10) / 10 || null;
  const cutoffDay = format(subDays(parseISO(date), 6), "yyyy-MM-dd");
  const recentWeights = weights.filter((item) => item.date >= cutoffDay && item.date <= date);
  const average = recentWeights.length
    ? recentWeights.reduce((sum, item) => sum + item.weight, 0) / recentWeights.length
    : 0;
  const exerciseNames = [
    ...new Set(records.map((record: any) => String(record.exerciseName || "Unnamed exercise"))),
  ].sort();
  const selectedExercise = exerciseNames.includes(strengthExercise) ? strengthExercise : "";
  const strengthRecords = selectedExercise
    ? records.filter((record: any) => record.exerciseName === selectedExercise)
    : records;

  return (
    <PullToRefresh onRefresh={() => query.refetch()}>
      <div>
        <header className="px-1 pb-1 pt-3">
          <div className="relative z-10">
            <p className="limit-kicker">Your progress, over time</p>
            <h1 className="limit-page-title">Progress</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              See your consistency, celebrate your progress.
            </p>
          </div>
        </header>
        <div
          className="no-scrollbar mt-5 flex gap-2 overflow-x-auto"
          role="group"
          aria-label="Progress date range"
        >
          {Object.keys(ranges).map((option) => (
            <button
              key={option}
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              aria-label={
                option === "ALL"
                  ? "All time"
                  : `Last ${option} ${option === "1" ? "month" : "months"}`
              }
              className={`min-h-10 min-w-12 rounded-full px-3 text-xs font-bold ${range === option ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {option === "ALL" ? "All time" : `${option} mo`}
            </button>
          ))}
        </div>
        <SegmentedTabs
          options={["Overview", "Muscle Rating", "Strength", "Weight"]}
          value={tab}
          onChange={setTab}
          label="Progress sections"
        />

        {tab === "Overview" && (
          <>
            <div className="mb-4">
              <WeeklyActivity
                sessions={data.sessions}
                date={date}
                goal={data.profile.trainingDays?.length}
              />
            </div>
            {sessions.length ? (
              <ProgressOverview sessions={sessions} records={records} sets={sets} />
            ) : (
              <ScreenState
                title="Your progress starts with one workout"
                description="Complete your first session and LIMIT will begin tracking consistency, volume, strength, and records."
                action="Find your next workout"
                onAction={() => navigate("/workout")}
              />
            )}
            <h2 className="mb-3 mt-7 text-lg font-semibold tracking-tight">Recent records</h2>
            {records.length ? (
              records.slice(0, 5).map((record: any) => (
                <div
                  key={record.id}
                  className="mb-2 flex justify-between rounded-2xl border border-border bg-card p-4 text-sm"
                >
                  <div>
                    <b>{record.exerciseName}</b>
                    <p className="mt-1 text-xs text-muted-foreground">{record.date}</p>
                  </div>
                  <b className="text-primary">
                    {record.type === "e1rm" ? `${record.value} lb e1RM` : `${record.value} lb`}
                  </b>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Your personal bests will appear here as you build your training history.
              </p>
            )}
          </>
        )}
        {tab === "Muscle Rating" && (
          <MuscleRatingPanel rating={rating || emptyRating()} snapshots={data.snapshots} />
        )}
        {tab === "Strength" &&
          (records.length ? (
            <div className="space-y-3">
              <div className="limit-surface rounded-2xl p-4">
                <label className="text-xs font-medium text-muted-foreground">
                  Explore your exercise history
                  <NativeSelect
                    className="mt-2"
                    value={selectedExercise}
                    onChange={setStrengthExercise}
                    label="Strength exercise"
                    options={[
                      { value: "", label: "All exercises" },
                      ...exerciseNames.map((name) => ({ value: name, label: name })),
                    ]}
                  />
                </label>
                <p className="mt-3 text-xs text-muted-foreground">
                  {strengthRecords.length} personal{" "}
                  {strengthRecords.length === 1 ? "best" : "bests"} in this date range. Estimated
                  maximums are calculated from logged sets, not a max-lift test.
                </p>
              </div>
              {strengthRecords.map((record: any) => (
                <div key={record.id} className="rounded-2xl border border-border bg-card p-4">
                  <b>{record.exerciseName}</b>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {record.type === "e1rm" ? "Estimated max" : "Heaviest set"} · {record.value} lb
                    · {record.date}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <ScreenState
              title="No strength trend yet"
              description="Log your working sets to build a picture of how your strength changes over time."
              action="Go to workouts"
              onAction={() => navigate("/workout")}
            />
          ))}
        {tab === "Weight" && (
          <WeightProgress
            weights={weights}
            current={current}
            average={average}
            goal={data.profile.goalWeight}
            saving={addWeight.isPending}
            onLog={(value: number) => addWeight.mutateAsync(value).then(() => undefined)}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
