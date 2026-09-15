import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutComplete, { type WorkoutSummary } from "@/components/workout/WorkoutComplete";

const { confetti } = vi.hoisted(() => ({ confetti: vi.fn() }));
vi.mock("canvas-confetti", () => ({ default: confetti }));

const summary: WorkoutSummary = {
  name: "Strength session",
  durationMinutes: 30,
  workingSets: 3,
  volume: 1200,
  prs: [{ exerciseName: "Bench press", type: "weight", value: 100, weight: 100, reps: 4 }],
};

beforeEach(() => confetti.mockReset());
afterEach(cleanup);

async function settleCelebration() {
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

describe("workout celebration", () => {
  it("celebrates a personal record after loading confetti", async () => {
    render(<WorkoutComplete summary={summary} onDone={() => {}} />);
    await settleCelebration();
    expect(confetti).toHaveBeenCalledOnce();
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({ particleCount: 48 }));
  });

  it("does not celebrate a workout without a personal record", async () => {
    render(<WorkoutComplete summary={{ ...summary, prs: [] }} onDone={() => {}} />);
    await settleCelebration();
    expect(confetti).not.toHaveBeenCalled();
  });

  it("does not launch late confetti after leaving the summary", async () => {
    const view = render(<WorkoutComplete summary={summary} onDone={() => {}} />);
    view.unmount();
    await settleCelebration();
    expect(confetti).not.toHaveBeenCalled();
  });

  it("keeps the completed workout available if celebration fails", async () => {
    confetti.mockRejectedValueOnce(new Error("Celebration unavailable"));
    render(<WorkoutComplete summary={summary} onDone={() => {}} />);
    await settleCelebration();
    expect(screen.getByRole("heading", { name: "Strength session" })).toBeInTheDocument();
  });
});
