import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, Search, Trophy, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import ScreenState from "@/components/limit/ScreenState";
import {
  filterHistory,
  groupHistory,
  sessionDate,
  type HistorySession,
} from "@/lib/training/workoutHistory";

export default function WorkoutHistory({
  sessions,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetry,
  today,
}: {
  sessions: HistorySession[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  today: string;
}) {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const rows = filterHistory(sessions, search, range, today),
    groups = groupHistory(rows);
  if (loading) return <ScreenState loading />;
  if (error && !sessions.length)
    return (
      <ScreenState
        title="Couldn’t load your history"
        description="Your completed workouts are safe. Try again."
        onAction={onRetry}
      />
    );
  if (!sessions.length)
    return (
      <section className="limit-surface rounded-3xl p-7 text-center">
        <CalendarDays className="mx-auto mb-4 h-8 w-8 text-primary" aria-hidden />
        <h2 className="text-xl font-semibold">Your training history starts here.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Finish your first workout and it will show up here, with every set and personal best.
        </p>
        <Link
          to="/workout"
          className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
        >
          Explore your schedule
        </Link>
      </section>
    );
  return (
    <section
      aria-label="Workout history"
      className="lg:grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-6"
    >
      <div className="limit-surface rounded-3xl p-5 lg:sticky lg:top-6">
        <p className="limit-kicker">Every session counts</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your training journal</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisit your sessions, from the everyday work to your personal bests.
        </p>
        <div className="relative mt-5">
          <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden />
          <input
            aria-label="Search workout history"
            placeholder="Find a workout by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-12 text-sm"
          />
          {search && (
            <button
              aria-label="Clear history search"
              onClick={() => setSearch("")}
              className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div role="group" aria-label="History date range" className="mt-3 flex flex-wrap gap-2">
          {[
            ["all", "All dates"],
            ["30", "30 days"],
            ["90", "90 days"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              aria-pressed={range === value}
              className={`min-h-11 rounded-full px-4 text-xs font-semibold ${range === value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p role="status" className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {rows.length} {rows.length === 1 ? "workout" : "workouts"} shown · {sessions.length}{" "}
          loaded
          {hasMore
            ? ". Load older workouts to browse or search further."
            : ". You’ve reached the beginning of your history."}
        </p>
      </div>
      <div className="min-w-0 lg:[&>section:first-child]:mt-0">
        {!rows.length && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
            <h3 className="font-semibold">
              No matching workouts {hasMore ? "loaded yet" : "found"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasMore
                ? "Try another name or load older sessions below."
                : "Try another name or a wider date range."}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setRange("all");
              }}
              className="mt-3 min-h-11 px-4 text-sm font-semibold text-primary"
            >
              Clear history filters
            </button>
          </div>
        )}
        {groups.map((group) => (
          <section key={group.label} className="mt-6">
            <h3 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">{group.label}</h3>
            <div className="space-y-3">
              {group.sessions.map((session) => {
                const date = sessionDate(session.date);
                return (
                  <Link
                    key={session.id}
                    data-testid="history-workout"
                    to={`/workout/history/${session.id}`}
                    className="limit-surface flex min-h-24 items-center gap-3 rounded-2xl p-4 transition-colors hover:border-primary/40 active:bg-secondary"
                  >
                    <div
                      className="grid w-12 shrink-0 place-items-center rounded-xl bg-secondary py-2 text-primary"
                      aria-hidden
                    >
                      <span className="text-[10px] font-semibold uppercase">
                        {date ? format(parseISO(date), "EEE") : "—"}
                      </span>
                      <span className="text-xl font-semibold tabular-nums">
                        {date ? format(parseISO(date), "d") : "—"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="break-words font-semibold">{session.name || "Workout"}</h4>
                      <p className="mt-1 flex flex-wrap gap-x-2 text-xs tabular-nums text-muted-foreground">
                        <span>{Math.round(session.durationMinutes || 0)} min</span>
                        <span>·</span>
                        <span>{session.setCount || 0} sets</span>
                        <span>·</span>
                        <span>
                          {Math.round(session.totalVolume || 0).toLocaleString()} lb volume
                        </span>
                      </p>
                      {!!session.prCount && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Trophy aria-hidden className="h-3.5 w-3.5" />
                          {session.prCount} personal {session.prCount === 1 ? "best" : "bests"}
                        </p>
                      )}
                    </div>
                    <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        {error && (
          <div role="alert" className="mt-4 rounded-2xl border border-destructive/30 p-4 text-sm">
            Couldn’t load more history. The sessions above are still available.
            <button onClick={onRetry} className="mt-2 block min-h-11 font-semibold text-primary">
              Retry history
            </button>
          </div>
        )}
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="mt-5 min-h-12 w-full rounded-xl border border-border bg-card font-semibold disabled:opacity-50"
          >
            {loadingMore ? "Loading older workouts…" : "Load older workouts"}
          </button>
        )}
      </div>
    </section>
  );
}
