import React from "react";
interface MacroCardProps {
  label: React.ReactNode;
  value?: number;
  goal?: number;
  unit?: string;
  color?: string;
}
export default function MacroCard({
  label,
  value = 0,
  goal = 0,
  unit = "g",
  color = "bg-primary",
}: MacroCardProps) {
  const hasGoal = Number.isFinite(goal) && goal > 0;
  const pct = hasGoal ? Math.min(100, Math.max(0, Math.round((value / goal) * 100))) : 0;
  return (
    <div className="limit-surface relative min-w-0 overflow-hidden rounded-2xl p-4">
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {Math.round(value)}
            <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>
          </p>
        </div>
      </div>
      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
        {hasGoal
          ? `of ${Math.round(goal).toLocaleString()}${unit ? ` ${unit}` : ""}`
          : "No target set"}
      </p>
      <div
        role="progressbar"
        aria-label={typeof label === "string" ? `${label} target` : "Nutrition target"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={
          hasGoal ? `${Math.round(value)} of ${Math.round(goal)} ${unit}` : "No target set"
        }
        className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
