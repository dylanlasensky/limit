import React, { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO, subDays } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { listExercises } from "@/lib/training/exerciseLibrary";
import { calculateMuscleRating, emptyRating } from "@/components/limit/muscleRating";
import MuscleRatingPanel from "@/components/limit/MuscleRatingPanel";
import ProgressOverview from "@/components/limit/ProgressOverview";
import SegmentedTabs from "@/components/limit/SegmentedTabs";
import ScreenState from "@/components/limit/ScreenState";
import PullToRefresh from "@/components/limit/PullToRefresh";
import useLocalDate from "@/hooks/use-local-date";
import { buildStrengthHistory, readProgressPages } from "@/lib/training/strengthHistory";
import HealthOverview from "@/components/health/HealthOverview";
import HealthQuickLog from "@/components/health/HealthQuickLog";
import BodyCompositionPanel from "@/components/health/BodyCompositionPanel";
import RecoveryPanel from "@/components/health/RecoveryPanel";
import {
  readDailyCheckIn,
  readHealthMetrics,
  preferredDailyMetrics,
  type HealthMetricRecord,
} from "@/lib/health/health-data";
import { useHealthPreferences } from "@/lib/health/health-preferences";
import { isDiaryDate, shiftDiaryDate } from "@/lib/food-diary";

const StrengthProgress = lazy(() => import("@/components/limit/StrengthProgress"));
const WeightProgress = lazy(() => import("@/components/limit/WeightProgress"));

const ranges: Record<string, number> = { "1": 30, "3": 90, "6": 180, "12": 365, ALL: Infinity };
const tabs: Record<string, string> = {
  overview: "Today",
  today: "Today",
  "muscle-rating": "Training",
  strength: "Training",
  training: "Training",
  weight: "Body",
  body: "Body",
  recovery: "Recovery",
};

export default function Progress() {
  const [params, setParams] = useSearchParams();
  const today = useLocalDate();
  const requestedTab = params.get("tab") || "today";
  const tab = tabs[requestedTab] || "Today";
  const date = isDiaryDate(params.get("date"), today) ? params.get("date")! : today;
  const trainingView = requestedTab === "muscle-rating" ? "balance" : "strength";
  const [range, setRange] = useState("3");
  const navigate = useNavigate();
  const client = useQueryClient();
  const settings = useHealthPreferences();
  const { preferences, isMetricVisible } = settings;
  const updateParams = (changes: Record<string, string>) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) next.set(key, value);
      return next;
    });
  const training = useQuery({
    queryKey: ["progressData"],
    enabled: tab === "Training",
    staleTime: 60000,
    queryFn: async () => {
      const [profiles, sets, exercises, sessions, snapshots, records, weights] = await Promise.all([
        base44.entities.UserProfile.list(),
        readProgressPages((limit, skip) =>
          base44.entities.ExerciseSet.filter({ completed: true }, "-timestamp", limit, skip)
        ),
        listExercises(),
        readProgressPages(
          (limit, skip) =>
            base44.entities.WorkoutSession.filter({ status: "completed" }, "-date", limit, skip),
          { maxRows: 5000 }
        ),
        readProgressPages(
          (limit, skip) => base44.entities.MuscleRatingSnapshot.list("-date", limit, skip),
          { maxRows: 2000 }
        ),
        readProgressPages(
          (limit, skip) => base44.entities.PersonalRecord.list("-date", limit, skip),
          { maxRows: 5000 }
        ),
        readProgressPages((limit, skip) => base44.entities.WeightEntry.list("-date", limit, skip), {
          maxRows: 5000,
        }),
      ]);
      return {
        profile: profiles[0] || {},
        sets: sets.rows,
        exercises,
        sessions: sessions.rows,
        snapshots: snapshots.rows,
        records: records.rows,
        weights: weights.rows,
        truncated: [sets, sessions, snapshots, records, weights].some(
          (history) => history.truncated
        ),
      };
    },
  });
  const body = useQuery({
    queryKey: ["healthBodyHistory"],
    enabled: tab === "Body",
    staleTime: 30000,
    queryFn: async () => {
      const [weights, profiles] = await Promise.all([
        readProgressPages((limit, skip) => base44.entities.WeightEntry.list("-date", limit, skip), {
          maxRows: 5000,
        }),
        base44.entities.UserProfile.list(),
      ]);
      return { weights: weights.rows, truncated: weights.truncated, profile: profiles[0] || {} };
    },
  });
  const healthFrom =
    tab === "Body" ? "1900-01-01" : format(subDays(parseISO(date), 6), "yyyy-MM-dd");
  const health = useQuery({
    queryKey: ["healthData", healthFrom, date],
    enabled: tab !== "Training",
    queryFn: () => readHealthMetrics({ from: healthFrom, through: date }),
    staleTime: 30000,
  });
  const checkIn = useQuery({
    queryKey: ["dailyCheckIn", date],
    enabled: tab === "Today" || tab === "Recovery",
    queryFn: () => readDailyCheckIn(date),
    staleTime: 30000,
  });
  const cutoff =
    ranges[range] === Infinity
      ? "1900-01-01"
      : format(subDays(parseISO(date), ranges[range]), "yyyy-MM-dd");
  const history = useMemo(() => {
    const sessions = (training.data?.sessions || []).filter(
      (row: any) => row.date >= cutoff && row.date <= date
    );
    const ids = new Set(sessions.map((row: any) => row.id));
    const sets = (training.data?.sets || []).filter((row: any) => ids.has(row.workoutSessionId));
    const records = (training.data?.records || []).filter(
      (row: any) => row.date >= cutoff && row.date <= date
    );
    return {
      sessions,
      sets,
      records,
      exercises: buildStrengthHistory({
        sets,
        sessions,
        exercises: training.data?.exercises || [],
        throughDate: date,
      }),
    };
  }, [training.data, cutoff, date]);
  const weights = useMemo(() => {
    const manual: HealthMetricRecord[] = (body.data?.weights || [])
      .filter((row: any) => row.date <= date)
      .map((row: any) => ({
        ...row,
        metric: "weight",
        value: row.unit === "kg" ? Number(row.weight) * 2.2046226218 : Number(row.weight),
        unit: "lb",
        source: "manual",
        aggregation: "daily",
        recordedAt: row.updated_date || row.created_date,
      }));
    const rows = [...(health.data || []).filter((row) => row.metric === "weight"), ...manual];
    return [...new Set(rows.map((row) => row.date))].sort().flatMap((day) => {
      const row = preferredDailyMetrics(rows, day, preferences.preferredSources).weight;
      return row && Number.isFinite(row.value)
        ? [{ ...row, weight: Math.round(row.value * 10) / 10 }]
        : [];
    });
  }, [body.data, health.data, date, preferences.preferredSources]);
  const recent = weights.filter(
    (row) => row.date >= format(subDays(parseISO(date), 6), "yyyy-MM-dd")
  );
  const onCheckInSaved = (saved: Record<string, any>) =>
    client.setQueryData(["dailyCheckIn", date], saved);
  const refresh = async () => {
    const queries =
      tab === "Training"
        ? [training.refetch()]
        : tab === "Body"
          ? [body.refetch(), health.refetch()]
          : [health.refetch(), checkIn.refetch()];
    await Promise.all(queries);
    await client.invalidateQueries({ queryKey: ["healthConnections"] });
  };
  const healthError =
    health.error || ((tab === "Today" || tab === "Recovery") && checkIn.error) || settings.error;
  const healthLoading =
    health.isLoading ||
    ((tab === "Today" || tab === "Recovery") && checkIn.isLoading) ||
    settings.isLoading;
  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        <header className="px-1 pb-1 pt-3">
          <p className="limit-kicker">Your health, in context</p>
          <h1 className="limit-page-title">Health</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A little context for today. More detail when you need it.
          </p>
        </header>
        <SegmentedTabs
          options={["Today", "Training", "Body", "Recovery"]}
          value={tab}
          onChange={(value) => updateParams({ tab: value.toLowerCase() })}
          label="Health sections"
        />
        <div
          className="mb-5 flex items-center justify-between gap-2 md:max-w-md"
          role="group"
          aria-label="Health day navigation"
        >
          <button
            aria-label="Previous health day"
            disabled={date <= "1900-01-01"}
            onClick={() => updateParams({ date: shiftDiaryDate(date, -1) })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <label className="relative min-w-0 text-center text-sm font-semibold">
            <span className="block text-xs text-muted-foreground">
              {date === today ? "Today" : format(parseISO(date), "EEEE")}
            </span>
            <input
              type="date"
              aria-label="Health date"
              value={date}
              max={today}
              min="1900-01-01"
              onChange={(event) => {
                if (isDiaryDate(event.target.value, today))
                  updateParams({ date: event.target.value });
              }}
              className="min-h-8 max-w-full bg-transparent text-center text-foreground"
            />
          </label>
          <button
            disabled={date === today}
            aria-label="Next health day"
            onClick={() => updateParams({ date: shiftDiaryDate(date, 1) })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {date !== today && (
          <button
            onClick={() => updateParams({ date: today })}
            className="mb-4 min-h-11 w-full rounded-xl bg-secondary text-sm font-semibold"
          >
            Back to today
          </button>
        )}
        {(tab === "Training" || tab === "Body") && (
          <div
            className="no-scrollbar mb-5 flex gap-2 overflow-x-auto"
            role="group"
            aria-label="History date range"
          >
            {Object.keys(ranges).map((option) => (
              <button
                key={option}
                onClick={() => setRange(option)}
                aria-pressed={range === option}
                aria-label={
                  option === "ALL"
                    ? "All time"
                    : "Last " + option + (option === "1" ? " month" : " months")
                }
                className={
                  "min-h-11 min-w-12 rounded-full px-3 text-xs font-semibold " +
                  (range === option
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground")
                }
              >
                {option === "ALL" ? "All time" : option + " mo"}
              </button>
            ))}
          </div>
        )}
        {tab !== "Training" && healthLoading && <ScreenState loading />}
        {tab !== "Training" && healthError && (
          <ScreenState
            title="Couldn’t load health data"
            description="Your saved entries are safe. Please try again."
            onAction={() => Promise.all([refresh(), settings.refetch()])}
          />
        )}
        {tab === "Today" && !healthLoading && !healthError && (
          <div className="space-y-4">
            <HealthOverview
              date={date}
              rows={health.data || []}
              checkIn={checkIn.data}
              onCheckInSaved={onCheckInSaved}
            >
              <HealthQuickLog date={date} rows={health.data || []} onSaved={() => void refresh()} />
            </HealthOverview>
          </div>
        )}
        {tab === "Training" &&
          (training.isLoading ? (
            <ScreenState loading />
          ) : training.error ? (
            <ScreenState
              title="Couldn’t load training history"
              description="Your Health views remain available."
              onAction={() => training.refetch()}
            />
          ) : (
            <>
              {training.data?.truncated && (
                <p
                  role="status"
                  className="mb-4 rounded-2xl bg-secondary p-4 text-xs text-muted-foreground"
                >
                  This view includes the most recent saved history. Some older entries are beyond
                  the display limit.
                </p>
              )}
              <div
                className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1"
                role="group"
                aria-label="Training insight"
              >
                {(["strength", "balance"] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() =>
                      updateParams({ tab: view === "balance" ? "muscle-rating" : "strength" })
                    }
                    aria-pressed={trainingView === view}
                    className={
                      "min-h-11 rounded-xl text-sm font-semibold " +
                      (trainingView === view ? "bg-card shadow-sm" : "text-muted-foreground")
                    }
                  >
                    {view === "strength" ? "Strength trends" : "Muscle balance"}
                  </button>
                ))}
              </div>
              {trainingView === "balance" ? (
                <MuscleRatingPanel
                  rating={
                    training.data
                      ? calculateMuscleRating({
                          ...training.data,
                          sessions: history.sessions,
                          sets: history.sets,
                          weights: training.data.weights.filter((row: any) => row.date <= date),
                        })
                      : emptyRating()
                  }
                  snapshots={(training.data?.snapshots || []).filter(
                    (row: any) => row.date >= cutoff && row.date <= date
                  )}
                />
              ) : (
                <Suspense fallback={<ScreenState loading />}>
                  <StrengthProgress
                    exercises={history.exercises}
                    onOpenSession={(id) => navigate("/workout/history/" + encodeURIComponent(id))}
                    onStartWorkout={() => navigate("/workout")}
                  />
                </Suspense>
              )}
              {!!history.sessions.length && (
                <details className="mt-5 rounded-2xl border border-border bg-card p-4">
                  <summary className="min-h-8 cursor-pointer text-sm font-semibold">
                    Training summary
                  </summary>
                  <div className="mt-4">
                    <ProgressOverview
                      sessions={history.sessions}
                      sets={history.sets}
                      records={history.records}
                    />
                  </div>
                </details>
              )}
            </>
          ))}
        {tab === "Body" &&
          !healthLoading &&
          !healthError &&
          (body.isLoading ? (
            <ScreenState loading />
          ) : body.error ? (
            <ScreenState title="Couldn’t load body history" onAction={() => body.refetch()} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
              <div className="min-w-0">
                <BodyCompositionPanel
                  date={date}
                  rows={health.data || []}
                  latestWeight={weights.at(-1) || null}
                  onSaved={() => void refresh()}
                />
              </div>
              <div className="min-w-0">
                {isMetricVisible("weight") && (
                  <Suspense fallback={<ScreenState loading />}>
                    <WeightProgress
                      weights={weights.filter((row) => row.date >= cutoff)}
                      current={weights.at(-1)?.weight || null}
                      average={
                        recent.length
                          ? recent.reduce((sum, row) => sum + row.weight, 0) / recent.length
                          : null
                      }
                      goal={body.data?.profile.goalWeight}
                      showLog={false}
                      onLog={async () => {}}
                    />
                  </Suspense>
                )}
              </div>
              {body.data?.truncated && (
                <p className="text-xs text-muted-foreground">
                  The most recent 5,000 manual weigh-ins are included.
                </p>
              )}
            </div>
          ))}
        {tab === "Recovery" && !healthLoading && !healthError && (
          <div className="space-y-4">
            <RecoveryPanel
              date={date}
              rows={health.data || []}
              checkIn={checkIn.data}
              onCheckInSaved={onCheckInSaved}
            />
            <HealthQuickLog
              date={date}
              rows={health.data || []}
              initialSection="Sleep"
              onSaved={() => void refresh()}
            />
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
