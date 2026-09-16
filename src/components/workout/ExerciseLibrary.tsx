import React, { useMemo, useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { exerciseSearch } from "@/lib/training/exerciseLibrary";
import { browseCatalog, muscleFamilies } from "@/lib/training/browseCatalog";
import useExerciseFavorites from "@/hooks/use-exercise-favorites";
import ExerciseDetails from "@/components/workout/ExerciseDetails";
import ScreenState from "@/components/limit/ScreenState";
import NativeSelect from "@/components/limit/NativeSelect";

export default function ExerciseLibrary({
  exercises,
  loading,
  error,
  onRetry,
  userId,
  recentSets = [],
  recentLoading = false,
  recentError = false,
  onRetryRecent,
  referenceMode = false,
}: {
  exercises: any[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  userId: string;
  recentSets?: any[];
  recentLoading?: boolean;
  recentError?: boolean;
  onRetryRecent?: () => void;
  referenceMode?: boolean;
}) {
  const catalog = useMemo(() => browseCatalog(exercises), [exercises]);
  const { favorites, toggle } = useExerciseFavorites(userId);
  const [collection, setCollection] = useState("All");
  const [family, setFamily] = useState("");
  const [sort, setSort] = useState("name");
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [focus, setFocus] = useState("");
  const [visible, setVisible] = useState(40);
  const [detail, setDetail] = useState<any>(null);
  const [moreFilters, setMoreFilters] = useState(false);
  const options = (field: string): string[] =>
    [...new Set<string>(catalog.map((x) => x[field]).filter(Boolean))].sort();
  const lastLogged = useMemo(() => {
    const result = new Map<string, number>();
    for (const set of recentSets) {
      const timestamp = Date.parse(set.timestamp || set.created_date || "");
      if (set.completed && set.exerciseId && Number.isFinite(timestamp))
        result.set(set.exerciseId, Math.max(result.get(set.exerciseId) || 0, timestamp));
    }
    return new Map<string, number>(
      catalog.flatMap((exercise) => {
        const latest = Math.max(0, ...exercise.savedIds.map((id: string) => result.get(id) || 0));
        return latest ? [[exercise.browseKey, latest] as [string, number]] : [];
      })
    );
  }, [recentSets, catalog]);
  const filtered = useMemo(
    () =>
      catalog
        .filter(
          (x) =>
            exerciseSearch(x, query) &&
            (!family || muscleFamilies[family].includes(x.browseMuscle)) &&
            (collection !== "Favorites" || favorites.has(x.browseKey)) &&
            (collection !== "Recent" || lastLogged.has(x.browseKey)) &&
            (!muscle || x.primaryMuscle === muscle || x.secondaryMuscles?.includes(muscle)) &&
            (!equipment || x.equipment === equipment) &&
            (!difficulty || x.difficulty === difficulty) &&
            (!focus || x.trainingFocus === focus)
        )
        .sort(
          (a, b) =>
            (sort === "recent"
              ? (lastLogged.get(b.browseKey) || 0) - (lastLogged.get(a.browseKey) || 0)
              : 0) || a.name.localeCompare(b.name)
        ),
    [
      catalog,
      query,
      muscle,
      equipment,
      difficulty,
      focus,
      family,
      collection,
      favorites,
      sort,
      lastLogged,
    ]
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
    setFamily("");
    setVisible(40);
  };
  const active = !!(query || muscle || equipment || difficulty || focus || family);

  return (
    <section aria-label="Exercise library">
      <div className="mb-4 px-1">
        <p className="mb-2 text-xs font-semibold tabular-nums text-primary">
          {catalog.length} total exercises
        </p>
        <h2 className="text-xl font-bold tracking-tight">Find your next movement</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Strength, bodybuilding and athletic power.
        </p>
      </div>
      {(error || loading) && (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground"
        >
          {error
            ? "Saved exercise data couldn’t load. You can still explore the complete reference library."
            : "Connecting saved exercises. The complete reference library is ready to explore."}
          {error && (
            <button onClick={onRetry} className="mt-2 block min-h-11 font-semibold text-primary">
              Retry saved exercises
            </button>
          )}
        </div>
      )}
      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="min-w-0 lg:sticky lg:top-6">
          {!referenceMode && (
            <div
              aria-label="Exercise collections"
              className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1"
            >
              {["All", "Favorites", "Recent"].map((value) => (
                <button
                  key={value}
                  aria-pressed={collection === value}
                  onClick={() => {
                    change(setCollection, value);
                    if (value === "Recent") setSort("recent");
                  }}
                  className={`min-h-11 rounded-xl text-sm font-semibold ${collection === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {value}
                  {value === "Favorites" ? ` · ${favorites.size}` : ""}
                </button>
              ))}
            </div>
          )}
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
          <div
            aria-label="Muscle groups"
            className="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-wrap"
          >
            {Object.keys(muscleFamilies).map((value) => (
              <button
                key={value}
                aria-pressed={family === value}
                onClick={() => {
                  change(setFamily, family === value ? "" : value);
                  setMuscle("");
                }}
                className={`min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-semibold ${family === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
              >
                {value}
              </button>
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
              {difficulty || focus || muscle || equipment ? " · active" : ""}
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
                ["Muscle", muscle, setMuscle, options("primaryMuscle")],
                ["Equipment", equipment, setEquipment, options("equipment")],
                ["Experience", difficulty, setDifficulty, options("difficulty")],
                ["Training focus", focus, setFocus, options("trainingFocus")],
              ].map(([label, value, setter, values]: any) => (
                <label key={label} className="min-w-0 text-xs font-medium text-muted-foreground">
                  {label}
                  <NativeSelect<string>
                    label={label}
                    aria-label={label}
                    value={value}
                    onChange={(nextValue) => {
                      change(setter, nextValue);
                      if (label === "Muscle") setFamily("");
                    }}
                    options={[
                      { value: "", label: "All" },
                      ...values.map((value: string) => ({ value, label: value })),
                    ]}
                    className="mt-1.5 h-auto min-h-12 min-w-0 gap-2 py-2 text-sm text-foreground"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
              {filtered.length} results · {catalog.length} total
            </p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Sort
              <NativeSelect
                label="Sort"
                aria-label="Sort"
                value={sort}
                onChange={(value) => change(setSort, value)}
                options={[
                  { value: "name", label: "A–Z" },
                  { value: "recent", label: "Recently logged" },
                ]}
                className="h-11 w-auto gap-2 px-2 text-foreground"
              />
            </label>
          </div>
          {muscle && (
            <p className="mb-3 text-xs text-muted-foreground">
              Includes primary and supporting muscles.
            </p>
          )}
          {collection === "Favorites" && (
            <p className="mb-3 text-xs text-muted-foreground">
              Saved for your account on this device.
            </p>
          )}
          {collection === "Recent" && (
            <p className="mb-3 text-xs text-muted-foreground">From your latest 300 logged sets.</p>
          )}
          {collection === "Recent" && (recentLoading || recentError) ? (
            <ScreenState
              loading={recentLoading}
              title="Couldn’t load recent exercises"
              description="Your saved workouts haven’t changed. Retry or browse the full library."
              onAction={onRetryRecent}
            />
          ) : filtered.length ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              {filtered.slice(0, visible).map((exercise) => (
                <div
                  data-testid="exercise-row"
                  key={exercise.browseKey}
                  className="group flex min-h-20 items-center rounded-2xl border border-border/70 bg-card transition-colors hover:border-primary/40 hover:bg-primary/[.04]"
                >
                  <button
                    onClick={() => setDetail(exercise)}
                    className="flex min-h-20 min-w-0 flex-1 items-center gap-3 p-4 text-left"
                  >
                    <span
                      aria-hidden
                      className={`h-9 w-1 shrink-0 rounded-full ${exercise.category === "Power" ? "bg-accent/60" : "bg-primary/35"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">
                        {exercise.name}
                      </span>
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
                  {!referenceMode && (
                    <button
                      aria-label={`${favorites.has(exercise.browseKey) ? "Unfavorite" : "Favorite"} ${exercise.name}`}
                      aria-pressed={favorites.has(exercise.browseKey)}
                      onClick={() => toggle(exercise.browseKey)}
                      className="mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-primary hover:bg-primary/10"
                    >
                      <Star
                        aria-hidden
                        className={`h-4 w-4 ${favorites.has(exercise.browseKey) ? "fill-current" : ""}`}
                      />
                    </button>
                  )}
                </div>
              ))}
              {visible < filtered.length && (
                <div className="md:col-span-2 lg:col-span-1 2xl:col-span-2">
                  <p className="pt-3 text-center text-xs text-muted-foreground">
                    Showing {Math.min(visible, filtered.length)} of {filtered.length} results
                  </p>
                  <button
                    onClick={() => setVisible((n) => n + 40)}
                    className="mt-3 min-h-12 w-full rounded-xl bg-secondary text-sm font-semibold"
                  >
                    Show more · {filtered.length - visible} remaining
                  </button>
                  <button
                    onClick={() => setVisible(filtered.length)}
                    className="min-h-12 w-full text-sm font-semibold text-primary"
                  >
                    Show all {filtered.length} results
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ScreenState
              title={
                collection === "Favorites" && !active
                  ? "Keep your go-to movements here"
                  : collection === "Recent" && !active
                    ? "Your next set starts your history"
                    : "No exercises found"
              }
              description={
                collection === "Favorites" && !active
                  ? "Tap the star beside any exercise to find it faster next time."
                  : collection === "Recent" && !active
                    ? "Exercises appear here after you log completed sets."
                    : "Try a broader search or clear your filters."
              }
              onAction={() => {
                reset();
                setCollection("All");
              }}
              action={active ? "Clear filters" : "Explore all exercises"}
            />
          )}
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Explore technique notes here. Use your program or import a coach’s plan to log sets.
            Power drills need their own programming; they aren’t added to general lifting plans.
          </p>
        </div>
      </div>
      <ExerciseDetails
        exercise={detail}
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        favorite={detail ? favorites.has(detail.browseKey) : false}
        onFavorite={detail && !referenceMode ? () => toggle(detail.browseKey) : undefined}
        referenceMessage={
          referenceMode
            ? "You’re viewing the public reference library. Sign in to select movements in your program and save workout history."
            : undefined
        }
      />
    </section>
  );
}