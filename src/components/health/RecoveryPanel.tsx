import React from "react";
import { format, parseISO, subDays } from "date-fns";
import { BedDouble, HeartPulse, ShieldAlert, Sparkles, Wind } from "lucide-react";
import DailyCheckIn from "@/components/health/DailyCheckIn";
import {
  formatHealthValue,
  preferredDailyMetrics,
  sourceLabel,
  type HealthMetricName,
  type HealthMetricRecord,
} from "@/lib/health/health-data";
import { useHealthPreferences } from "@/lib/health/health-preferences";

const signals: Array<[HealthMetricName, string, React.ElementType]> = [
  ["sleep_duration", "Sleep", BedDouble],
  ["readiness_score", "Readiness", Sparkles],
  ["resting_heart_rate", "Resting HR", HeartPulse],
  ["heart_rate_variability", "HRV", Wind],
];

export default function RecoveryPanel({
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
  const { preferences, isMetricVisible } = useHealthPreferences();
  const current = preferredDailyMetrics(rows, date, preferences.preferredSources);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = format(subDays(parseISO(date), 6 - index), "yyyy-MM-dd");
    return { date: day, metrics: preferredDailyMetrics(rows, day, preferences.preferredSources) };
  });
  const sleepDays = days.filter((day) => day.metrics.sleep_duration);
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <section className="limit-surface rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="limit-kicker text-muted-foreground">Recovery</p>
            <h2 className="mt-1 font-semibold tracking-tight">Signals, with context</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Compare against your own pattern and how you feel—not someone else’s ideal.
            </p>
          </div>
          <BedDouble className="h-5 w-5 shrink-0 text-primary" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {signals
            .filter(([metric]) => isMetricVisible(metric) && current[metric])
            .map(([metric, label, Icon]) => {
              const row = current[metric];
              return (
                <div key={metric} className="rounded-2xl bg-secondary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    <span className="truncate text-[10px] text-muted-foreground">
                      {row ? sourceLabel(row.source) : "No data"}
                    </span>
                  </div>
                  <b className="mt-2 block text-xl tabular-nums">{formatHealthValue(row) || "—"}</b>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              );
            })}
        </div>
        {!signals.some(([metric]) => isMetricVisible(metric) && current[metric]) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Add sleep or a device reading to see it here. Your check-in works on its own, too.
          </p>
        )}
      </section>
      <DailyCheckIn date={date} value={checkIn} onSaved={onCheckInSaved} />
      {isMetricVisible("sleep_duration") && (
        <section className="limit-surface rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold tracking-tight">Seven-night sleep</h2>
            <span className="text-xs text-muted-foreground">Daily total</span>
          </div>
          {sleepDays.length ? (
            <div
              className="mt-5 grid h-36 grid-cols-7 items-end gap-2"
              aria-label="Seven-night sleep chart"
            >
              {days.map((day) => {
                const minutes = day.metrics.sleep_duration?.value;
                const height =
                  minutes != null ? Math.max(4, Math.min(84, (minutes / 600) * 84)) : 4;
                return (
                  <div
                    key={day.date}
                    className="flex h-full min-w-0 flex-col justify-end text-center"
                  >
                    <span className="mb-2 truncate text-[9px] tabular-nums text-muted-foreground">
                      {minutes != null ? `${Math.round((minutes / 60) * 10) / 10}h` : "—"}
                    </span>
                    <div
                      className={`mx-auto w-full max-w-7 rounded-t-lg ${minutes != null ? "bg-primary" : "bg-secondary"}`}
                      style={{ height }}
                      aria-label={`${format(parseISO(day.date), "EEE, MMM d")}: ${minutes != null ? `${Math.round(minutes)} minutes sleep` : "no sleep data"}`}
                    />
                    <span className="mt-2 text-[9px] text-muted-foreground">
                      {format(parseISO(day.date), "EEEEE")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Sleep history appears after a connected source syncs or you add it manually.
            </p>
          )}
        </section>
      )}
      <p className="flex items-start gap-2 rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground lg:col-span-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Wearable measurements and readiness scores are wellness estimates. LIMIT preserves their
        source and does not use them to diagnose a condition.
      </p>
    </div>
  );
}
