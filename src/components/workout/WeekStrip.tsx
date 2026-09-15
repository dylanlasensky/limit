import React from "react";
import { todayWeekday } from "@/hooks/use-active-plan";

interface WeekStripProps {
  /** 7 WorkoutDay records (Mon→Sun). */
  days: Array<{ weekday: number; isRest?: boolean; name: string; [key: string]: any }>;
  /** Set of weekday indexes completed this week. */
  completedWeekdays: Set<number>;
  onPreview?: (day: Record<string, any>) => void;
}

export default function WeekStrip({ days, completedWeekdays, onPreview }: WeekStripProps) {
  const today = todayWeekday();
  return (
    <div className="limit-surface flex justify-between rounded-2xl p-3">
      {["M", "T", "W", "T", "F", "S", "S"].map((letter, i) => {
        const day = days.find((d) => d.weekday === i);
        const rest = !day || day.isRest;
        const done = completedWeekdays.has(i);
        const isToday = i === today;
        return (
          <button
            key={i}
            disabled={!day || !onPreview}
            onClick={() => day && onPreview?.(day)}
            aria-label={`Preview ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}: ${day?.name || "No session"}${done ? ", completed" : ""}`}
            aria-current={isToday ? "date" : undefined}
            className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
          >
            <span
              className={`text-[10px] font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}
            >
              {letter}
            </span>
            <div
              className={`grid h-9 w-9 place-items-center rounded-full text-[10px] font-black transition-colors
              ${done ? "bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/.35)]" : isToday ? "border-2 border-primary bg-primary/10 text-primary" : rest ? "border border-border/50 text-muted-foreground/40" : "border border-border bg-secondary/70 text-muted-foreground"}`}
            >
              {done
                ? "✓"
                : rest
                  ? "·"
                  : day!.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
