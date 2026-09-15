import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SetRow from "@/components/workout/SetRow";
import PlateCalculator from "@/components/workout/PlateCalculator";
import type { WorkoutSetRow } from "@/components/workout/workoutDraft";

afterEach(cleanup);

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: any) => <div>{children}</div>,
  DrawerContent: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: any) => <p>{children}</p>,
}));

const draft: WorkoutSetRow = {
  key: "we:1",
  workoutExerciseId: "we",
  exerciseId: "bench",
  exerciseName: "Bench Press",
  primaryMuscle: "Chest",
  setNumber: 1,
  weight: "",
  reps: "",
  rir: "",
  completed: false,
  pending: false,
  savedId: null,
  revision: "",
};

describe("copy previous set", () => {
  it("copies weight and reps without completing a set or copying subjective effort", () => {
    const edit = vi.fn();
    const toggle = vi.fn();
    render(
      <SetRow
        row={draft}
        previous={{ weight: 135, reps: 8, rir: 2 }}
        onEdit={edit}
        onToggle={toggle}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /copy previous values/i }));
    expect(edit.mock.calls).toEqual([
      ["weight", "135"],
      ["reps", "8"],
    ]);
    expect(toggle).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Complete set" })).toBeInTheDocument();
  });

  it.each([{ completed: true }, { pending: true }, { savedId: "saved" }])(
    "does not replace a completed, queued, or saved set: %j",
    (state) => {
      const edit = vi.fn();
      render(
        <SetRow
          row={{ ...draft, ...state }}
          previous={{ weight: 0, reps: 10 }}
          onEdit={edit}
          onToggle={vi.fn()}
        />
      );
      const copy = screen.getByRole("button", { name: /copy previous values/i });
      expect(copy).toBeDisabled();
      fireEvent.click(copy);
      expect(edit).not.toHaveBeenCalled();
    }
  );

  it("does not copy while saving", () => {
    render(
      <SetRow
        row={draft}
        previous={{ weight: 135, reps: 8 }}
        onEdit={vi.fn()}
        onToggle={vi.fn()}
        saving
      />
    );
    expect(screen.getByRole("button", { name: /copy previous values/i })).toBeDisabled();
  });

  it.each([
    { weight: "", reps: 10 },
    { weight: 100, reps: 0 },
    { weight: 100, reps: 8.5 },
    { weight: Infinity, reps: 10 },
  ])("does not offer invalid previous values: %j", (previous) => {
    render(<SetRow row={draft} previous={previous} onEdit={vi.fn()} onToggle={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /copy previous values/i })).not.toBeInTheDocument();
  });
});

describe("plate calculator interface", () => {
  it("prefills logged pounds and clearly shows a per-side setup", () => {
    const close = vi.fn();
    render(<PlateCalculator initialWeight="225" onClose={close} />);
    expect(screen.getByLabelText("Total loaded weight (lb)")).toHaveValue(225);
    expect(screen.getByRole("list", { name: "Plates on each side" })).toHaveTextContent(
      "45 lb × 2"
    );
    expect(screen.getByText(/does not change your logged weights/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("starts a clearly labeled new calculation when switching units", () => {
    render(<PlateCalculator initialWeight="225" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Kilograms (kg)" }));
    expect(screen.getByLabelText("Total loaded weight (kg)")).toHaveValue(null);
    expect(screen.getByLabelText("Bar weight (kg)")).toHaveValue(20);
    fireEvent.change(screen.getByLabelText("Total loaded weight (kg)"), {
      target: { value: "60" },
    });
    expect(screen.getByRole("list", { name: "Plates on each side" })).toHaveTextContent(
      "20 kg × 1"
    );
  });

  it("updates for unavailable plates and does not mutate the target", () => {
    render(<PlateCalculator initialWeight="50" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "2.5 lb plates" }));
    expect(screen.getByRole("status")).toHaveTextContent("50 lb cannot be made with these plates");
    expect(screen.getByRole("status")).toHaveTextContent("5 lb lighter");
    expect(screen.getByLabelText("Total loaded weight (lb)")).toHaveValue(50);
  });

  it("validates a bar that exceeds the target instead of returning a negative setup", () => {
    render(<PlateCalculator initialWeight="40" onClose={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("cannot be less than the bar weight");
    fireEvent.change(screen.getByLabelText("Bar weight (lb)"), { target: { value: "35" } });
    expect(screen.getByRole("list", { name: "Plates on each side" })).toHaveTextContent(
      "2.5 lb × 1"
    );
  });
});
