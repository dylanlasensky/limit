import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Utensils, CalendarDays, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { sumMacros } from "@/components/limit/data";
import useLocalDate from "@/hooks/use-local-date";
import { listFoodEntries } from "@/lib/food-entry";
import { isDiaryDate, shiftDiaryDate } from "@/lib/food-diary";
import MacroCard from "@/components/limit/MacroCard";
import MealPlanner from "@/components/limit/MealPlanner";
import AddFoodFlow from "@/components/limit/AddFoodFlow";
import FoodEntryEditor from "@/components/limit/FoodEntryEditor";
import SegmentedTabs from "@/components/limit/SegmentedTabs";
import ScreenState from "@/components/limit/ScreenState";
import PullToRefresh from "@/components/limit/PullToRefresh";
import useModalHistory from "@/hooks/use-modal-history";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
export default function Nutrition() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState("Breakfast");
  const today = useLocalDate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const date = selectedDate && selectedDate <= today ? selectedDate : today;
  const [addDate, setAddDate] = useState(today);
  const [addSaving, setAddSaving] = useState(false);
  const addingInFlight = useRef(false);
  const [editing, setEditing] = useState<any>(null);
  const editingInFlight = useRef(false);
  const editorGeneration = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      editorGeneration.current += 1;
    };
  }, []);
  const dismissEdit = useCallback(() => {
    if (editingInFlight.current) return;
    editorGeneration.current += 1;
    setEditing(null);
  }, []);
  const closeEdit = useModalHistory(!!editing, dismissEdit);
  const [tab, setTab] = useState("Diary"),
    [add, setAdd] = useState(false),
    foodsQuery = useQuery({
      queryKey: ["foodEntries", date],
      queryFn: () => listFoodEntries(date),
      staleTime: 30000,
    }),
    profileQuery = useQuery({
      queryKey: ["userProfile"],
      queryFn: () => base44.entities.UserProfile.list(),
      staleTime: 30000,
    }),
    dietQuery = useQuery({
      queryKey: ["dietaryProfile"],
      queryFn: () => base44.entities.DietaryProfile.list(),
      staleTime: 30000,
    }),
    foods: any[] = foodsQuery.data || [],
    p: any = profileQuery.data?.[0] || {},
    diet: any = dietQuery.data?.[0] || {},
    dismiss = useCallback(() => {
      if (!addingInFlight.current) setAdd(false);
    }, []),
    closeAdd = useModalHistory(add, dismiss),
    m = sumMacros(foods),
    remaining = (p.calorieTarget || 0) - m.calories,
    refresh = () =>
      Promise.all([foodsQuery.refetch(), profileQuery.refetch(), dietQuery.refetch()]);
  const openAdd = (type = mealType) => {
    setMealType(type);
    setAddDate(date);
    setAdd(true);
  };
  const updateDate = (value: string) => {
    if (isDiaryDate(value, today)) setSelectedDate(value === today ? null : value);
  };
  const invalidateFood = (dates: string[]) => {
    for (const changedDate of new Set(dates)) {
      void queryClient.invalidateQueries({ queryKey: ["foodEntries", changedDate] });
    }
    void queryClient.invalidateQueries({ queryKey: ["recentFoods"] });
  };
  if (profileQuery.isLoading || dietQuery.isLoading) return <ScreenState loading />;
  if (profileQuery.error || dietQuery.error)
    return (
      <ScreenState
        title="Couldn’t load today’s nutrition"
        description={
          dietQuery.error
            ? "We couldn’t verify your saved allergies and dietary preferences. Reload before adding food or viewing meal ideas."
            : "Your logged food is safe. Try loading today again."
        }
        onAction={refresh}
      />
    );
  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        <header className="flex items-start justify-between gap-4 px-1 pb-1 pt-3">
          <div className="relative z-10">
            <p className="limit-kicker">Everyday nourishment</p>
            <h1 className="limit-page-title">Nutrition</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Support your training. Enjoy your food.
            </p>
          </div>
          <button
            aria-label="Log food"
            onClick={() => openAdd()}
            className="mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>
        <SegmentedTabs
          options={["Diary", "Meal Ideas", "Meal Plan"]}
          value={tab}
          onChange={setTab}
          label="Nutrition sections"
        />
        {tab === "Diary" && (
          <section
            aria-label="Food diary date"
            className="mb-5 flex items-center gap-2 rounded-2xl border border-border bg-card p-2"
          >
            <button
              aria-label="Previous diary day"
              onClick={() => updateDate(shiftDiaryDate(date, -1))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {date === today
                    ? "Today"
                    : date === shiftDiaryDate(today, -1)
                      ? "Yesterday"
                      : format(parseISO(date), "EEEE")}
                </span>
              </p>
              <input
                aria-label="Choose diary date"
                type="date"
                max={today}
                value={date}
                onChange={(event) => updateDate(event.target.value)}
                className="mt-1 h-8 w-full min-w-0 max-w-40 rounded-lg border-0 bg-transparent text-center text-xs font-medium text-foreground"
              />
              {date !== today && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="mt-0.5 min-h-8 text-[11px] font-semibold text-primary"
                >
                  Back to today
                </button>
              )}
            </div>
            <button
              aria-label="Next diary day"
              disabled={date >= today}
              onClick={() => updateDate(shiftDiaryDate(date, 1))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </section>
        )}
        {tab === "Diary" && foodsQuery.isLoading ? (
          <ScreenState loading />
        ) : tab === "Diary" && foodsQuery.error ? (
          <ScreenState
            title="Couldn’t load this diary day"
            description="Your logged food is safe. Retry this day or choose another date."
            onAction={() => void foodsQuery.refetch()}
          />
        ) : tab === "Diary" ? (
          <>
            {p.calorieTarget ? (
              <section className="limit-surface relative mb-4 overflow-hidden rounded-[2rem] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {date === today ? "Today’s energy" : "Energy logged"}
                    </p>
                    <p className="mt-2 text-4xl font-semibold tracking-[-.04em] tabular-nums">
                      {Math.round(m.calories).toLocaleString()}
                      <span className="ml-2 text-sm font-normal tracking-normal text-muted-foreground">
                        cal
                      </span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 px-3.5 py-3 text-right">
                    <p className="text-xl font-semibold tabular-nums text-primary">
                      {Math.abs(Math.round(remaining)).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {remaining < 0 ? "above target" : "remaining"}
                    </p>
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-label="Daily calorie target"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(
                    100,
                    Math.max(0, Math.round((m.calories / p.calorieTarget) * 100))
                  )}
                  aria-valuetext={`${Math.round(m.calories)} of ${p.calorieTarget} calories`}
                  className="mt-5 h-2 overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (m.calories / p.calorieTarget) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {foods.length} food {foods.length === 1 ? "entry" : "entries"}
                  </span>
                  <span>{p.calorieTarget.toLocaleString()} cal target</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {p.targetExplanation ||
                    "An estimated starting target based on your profile and goal. Manual overrides remain yours."}
                </p>
              </section>
            ) : (
              <ScreenState
                title="Set your nutrition target"
                description={
                  p.targetExplanation ||
                  "Add your body metrics and date of birth in Profile for an adult nutrition estimate. You can log food without a target."
                }
                action="Set nutrition targets"
                onAction={() => navigate("/profile#nutrition")}
              />
            )}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["Protein", m.protein, p.proteinTarget],
                  ["Carbs", m.carbs, p.carbTarget],
                  ["Fat", m.fat, p.fatTarget],
                ] as [string, number, number | undefined][]
              ).map(([label, value, goal]) => (
                <MacroCard key={label} label={label} value={value} goal={goal || 0} />
              ))}
            </div>
            <div className="mb-2 mt-7 flex items-end justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Your food diary</h2>
              <span className="text-xs text-muted-foreground">
                {date === today ? "Today" : format(parseISO(date), "MMM d")}
              </span>
            </div>
            {meals.map((type) => {
              const items = foods.filter((x) => x.mealType === type);
              const totals = sumMacros(items);
              return (
                <section key={type} className="limit-surface mt-3 rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary">
                        <Utensils className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{type}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {items.length
                            ? `${Math.round(totals.calories)} cal · ${Math.round(totals.protein)} g protein`
                            : "Ready when you are"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openAdd(type)}
                      aria-label={`Add ${type}`}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {items.length ? (
                    <div className="mt-2 divide-y divide-border">
                      {items.map((x) => (
                        <button
                          key={x.id}
                          onClick={() => {
                            if (editingInFlight.current) return;
                            setEditing({ ...x, editorGeneration: ++editorGeneration.current });
                          }}
                          disabled={String(x.id).startsWith("pending-")}
                          aria-label={`Edit ${x.foodName}`}
                          className="flex min-h-16 w-full items-center justify-between gap-3 rounded-lg py-3 text-left text-sm transition-colors hover:bg-secondary/50 disabled:opacity-50"
                        >
                          <div className="min-w-0">
                            <p className="break-words font-medium">{x.foodName}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {x.quantity ? `${x.quantity} ${x.unit || "serving(s)"} · ` : ""}
                              {Math.round(x.protein || 0)} g protein
                            </p>
                            {x.estimated && (
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Estimated
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <b className="tabular-nums">{Math.round(x.calories || 0)} cal</b>
                            <Pencil
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Tap + to add a food or reuse something you’ve logged.
                    </p>
                  )}
                </section>
              );
            })}
            <button
              onClick={() => openAdd()}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
            >
              <Plus />
              Add food
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
              Meal ideas are added to today’s diary ({format(parseISO(today), "MMM d")}).{" "}
              {date !== today &&
                "To backfill a previous day, return to the diary and use Add food."}
            </p>
            <MealPlanner mode={tab} profile={p} onLogged={() => invalidateFood([today])} />
          </>
        )}{" "}
        <Drawer
          open={add}
          dismissible={!addSaving}
          onOpenChange={(value) => {
            if (!value && !addSaving) closeAdd();
          }}
        >
          <DrawerContent className="bg-card text-foreground">
            <div className="no-scrollbar mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                onClick={closeAdd}
                disabled={addSaving}
                aria-label="Close add food"
                className="float-right grid h-11 w-11 place-items-center rounded-xl bg-secondary"
              >
                <X />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {addDate === today ? "Today" : format(parseISO(addDate), "EEE, MMM d")}
              </p>
              <DrawerTitle className="mt-1 text-2xl font-black">Add food</DrawerTitle>
              <DrawerDescription className="mb-5 mt-1">
                Log a meal, scan a label, or reuse a recent food.
              </DrawerDescription>
              {add && (
                <AddFoodFlow
                  initialMealType={mealType}
                  entryDate={addDate}
                  onSavingChange={(value) => {
                    addingInFlight.current = value;
                    setAddSaving(value);
                  }}
                  dietaryProfile={diet}
                  onDone={() => {
                    addingInFlight.current = false;
                    setAddSaving(false);
                    closeAdd();
                    invalidateFood([addDate]);
                  }}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
        {editing && (
          <FoodEntryEditor
            key={editing.id}
            entry={editing}
            onClose={closeEdit}
            onSavingChange={(value) => {
              if (mounted.current && editing.editorGeneration === editorGeneration.current)
                editingInFlight.current = value;
            }}
            onSaved={(saved) => {
              if (!mounted.current || editing.editorGeneration !== editorGeneration.current) return;
              editingInFlight.current = false;
              const originalDate = editing.date;
              queryClient.setQueryData(["foodEntries", originalDate], (rows: any[] | undefined) =>
                (rows || []).filter((row) => row.id !== saved.id)
              );
              queryClient.setQueryData(["foodEntries", saved.date], (rows: any[] | undefined) => [
                ...(rows || []).filter((row) => row.id !== saved.id),
                saved,
              ]);
              closeEdit();
              invalidateFood([originalDate, saved.date]);
            }}
            onDeleted={() => {
              if (!mounted.current || editing.editorGeneration !== editorGeneration.current) return;
              editingInFlight.current = false;
              queryClient.setQueryData(["foodEntries", editing.date], (rows: any[] | undefined) =>
                (rows || []).filter((row) => row.id !== editing.id)
              );
              invalidateFood([editing.date]);
              closeEdit();
            }}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
