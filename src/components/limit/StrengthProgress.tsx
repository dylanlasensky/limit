import React, { useMemo, useState } from "react";
import { ArrowUpRight, Dumbbell, History, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  strengthDisplayValue,
  type StrengthExercise,
  type StrengthMetric,
  type StrengthUnit,
} from "@/lib/training/strengthHistory";
import ScreenState from "@/components/limit/ScreenState";

const metrics: Array<{ key: StrengthMetric; label: string; unit: string }> = [
  { key: "heaviest", label: "Heaviest load", unit: "" },
  { key: "estimatedMax", label: "Estimated max", unit: "" },
  { key: "volume", label: "Volume", unit: "·reps" },
  { key: "totalReps", label: "Total reps", unit: "reps" },
];
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function StrengthProgress({
  exercises,
  onOpenSession,
  onStartWorkout,
}: {
  exercises: StrengthExercise[];
  onOpenSession: (sessionId: string) => void;
  onStartWorkout: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState<StrengthUnit>("lb");
  const [chosenMetric, setChosenMetric] = useState<StrengthMetric | null>(null);
  const [visibleSessions, setVisibleSessions] = useState(6);
  const filtered = useMemo(
    () =>
      exercises.filter((exercise) =>
        `${exercise.name} ${exercise.equipment} ${exercise.primaryMuscle}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [exercises, search]
  );
  const selected = filtered.find((exercise) => exercise.key === selectedKey) || filtered[0];
  const bodyweightOnly = selected?.sessions.every((session) => session.heaviest === 0);
  const requestedMetric = chosenMetric || (bodyweightOnly ? "totalReps" : "heaviest");
  const metric =
    selected?.power && requestedMetric === "estimatedMax" ? "heaviest" : requestedMetric;
  const metricInfo = metrics.find((entry) => entry.key === metric)!;
  const suffix = metric === "totalReps" ? "reps" : `${unit}${metricInfo.unit}`;
  const points = useMemo(
    () =>
      (selected?.sessions || []).map((session) => ({
        ...session,
        value:
          session[metric] === null ? null : strengthDisplayValue(session[metric]!, metric, unit),
      })),
    [selected, metric, unit]
  );
  const eligible = points.filter((point) => point.value !== null);
  const latest = points.at(-1);
  const first = points[0];
  const best = eligible.length ? Math.max(...eligible.map((point) => point.value!)) : null;
  const change =
    latest?.value != null && first?.value != null && points.length > 1
      ? latest.value - first.value
      : null;

  if (!exercises.length)
    return (
      <ScreenState
        title="Your strength story starts here"
        description="Finish a workout with logged working sets to see session-by-session trends. Every session counts—not only personal records. Try a wider date range if you’ve trained before."
        action="Go to workouts"
        onAction={onStartWorkout}
      />
    );

  return (
    <div className="space-y-4">
      <section className="limit-surface rounded-3xl p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold">Every session tells a story</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Track your work, not just your personal bests.
            </p>
          </div>
        </div>
        <label className="block text-xs font-medium text-muted-foreground">
          Find a logged exercise
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleSessions(6);
            }}
            placeholder="Exercise, equipment, or muscle"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground"
          />
        </label>
        {filtered.length ? (
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            Strength exercise
            <select
              value={selected?.key || ""}
              onChange={(event) => {
                setSelectedKey(event.target.value);
                setChosenMetric(null);
                setVisibleSessions(6);
              }}
              className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 pr-8 text-sm text-foreground"
            >
              {filtered.map((exercise, index) => (
                <option value={exercise.key} key={exercise.key}>
                  {exercise.name}
                  {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                  {filtered.some(
                    (other) =>
                      other.key !== exercise.key &&
                      other.name === exercise.name &&
                      other.equipment === exercise.equipment
                  )
                    ? ` · variation ${index + 1}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm">
            <p>No logged exercises match this search in the selected date range.</p>
            <button
              onClick={() => setSearch("")}
              className="mt-2 min-h-11 font-semibold text-primary"
            >
              Clear search
            </button>
          </div>
        )}
      </section>
      {selected && (
        <>
          <section className="limit-surface overflow-hidden rounded-3xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="limit-kicker">Session trends</p>
                <h2 className="mt-2 break-words text-xl font-semibold leading-snug tracking-tight">
                  {selected.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.sessions.length}{" "}
                  {selected.sessions.length === 1 ? "session" : "sessions"} in this range
                  {selected.primaryMuscle ? ` · ${selected.primaryMuscle}` : ""}
                </p>
              </div>
              <div
                role="group"
                aria-label="Strength display units"
                className="flex shrink-0 rounded-xl border border-border p-1"
              >
                {(["lb", "kg"] as const).map((value) => (
                  <button
                    key={value}
                    aria-label={
                      value === "lb"
                        ? "Display strength in pounds"
                        : "Display strength in kilograms"
                    }
                    aria-pressed={unit === value}
                    onClick={() => setUnit(value)}
                    className={`min-h-10 min-w-10 rounded-lg text-xs font-semibold ${unit === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div
              role="group"
              aria-label="Strength metric"
              className="no-scrollbar -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {metrics.map((item) => (
                <button
                  key={item.key}
                  aria-pressed={metric === item.key}
                  disabled={item.key === "estimatedMax" && selected.power}
                  onClick={() => setChosenMetric(item.key)}
                  className={`min-h-11 shrink-0 rounded-full border px-3 text-xs font-medium disabled:opacity-40 ${metric === item.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Latest session", latest?.value == null ? "—" : number(latest.value)],
                ["Best in range", best === null ? "—" : number(best)],
                [
                  "Vs first session",
                  change === null ? "—" : `${change > 0 ? "+" : ""}${number(change)}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-2xl bg-secondary/65 p-3">
                  <p className="break-words text-[10px] leading-relaxed text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 break-words text-lg font-semibold leading-tight tabular-nums sm:text-xl">
                    {value}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{suffix}</p>
                </div>
              ))}
            </div>
            {eligible.length >= 2 ? (
              <div
                className="-ml-3 mt-5 h-56"
                role="img"
                aria-label={`${metricInfo.label} across ${points.length} sessions. Latest ${latest?.value == null ? "unavailable" : `${number(latest.value)} ${suffix}`}. Values are also listed below.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid
                      vertical={false}
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(parseISO(date), "MMM d")}
                      minTickGap={30}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      width={52}
                      domain={["auto", "auto"]}
                      tickFormatter={(value) => number(value)}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(value) => format(parseISO(String(value)), "MMM d, yyyy")}
                      formatter={(value: any) => [
                        `${number(Number(value))} ${suffix}`,
                        metricInfo.label,
                      ]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm leading-relaxed text-muted-foreground">
                {eligible.length === 1
                  ? "One session recorded. Your next session adds the next point to this trend."
                  : "No eligible estimates in this range. Estimated max needs a positive logged load and 1–12 reps; choose another metric to see your work."}
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {metric === "estimatedMax"
                ? "Estimated max uses the Epley formula from your best eligible set in each session (1–12 reps). It is an estimate, not a max-lift test or a suggested training load."
                : metric === "volume"
                  ? "Volume is logged load × reps, summed across completed non-warm-up sets. Higher volume is not automatically better; compare similar sessions and technique."
                  : metric === "totalReps"
                    ? "Total reps includes every completed non-warm-up set for this exercise. Useful for bodyweight movements and tracking work at a consistent load."
                    : "Heaviest load is the largest logged weight in each completed session. Your reps and sets below add the context behind each point."}
            </p>
            {selected.power && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Estimated max is not calculated for power movements. Track their logged load, reps,
                and volume instead.
              </p>
            )}
            {bodyweightOnly && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Bodyweight is not added to logged load. Zero-load sets still count toward reps.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Changing lb/kg changes the display only. Saved sets are unchanged.
            </p>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <History className="h-4 w-4 text-primary" aria-hidden /> Session history
              </h2>
              <span className="text-xs text-muted-foreground">Newest first</span>
            </div>
            <div className="space-y-3">
              {[...points]
                .reverse()
                .slice(0, visibleSessions)
                .map((point) => (
                  <button
                    key={point.sessionId}
                    onClick={() => onOpenSession(point.sessionId)}
                    aria-label={`Open ${point.name} on ${format(parseISO(point.date), "MMMM d, yyyy")}`}
                    className="limit-surface w-full rounded-2xl p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(point.date), "MMM d, yyyy")}
                        </p>
                        <h3 className="mt-1 break-words text-sm font-semibold">{point.name}</h3>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    </div>
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
                      <Dumbbell className="h-3.5 w-3.5" aria-hidden />
                      {metricInfo.label}:{" "}
                      {point.value === null ? "Not available" : `${number(point.value)} ${suffix}`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {point.sets.slice(0, 6).map((set) => (
                        <span
                          key={set.id}
                          className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs tabular-nums text-muted-foreground"
                        >
                          {number(strengthDisplayValue(set.weightLb, "heaviest", unit))} {unit} ×{" "}
                          {set.reps}
                          {set.setType !== "working" ? ` · ${set.setType}` : ""}
                        </span>
                      ))}
                      {point.sets.length > 6 && (
                        <span className="py-1.5 text-xs text-muted-foreground">
                          +{point.sets.length - 6} more sets
                        </span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
            {points.length > visibleSessions && (
              <button
                onClick={() => setVisibleSessions((value) => value + 12)}
                className="mt-4 min-h-12 w-full rounded-xl border border-border text-sm font-semibold text-primary"
              >
                Show older sessions ({points.length - visibleSessions} more)
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
