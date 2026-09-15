import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
interface WeightProgressProps {
  weights: Array<{ date?: string; weight?: number; [key: string]: any }>;
  current?: number | null;
  average?: number | null;
  goal?: number | null;
  onLog: (weight: number) => Promise<void>;
  saving?: boolean;
}
export default function WeightProgress({
  weights,
  current,
  average,
  goal,
  onLog,
  saving,
}: WeightProgressProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    if (saving) return;
    if (!Number.isFinite(+value) || +value <= 0 || +value > 1500) {
      setError("Enter a weight above 0 and up to 1,500 lb.");
      return;
    }
    setError("");
    try {
      await onLog(+value);
      setValue("");
    } catch {
      setError("Couldn’t save your weigh-in. Your entry is still here; please retry.");
    }
  };
  return (
    <>
      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">Current weight</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
          {current || "—"} <span className="text-sm text-muted-foreground">lb</span>
        </p>
        <p className="mt-2 text-sm text-primary">
          7-day average {average ? average.toFixed(1) : "—"}
          {goal ? ` · Goal ${goal} lb` : ""}
        </p>
      </section>
      {weights.length >= 2 ? (
        <section className="mt-4 h-56 rounded-3xl border border-border bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weights}>
              <XAxis dataKey="date" hide />
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} hide />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Log at least two weigh-ins to reveal your trend. Daily fluctuations are normal.
        </section>
      )}
      <div className="mt-4 flex gap-2">
        <input
          aria-label="Today’s weight in pounds"
          min="0.1"
          max="1500"
          disabled={saving}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Today’s weight"
          className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-3"
        />
        <button
          disabled={!value || saving}
          onClick={submit}
          className="rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-40"
        >
          Log
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
