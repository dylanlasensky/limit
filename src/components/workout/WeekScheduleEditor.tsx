import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { limitApi } from "@/api/client";

interface Props {
  plan: any;
  days: any[];
  changes: any[];
  history: any[];
  activeSession: any;
  today: string;
  userId?: string;
}

export default function WeekScheduleEditor({
  plan,
  days,
  changes,
  history,
  activeSession,
  today,
  userId,
}: Props) {
  const client = useQueryClient();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const week = startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 });
  const dates = Array.from({ length: 7 }, (_, i) => format(addDays(week, i), "yyyy-MM-dd"));
  const dayAt = (date: string) => days.find((day) => day.weekday === dates.indexOf(date));
  const occupied = (date: string) =>
    !!activeSession || history.some((session) => session.date === date);
  const locked = plan.structureLocked || plan.coachProvided || plan.athleteMode === "track_only";
  const source = dayAt(fromDate);
  const destination = dayAt(toDate);
  const pending = !!source && !!destination && fromDate !== toDate;
  const mode = destination?.isRest ? "move" : "swap";
  const available = (date: string) =>
    date >= today &&
    !occupied(date) &&
    !changes.some((change) => change.active && [change.fromDate, change.toDate].includes(date));
  const label = (date: string) =>
    `${format(new Date(`${date}T12:00:00`), "EEEE, MMM d")} · ${dayAt(date)?.name || "Rest"}`;
  const refresh = async () =>
    client.invalidateQueries({ queryKey: ["workoutScheduleChanges", userId, plan.id] });
  const save = async (input: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      await limitApi.functions.invoke("workoutCommand", {
        ...input,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await refresh();
      setFromDate("");
      setToDate("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change this week. Retry.");
    } finally {
      setBusy(false);
    }
  };
  if (locked)
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        This coach program’s dates are fixed. Ask your coach before changing a workout day.
      </p>
    );
  return (
    <section
      className="mt-4 rounded-2xl border border-border bg-card p-4"
      aria-label="Adjust this week"
    >
      <h3 className="text-sm font-bold">Adjust this week</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Move a workout to a rest day or swap two days. Next week follows your usual schedule.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          Workout day
          <select
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setToDate("");
            }}
          >
            <option value="">Choose a day</option>
            {dates
              .filter(
                (date) =>
                  available(date) &&
                  !dayAt(date)?.isRest &&
                  !dayAt(date)?.fixedSchedule &&
                  !dayAt(date)?.coachMandated
              )
              .map((date) => (
                <option key={date} value={date}>
                  {label(date)}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          New day
          <select
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3"
            value={toDate}
            disabled={!fromDate}
            onChange={(event) => setToDate(event.target.value)}
          >
            <option value="">Choose a date</option>
            {dates
              .filter(
                (date) =>
                  date !== fromDate &&
                  available(date) &&
                  !dayAt(date)?.fixedSchedule &&
                  !dayAt(date)?.coachMandated
              )
              .map((date) => (
                <option key={date} value={date}>
                  {label(date)}
                </option>
              ))}
          </select>
        </label>
      </div>
      {pending && (
        <div className="mt-3 rounded-xl bg-secondary p-3 text-xs" role="status">
          <b>Preview for this week:</b> {source.name} moves from {label(fromDate).split(" · ")[0]}{" "}
          to {label(toDate).split(" · ")[0]}.{" "}
          {mode === "swap"
            ? `${destination.name} moves to the first date.`
            : "The first date becomes a rest day."}{" "}
          Completed workouts stay in history.
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <button
        className="limit-button mt-3 min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-50"
        disabled={!pending || busy}
        onClick={() =>
          void save({ action: "changeSchedule", planId: plan.id, fromDate, toDate, mode })
        }
      >
        {busy ? "Saving…" : "Confirm for this week"}
      </button>
      {changes
        .filter((change) => change.active && dates.includes(change.fromDate))
        .map((change) => (
          <div
            key={change.id}
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-xs"
          >
            <span>
              {change.mode === "swap" ? "Swapped" : "Moved"}{" "}
              {label(change.fromDate).split(" · ")[0]} {change.mode === "swap" ? "↔" : "→"}{" "}
              {label(change.toDate).split(" · ")[0]}
            </span>
            <button
              className="min-h-11 rounded-xl border border-border px-3 font-bold disabled:opacity-50"
              disabled={busy || !availableUndo(change)}
              onClick={() => void save({ action: "undoScheduleChange", changeId: change.id })}
            >
              Undo
            </button>
          </div>
        ))}
    </section>
  );

  function availableUndo(change: any) {
    return (
      change.fromDate >= today &&
      change.toDate >= today &&
      !occupied(change.fromDate) &&
      !occupied(change.toDate)
    );
  }
}
