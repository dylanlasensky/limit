import React, { useMemo, useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { exerciseSearch } from "@/lib/training/exerciseLibrary";
import ExerciseDetails from "@/components/workout/ExerciseDetails";
import ScreenState from "@/components/limit/ScreenState";

export default function ExerciseLibrary({
  exercises,
  loading,
  error,
  onRetry,
}: {
  exercises: any[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [focus, setFocus] = useState("");
  const [visible, setVisible] = useState(40);
  const [detail, setDetail] = useState<any>(null);
  const [moreFilters, setMoreFilters] = useState(false);
  const options = (field: string): string[] =>
    [...new Set<string>(exercises.map((x) => x[field]).filter(Boolean))].sort();
  const filtered = useMemo(
    () =>
      exercises.filter(
        (x) =>
          exerciseSearch(x, query) &&
          (!muscle || x.primaryMuscle === muscle || x.secondaryMuscles?.includes(muscle)) &&
          (!equipment || x.equipment === equipment) &&
          (!difficulty || x.difficulty === difficulty) &&
          (!focus || x.trainingFocus === focus)
      ),
    [exercises, query, muscle, equipment, difficulty, focus]
  );
  const change = (setter: (value: string) => void, value: string) => {
    setter(value);
    setVisible(40);
  };
  const reset = () => {
    setQuery("");
    setMuscle("");
    setEquipment("");
    setDifficulty("");
    setFocus("");
    setVisible(40);
  };
  const active = !!(query || muscle || equipment || difficulty || focus);
  if (error)
    return (
      <ScreenState
        title="Couldn’t load the exercise library"
        description="Your workouts are safe. Try loading the library again."
        onAction={onRetry}
      />
    );
  if (loading)
    return (
      <div
        role="status"
        className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground"
      >
        Loading your exercise library…
      </div>
    );

  return (
    <section aria-label="Exercise library">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Find your next movement</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Everyday strength. Muscle building. Athletic power.
          </p>
        </div>
        <span className="shrink-0 rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold tabular-nums text-primary">
          {exercises.length}
        </span>
      </div>
      <div className="relative">
        <Search aria-hidden className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
        <input
          aria-label="Search exercises"
          value={query}
          onChange={(e) => change(setQuery, e.target.value)}
          placeholder="Name, muscle, or equipment"
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-12 text-sm"
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => change(setQuery, "")}
            className="absolute right-1 top-1 grid h-12 w-10 place-items-center text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          ["Muscle", muscle, setMuscle, options("primaryMuscle")],
          ["Equipment", equipment, setEquipment, options("equipment")],
        ].map(([label, value, setter, values]: any) => (
          <label key={label} className="min-w-0 text-xs font-medium text-muted-foreground">
            {label}
            <select
              value={value}
              onChange={(event) => change(setter, event.target.value)}
              className="mt-1.5 h-12 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
            >
              <option value="">
                All {label.toLowerCase() === "muscle" ? "muscles" : "equipment"}
              </option>
              {values.map((value: string) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          aria-expanded={moreFilters}
          aria-controls="exercise-extra-filters"
          onClick={() => setMoreFilters(!moreFilters)}
          className="flex min-h-11 items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {moreFilters ? "Fewer filters" : "More filters"}
          {difficulty || focus ? " · active" : ""}
        </button>
        {active && (
          <button onClick={reset} className="min-h-11 px-2 text-xs font-semibold text-primary">
            Clear filters
          </button>
        )}
      </div>
      {moreFilters && (
        <div id="exercise-extra-filters" className="mb-4 grid grid-cols-2 gap-3">
          {[
            ["Experience", difficulty, setDifficulty, options("difficulty")],
            ["Training focus", focus, setFocus, options("trainingFocus")],
          ].map(([label, value, setter, values]: any) => (
            <label key={label} className="min-w-0 text-xs font-medium text-muted-foreground">
              {label}
              <select
                value={value}
                onChange={(e) => change(setter, e.target.value)}
                className="mt-1.5 h-12 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              >
                <option value="">All</option>
                {values.map((value: string) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <p role="status" aria-live="polite" className="mb-3 text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
        {active ? " found" : " to explore"}
        {muscle ? " · includes supporting muscles" : ""}
      </p>
      {filtered.length ? (
        <div className="space-y-2">
          {filtered.slice(0, visible).map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => setDetail(exercise)}
              className="group flex min-h-20 w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[.04]"
            >
              <span
                aria-hidden
                className={`h-9 w-1 shrink-0 rounded-full ${exercise.category === "Power" ? "bg-accent/60" : "bg-primary/35"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">{exercise.name}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {exercise.primaryMuscle} · {exercise.equipment}
                </span>
                {exercise.category === "Power" && (
                  <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                    Athletic power · coaching recommended
                  </span>
                )}
              </span>
              <ArrowUpRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              />
            </button>
          ))}
          {visible < filtered.length && (
            <button
              onClick={() => setVisible((n) => n + 40)}
              className="mt-3 min-h-12 w-full rounded-xl bg-secondary text-sm font-semibold"
            >
              Show more · {filtered.length - visible} remaining
            </button>
          )}
        </div>
      ) : (
        <ScreenState
          title="No exercises found"
          description="Try a broader search or clear your filters."
          onAction={reset}
          action="Clear filters"
        />
      )}
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Explore technique notes here. Use your program or import a coach’s plan to log sets. Power
        drills need their own programming; they aren’t added to general lifting plans.
      </p>
      <ExerciseDetails
        exercise={detail}
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
      />
    </section>
  );
}
