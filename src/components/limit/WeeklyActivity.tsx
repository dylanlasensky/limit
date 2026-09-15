import React from "react";
import { Check, Clock3 } from "lucide-react";
import { weeklyActivity } from "@/lib/training/weeklyActivity";

interface WeeklyActivityProps {
  sessions: Array<Record<string, any>>;
  date: string;
  goal?: number;
}

export default function WeeklyActivity({ sessions, date, goal }: WeeklyActivityProps) {
  const week = weeklyActivity(sessions, date);
  const target = Number.isFinite(goal) && Number(goal) > 0 ? Number(goal) : null;
  return (
    <section className="limit-surface rounded-3xl p-5" aria-label="This week’s activity">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">Your week</h2>
          <p className="mt-1 text-xs text-muted-foreground">{week.dateRange}</p>
        </div>
        <p className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          {week.count}
          {target ? ` / ${target}` : ""} workouts
        </p>
      </div>
      <ol className="mt-5 grid grid-cols-7 gap-1.5">
        {week.days.map((day) => (
          <li
            key={day.date}
            className="min-w-0 text-center"
            aria-label={`${day.fullLabel}${day.isToday ? ", today" : ""}: ${day.count ? `${day.count} completed workout${day.count === 1 ? "" : "s"}` : day.future ? "upcoming" : "no completed workouts"}`}
          >
            <span aria-hidden="true" className="text-[10px] font-medium text-muted-foreground">
              {day.label}
            </span>
            <div
              aria-hidden="true"
              className={`mx-auto mt-2 grid aspect-square max-w-11 place-items-center rounded-2xl text-xs font-semibold tabular-nums ${day.count ? "bg-primary text-primary-foreground" : day.isToday ? "border border-primary bg-primary/5 text-primary" : "bg-secondary/60 text-muted-foreground"}`}
            >
              {day.count ? <Check className="h-4 w-4" strokeWidth={2.5} /> : day.day}
            </div>
            <span
              aria-hidden="true"
              className={`mx-auto mt-1.5 block h-1 w-1 rounded-full ${day.isToday ? "bg-primary" : "bg-transparent"}`}
            />
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <p>
          {week.count
            ? `${week.activeDays} active ${week.activeDays === 1 ? "day" : "days"} this week`
            : "A new week to move at your pace."}
        </p>
        {week.minutes > 0 && (
          <p className="flex items-center gap-1.5 tabular-nums">
            <Clock3 className="h-3.5 w-3.5" /> {week.minutes} min logged
          </p>
        )}
      </div>
    </section>
  );
}
