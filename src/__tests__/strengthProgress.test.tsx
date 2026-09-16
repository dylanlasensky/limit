import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StrengthProgress from "@/components/limit/StrengthProgress";
import { buildStrengthHistory } from "@/lib/training/strengthHistory";
import { exerciseCatalog } from "../../base44/shared/exerciseCatalog.js";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));
afterEach(cleanup);
function fixture(name = "Barbell Bench Press", weight = 100, count = 2) {
  const exercise = { ...exerciseCatalog.find((row) => row.name === name)!, id: "exercise" };
  return buildStrengthHistory({
    exercises: [exercise],
    sessions: Array.from({ length: count }, (_, index) => ({
      id: `session-${index}`,
      status: "completed",
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      name: "Training day",
    })),
    sets: Array.from({ length: count }, (_, index) => ({
      id: `set-${index}`,
      workoutSessionId: `session-${index}`,
      exerciseId: "exercise",
      exerciseName: name,
      completed: true,
      weight,
      reps: 10,
      setNumber: 1,
    })),
  });
}

describe("strength progress interface", () => {
  it("shows a real trend and opens a workout even when no personal records exist", () => {
    const open = vi.fn();
    render(
      <StrengthProgress exercises={fixture()} onOpenSession={open} onStartWorkout={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Strength exercise" })).toHaveTextContent(
      "Barbell Bench Press"
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/Heaviest load across 2 sessions/);
    fireEvent.click(screen.getByRole("button", { name: "Open Training day on September 2, 2026" }));
    expect(open).toHaveBeenCalledWith("session-1");
  });

  it("changes metric and display units without editing saved data", () => {
    const exercises = fixture();
    render(
      <StrengthProgress exercises={exercises} onOpenSession={vi.fn()} onStartWorkout={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Display strength in kilograms" }));
    expect(screen.getByRole("img")).toHaveAccessibleName(/45.4 kg/);
    fireEvent.click(screen.getByRole("button", { name: "Volume" }));
    expect(screen.getByRole("img")).toHaveAccessibleName(/453.6 kg·reps/);
    expect(exercises[0].sessions[0].heaviest).toBe(100);
    expect(screen.getByText(/Saved sets are unchanged/)).toBeInTheDocument();
  });

  it("offers reps for zero-load bodyweight work and does not draw a false max", () => {
    render(
      <StrengthProgress
        exercises={fixture("Push-Up", 0)}
        onOpenSession={vi.fn()}
        onStartWorkout={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Total reps" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Estimated max" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/No eligible estimates/)).toBeInTheDocument();
  });

  it("disables estimated max for power movements", () => {
    render(
      <StrengthProgress
        exercises={fixture("Hang Power Clean")}
        onOpenSession={vi.fn()}
        onStartWorkout={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Estimated max" })).toBeDisabled();
    expect(screen.getByText(/not calculated for power movements/)).toBeInTheDocument();
  });

  it("handles search and empty results without hiding the reset action", () => {
    render(
      <StrengthProgress exercises={fixture()} onOpenSession={vi.fn()} onStartWorkout={vi.fn()} />
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "rowing" } });
    expect(screen.queryByRole("button", { name: "Strength exercise" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: "Strength exercise" })).toBeInTheDocument();
  });

  it("lets users inspect older sessions beyond the initial visible cards", () => {
    render(
      <StrengthProgress
        exercises={fixture("Barbell Bench Press", 100, 9)}
        onOpenSession={vi.fn()}
        onStartWorkout={vi.fn()}
      />
    );
    expect(screen.getAllByRole("button", { name: /^Open Training day/ })).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: /Show older sessions/ }));
    expect(screen.getAllByRole("button", { name: /^Open Training day/ })).toHaveLength(9);
  });

  it("shows a one-session explanation and an actionable empty state", () => {
    const start = vi.fn();
    const view = render(
      <StrengthProgress
        exercises={fixture("Barbell Bench Press", 100, 1)}
        onOpenSession={vi.fn()}
        onStartWorkout={start}
      />
    );
    expect(screen.getByText(/One session recorded/)).toBeInTheDocument();
    view.rerender(
      <StrengthProgress exercises={[]} onOpenSession={vi.fn()} onStartWorkout={start} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Go to workouts" }));
    expect(start).toHaveBeenCalledOnce();
  });
});