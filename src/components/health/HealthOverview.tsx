import React from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, BedDouble, Footprints, HeartPulse, Sparkles } from "lucide-react";
import DailyCheckIn from "@/components/health/DailyCheckIn";
import ConnectedHealthPanel from "@/components/health/ConnectedHealthPanel";
import {
  formatHealthValue,
  healthMetricDefinitions,
  healthDayInsight,
  preferredDailyMetrics,
  sourceLabel,
  type HealthMetricRecord,
  type HealthMetricName,
} from "@/lib/health/health-data";
import { useHealthPreferences } from "@/lib/health/health-preferences";

export default function HealthOverview({
  date,
  rows,
  checkIn,
  onCheckInSaved,
  showConnection = true,
  children,
}: {
  date: string;
  rows: HealthMetricRecord[];
  checkIn?: Record<string, any> | null;
  onCheckInSaved: (saved: Record<string, any>) => void;
  showConnection?: boolean;
  children?: React.ReactNode;
}) {
  const { preferences, isMetricVisible } = useHealthPreferences();
  const metrics = preferredDailyMetrics(
    rows.filter((row) => isMetricVisible(row.metric)),
    date,
    preferences.preferredSources
  );
  const insight = healthDayInsight(metrics, checkIn);
  const cards = [
    ["steps", "Steps", Footprints],
    ["sleep_duration", "Sleep", BedDouble],
    ["readiness_score", "Readiness", Sparkles],
    ["resting_heart_rate", "Resting heart rate", HeartPulse],
  ] as const;
  const available = cards.filter(([metric]) => metrics[metric]);
  const additional = Object.values(metrics).filter(
    (row) => row && !cards.some(([metric]) => metric === row.metric)
  ) as HealthMetricRecord[];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="min-w-0 space-y-4">
        <section className="limit-hero relative overflow-hidden rounded-[2rem] p-5">
          <div className="absolute right-2 top-2 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="limit-kicker">Your daily brief</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{insight.title}</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {insight.body}
              </p>
            </div>
          </div>
        </section>
        {!!available.length && (
          <section aria-label="Today’s health signals" className="grid grid-cols-2 gap-3">
            {available.map(([metric, label, Icon]) => {
              const row = metrics[metric]!;
              return (
                <div key={metric} className="limit-surface min-w-0 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    <span className="truncate text-[10px] font-medium text-muted-foreground">
                      {sourceLabel(row.source)}
                    </span>
                  </div>
                  <b className="mt-3 block break-words text-2xl tabular-nums">
                    {formatHealthValue(row)}
                  </b>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              );
            })}
          </section>
        )}
        {!!additional.length && (
          <details className="rounded-2xl border border-border bg-card p-4">
            <summary className="min-h-8 cursor-pointer text-sm font-semibold">
              More daily metrics · {additional.length}
            </summary>
            <dl className="mt-3 divide-y divide-border">
              {additional.map((row) => (
                <div
                  key={row.metric}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <dt>
                    {healthMetricDefinitions[row.metric as HealthMetricName].label}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {sourceLabel(row.source)}
                    </span>
                  </dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {formatHealthValue(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        <DailyCheckIn date={date} value={checkIn} onSaved={onCheckInSaved} />
        {children}
        {showConnection && <ConnectedHealthPanel />}
        <section className="grid grid-cols-2 gap-3" aria-label="Health detail shortcuts">
          {[
            ["Body", "/progress?tab=body", "Weight and composition"],
            ["Recovery", "/progress?tab=recovery", "Sleep and daily signals"],
          ].map(([label, to, description]) => (
            <Link
              key={label}
              to={`${to}&date=${date}`}
              className="min-h-24 rounded-2xl border border-border bg-card p-4 text-sm"
            >
              <span className="flex items-center justify-between gap-2 font-semibold">
                {label}
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                {description}
              </span>
            </Link>
          ))}
        </section>
        {!available.length && (
          <p className="flex items-start gap-2 rounded-2xl border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Choose the metrics that help you. Add an entry whenever it’s useful.
          </p>
        )}
      </div>
    </div>
  );
}
