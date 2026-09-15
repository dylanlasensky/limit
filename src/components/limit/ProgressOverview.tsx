import React from "react";
import { Dumbbell, CalendarCheck2, Trophy, Layers3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
interface ProgressOverviewProps {
  sessions: any[];
  records: any[];
  sets?: any[];
}
export default function ProgressOverview({ sessions, records, sets = [] }: ProgressOverviewProps) {
  const total = sessions.reduce((sum, session) => sum + (session.totalVolume || 0), 0),
    completedSets = sets.filter((set) => set.completed === true && set.setType !== "warmup").length;
  const items: Array<[LucideIcon, React.ReactNode, string, string]> = [
    [Dumbbell, Math.round(total).toLocaleString(), "Total volume", "lb moved"],
    [CalendarCheck2, sessions.length, "Sessions", "completed"],
    [Trophy, records.length, "Records", "earned"],
    [Layers3, completedSets, "Working sets", "logged"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(([Icon, value, label, suffix]) => (
        <div key={label} className="limit-surface relative overflow-hidden rounded-3xl p-4">
          <div className="flex items-start justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-muted-foreground">{suffix}</span>
          </div>
          <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
