import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BedDouble, Footprints, HeartPulse, Sparkles } from "lucide-react";
import DailyCheckIn from "@/components/health/DailyCheckIn";
import {
  formatHealthValue,
  healthDayInsight,
  preferredDailyMetrics,
  type HealthMetricRecord,
} from "@/lib/health/health-data";
import { useHealthPreferences } from "@/lib/health/health-preferences";

export default function HomeHealthBrief({
  date,
  rows,
  checkIn,
  onCheckInSaved,
}: {
  date: string;
  rows: HealthMetricRecord[];
  checkIn?: Record<string, any> | null;
  onCheckInSaved: (saved: Record<string, any>) => void;
}) {
  const { preferences, isMetricVisible, isLoading, error } = useHealthPreferences();
  const metrics = preferredDailyMetrics(
    rows.filter((row) => isMetricVisible(row.metric)),
    date,
    preferences.preferredSources
  );
  const insight = healthDayInsight(metrics, checkIn);
  const cards = [
    ["steps", "Steps", Footprints],
    ["sleep_duration", "Sleep", BedDouble],
    ["readiness_score", "Ready", Sparkles],
    ["resting_heart_rate", "Resting HR", HeartPulse],
  ] as const;
  const available = cards.filter(([metric]) => metrics[metric]).slice(0, 3);
  if (isLoading)
    return (
      <div
        className="mt-5 h-40 animate-pulse rounded-3xl bg-card"
        aria-label="Loading daily brief"
      />
    );
  if (error)
    return (
      <Link to="/progress" className="mt-5 block rounded-2xl border border-border p-4 text-sm">
        Open Health to reload your daily brief →
      </Link>
    );
  return (
    <section className="mt-5 space-y-3 lg:mt-0" aria-labelledby="daily-brief-title">
      <div className="limit-surface rounded-3xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="limit-kicker">Daily brief</p>
            <h2 id="daily-brief-title" className="mt-2 text-lg font-semibold tracking-tight">
              {insight.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.body}</p>
          </div>
          <Link
            to="/progress?tab=today"
            aria-label="Open Health"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        {!!available.length && (
          <div
            className="mt-4 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${available.length}, minmax(0, 1fr))` }}
          >
            {available.map(([metric, label, Icon]) => (
              <div key={metric} className="min-w-0 rounded-2xl bg-secondary p-3">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                <b className="mt-2 block truncate text-sm tabular-nums">
                  {formatHealthValue(metrics[metric])}
                </b>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <DailyCheckIn date={date} value={checkIn} onSaved={onCheckInSaved} />
    </section>
  );
}
