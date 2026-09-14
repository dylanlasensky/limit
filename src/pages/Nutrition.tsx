import React, { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
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
  if (profileQuery.isLoading || foodsQuery.isLoading) return <ScreenState loading />;
  if (profileQuery.error || foodsQuery.error)
    return (
      <ScreenState
        title="Couldn’t load today’s nutrition"
        description="Your logged food is safe. Try loading today again."
        onAction={refresh}
      />
    );
  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        <header className="limit-hero rounded-[2rem] p-5">
          <div className="relative z-10">
            <p className="limit-kicker">Daily fuel</p>
            <h1 className="mt-2 text-4xl font-black italic tracking-[-.04em]">NUTRITION</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Fuel the work. Recover with intent.
            </p>
          </div>
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
              <section className="limit-surface relative mb-4 overflow-hidden rounded-[2rem] p-6">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
                <p className="limit-kicker text-muted-foreground">
                  {remaining < 0 ? "Calories above target" : "Calories remaining"}
                </p>
                <p className="relative mt-3 text-6xl font-black tracking-[-.06em] tabular-nums">
                  {Math.abs(Math.round(remaining)).toLocaleString()}
                </p>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(m.calories).toLocaleString()} eaten</span>
                  <span>{p.calorieTarget.toLocaleString()} goal</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (m.calories / p.calorieTarget) * 100)}%` }}
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {p.targetExplanation ||
                    "An estimated starting target based on your profile and goal. Manual overrides remain yours."}
                </p>
              </section>
            ) : (
              <ScreenState
                title="Set your nutrition target"
                description="Add your body metrics and goal in Profile to calculate an estimated calorie and macro starting point."
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
            <h2 className="mb-2 mt-7 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Meals
            </h2>
            {meals.map((type) => {
              const items = foods.filter((x) => x.mealType === type);
              return (
                <section key={type} className="limit-surface mt-3 rounded-3xl p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{type === "Snacks" ? "Snacks" : type}</h3>
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
                    <p className="mt-2 text-sm text-muted-foreground">Nothing logged yet.</p>
                  )}
                </section>
              );
            })}
            <button
              onClick={() => setAdd(true)}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
            >
              <Plus />
              ADD FOOD
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
