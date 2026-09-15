import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MacroCard from "@/components/limit/MacroCard";
import WeeklyActivity from "@/components/limit/WeeklyActivity";
import MealCard from "@/components/limit/MealCard";
import MealDetail from "@/components/limit/MealDetail";
import type { PlannedMeal } from "@/components/limit/data";

afterEach(cleanup);

const meal: PlannedMeal = {
  key: "oats",
  name: "Berry oats",
  mealType: "Breakfast",
  calories: 400,
  protein: 25,
  carbs: 50,
  fat: 11,
  servingSize: "1 bowl",
  servings: 1,
  prepMinutes: 10,
  ingredients: [{ name: "Oats", quantity: "1 serving", category: "Grains" }],
  instructions: ["Prepare the oats."],
  estimatedNutrition: true,
};

describe("dashboard cards", () => {
  it("does not present a missing macro target as a completed goal", () => {
    render(<MacroCard label="Protein" value={30} />);
    expect(screen.getByRole("progressbar", { name: "Protein target" })).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
    expect(screen.getByText("No target set")).toBeInTheDocument();
  });

  it("clamps progress visually while describing the actual nutrition total", () => {
    render(<MacroCard label="Protein" value={120} goal={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "120 of 100 g");
  });

  it("shows recorded weekly activity with accessible dates and no invented workout", () => {
    render(
      <WeeklyActivity
        date="2026-09-16"
        goal={3}
        sessions={[{ id: "one", date: "2026-09-14", status: "completed", durationMinutes: 42 }]}
      />
    );
    expect(screen.getByText("1 / 3 workouts")).toBeInTheDocument();
    expect(screen.getByText("42 min logged")).toBeInTheDocument();
    expect(screen.getByLabelText("Monday, September 14: 1 completed workout")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Wednesday, September 16, today: no completed workouts")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });

  it("labels grocery selection independently of recipe and food logging", () => {
    const select = vi.fn();
    const add = vi.fn();
    render(
      <MealCard
        meal={meal}
        selected={false}
        onSelect={select}
        onAdd={add}
        onOpen={vi.fn()}
        onSwap={vi.fn()}
      />
    );
    const selection = screen.getByRole("button", { name: "Select Berry oats for groceries" });
    expect(selection).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(selection);
    expect(select).toHaveBeenCalledOnce();
    expect(add).not.toHaveBeenCalled();
  });

  it("opens recipe details as a labeled, dismissible dialog", () => {
    const close = vi.fn();
    render(<MealDetail meal={meal} onClose={close} />);
    expect(screen.getByRole("dialog", { name: "Berry oats" })).toBeInTheDocument();
    expect(screen.getByText("Prepare the oats.", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(close).toHaveBeenCalledOnce();
  });
});
