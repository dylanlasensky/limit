import React, { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { sumMacros } from "@/components/limit/data";
import useLocalDate from "@/hooks/use-local-date";
import MacroCard from "@/components/limit/MacroCard";
import MealPlanner from "@/components/limit/MealPlanner";
import AddFoodFlow from "@/components/limit/AddFoodFlow";
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
  const date = useLocalDate();
  const [tab, setTab] = useState("Today"),
    [add, setAdd] = useState(false),
    foodsQuery = useQuery({
      queryKey: ["foodEntries", date],
      queryFn: () => base44.entities.FoodEntry.filter({ date }),
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
    dismiss = useCallback(() => setAdd(false), []),
    closeAdd = useModalHistory(add, dismiss),
    m = sumMacros(foods),
    remaining = (p.calorieTarget || 0) - m.calories,
    refresh = () =>
      Promise.all([foodsQuery.refetch(), profileQuery.refetch(), dietQuery.refetch()]);
  if (profileQuery.isLoading || foodsQuery.isLoading || dietQuery.isLoading)
    return <ScreenState loading />;
  if (profileQuery.error || foodsQuery.error || dietQuery.error)
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
            onClick={() => setAdd(true)}
            className="mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>
        <SegmentedTabs
          options={["Today", "Meal Ideas", "Meal Plan"]}
          value={tab}
          onChange={setTab}
          label="Nutrition sections"
        />
        {tab === "Today" ? (
          <>
            {p.calorieTarget ? (
              <section className="limit-surface relative mb-4 overflow-hidden rounded-[2rem] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today’s energy</p>
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
              <span className="text-xs text-muted-foreground">Today</span>
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
                      onClick={() => {
                        setMealType(type);
                        setAdd(true);
                      }}
                      aria-label={`Add ${type}`}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {items.length ? (
                    <div className="mt-2 divide-y divide-border">
                      {items.map((x) => (
                        <div
                          key={x.id}
                          className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{x.foodName}</p>
                            {x.estimated && (
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Estimated
                              </p>
                            )}
                          </div>
                          <b className="shrink-0 tabular-nums">{Math.round(x.calories || 0)} cal</b>
                        </div>
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
              onClick={() => setAdd(true)}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
            >
              <Plus />
              Add food
            </button>
          </>
        ) : (
          <MealPlanner mode={tab} profile={p} onLogged={() => foodsQuery.refetch()} />
        )}{" "}
        <Drawer
          open={add}
          onOpenChange={(value) => {
            if (!value) closeAdd();
          }}
        >
          <DrawerContent className="bg-card text-foreground">
            <div className="no-scrollbar mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                onClick={closeAdd}
                aria-label="Close add food"
                className="float-right grid h-11 w-11 place-items-center rounded-xl bg-secondary"
              >
                <X />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Today</p>
              <DrawerTitle className="mt-1 text-2xl font-black">Add food</DrawerTitle>
              <DrawerDescription className="mb-5 mt-1">
                Log a meal, scan a label, or reuse a recent food.
              </DrawerDescription>
              {add && (
                <AddFoodFlow
                  initialMealType={mealType}
                  dietaryProfile={diet}
                  onDone={(optimistic?: boolean) => {
                    closeAdd();
                    if (!optimistic) foodsQuery.refetch();
                    void queryClient.invalidateQueries({ queryKey: ["recentFoods"] });
                  }}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </PullToRefresh>
  );
}
