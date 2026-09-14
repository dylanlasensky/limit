import React from "react";
import { Dumbbell, CalendarCheck2, Trophy, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
interface ProgressOverviewProps {
  sessions: any[];
  records: any[];
  /** Accepted for API compatibility; not used by the overview. */
  sets?: any[];
}
export default function ProgressOverview({ sessions, records }: ProgressOverviewProps) {
  const total = sessions.reduce((sum, session) => sum + (session.totalVolume || 0), 0),
    months = new Set(sessions.map((session) => session.date?.slice(0, 7))).size;
  const items: Array<[LucideIcon, React.ReactNode, string, string]> = [
    [Dumbbell, Math.round(total).toLocaleString(), "Volume", "lb moved"],
    [CalendarCheck2, sessions.length, "Sessions", "completed"],
    [Trophy, records.length, "Records", "earned"],
    [TrendingUp, months || 0, "Active", "months"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(([Icon, value, label, suffix], index) => (
        <div
          key={label}
          className={`limit-surface relative overflow-hidden rounded-3xl p-4 ${index === 0 ? "col-span-2" : ""}`}
        >
          <div className="flex items-start justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[8px] font-bold uppercase tracking-[.2em] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <p
            className={`${index === 0 ? "text-4xl" : "text-3xl"} mt-5 font-black tabular-nums tracking-tight`}
          >
            {value}
          </p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[.16em] text-muted-foreground">
            {label} · {suffix}
          </p>
        </div>
      ))}
    </div>
  );
}
