import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import WorkoutPreview from "@/components/workout/WorkoutPreview";
import {
  filterHistory,
  groupHistory,
  sessionDate,
  uniqueHistory,
} from "@/lib/training/workoutHistory";
vi.mock("@/lib/training/planService", () => ({ estimateMinutes: () => 20 }));
afterEach(cleanup);

describe("browsable workout history", () => {
  const sessions = [
    { id: "recent", name: "Upper body", date: "2026-09-10", prCount: 1 },
    { id: "older", name: "Lower body", date: "2026-06-01" },
  ];
  it("deduplicates pages and tolerates invalid legacy dates", () => {
    expect(
      uniqueHistory([[sessions[1]], [sessions[0], sessions[1], { name: "No id" }]]).map(
        (row) => row.id
      )
    ).toEqual(["recent", "older"]);
    expect(sessionDate("2026-02-31")).toBeNull();
    expect(groupHistory([{ id: "bad", date: "bad" }])[0].label).toBe("Date unavailable");
    expect(groupHistory(sessions).map((group) => group.label)).toEqual([
      "September 2026",
      "June 2026",
    ]);
  });
  it("searches loaded names and filters local calendar dates", () => {
    expect(filterHistory(sessions, " BODY ", "all", "2026-09-14")).toHaveLength(2);
    expect(filterHistory(sessions, "", "30", "2026-09-14")).toEqual([sessions[0]]);
  });
  it("keeps existing rows while older pages fail and explains partial search", () => {
    const retry = vi.fn(),
      more = vi.fn();
    render(
      <MemoryRouter>
        <WorkoutHistory
          sessions={sessions}
          today="2026-09-14"
          loading={false}
          error
          hasMore
          loadingMore={false}
          onRetry={retry}
          onLoadMore={more}
        />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId("history-workout")).toHaveLength(2);
    fireEvent.change(screen.getByRole("textbox", { name: "Search workout history" }), {
      target: { value: "Missing" },
    });
    expect(screen.getByText("No matching workouts loaded yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load older workouts" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry history" }));
    expect(more).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Clear history filters" }));
    expect(screen.getAllByTestId("history-workout")).toHaveLength(2);
  });
  it("does not show the first-workout empty message while loading", () => {
    render(
      <MemoryRouter>
        <WorkoutHistory
          sessions={[]}
          today="2026-09-14"
          loading
          error={false}
          hasMore={false}
          loadingMore={false}
          onRetry={() => {}}
          onLoadMore={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("Your training history starts here.")).not.toBeInTheDocument();
  });
});

describe("read-only workout preview", () => {
  const day = { id: "day", name: "Upper body", isRest: false };
  const rows = [
    {
      id: "row",
      workoutDayId: "day",
      exerciseId: "bench",
      exerciseName: "Bench Press",
      sets: 3,
      reps: "8–12",
      restSeconds: 90,
    },
  ];
  it("shows prescriptions without starting until explicitly requested", () => {
    const start = vi.fn();
    render(
      <WorkoutPreview
        day={day}
        rows={rows}
        exercises={[{ id: "bench", equipment: "Barbell" }]}
        onClose={() => {}}
        onStart={start}
      />
    );
    expect(screen.getByText("3 sets × 8–12 reps")).toBeInTheDocument();
    expect(screen.getByText(/Barbell · 90s rest/)).toBeInTheDocument();
    expect(start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start this workout" }));
    expect(start).toHaveBeenCalledWith("day");
  });
  it("offers resume instead of starting over another active session", () => {
    const start = vi.fn();
    render(
      <WorkoutPreview
        day={day}
        rows={rows}
        exercises={[]}
        activeSession={{ workoutDayId: "other" }}
        onClose={() => {}}
        onStart={start}
      />
    );
    expect(screen.queryByRole("button", { name: "Start this workout" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume active workout" }));
    expect(start).toHaveBeenCalledWith("other");
  });
  it("does not start a rest day or a day without exercises", () => {
    const start = vi.fn();
    const view = render(
      <WorkoutPreview
        day={{ ...day, isRest: true }}
        rows={[]}
        exercises={[]}
        onClose={() => {}}
        onStart={start}
      />
    );
    expect(screen.queryByRole("button", { name: "Start this workout" })).not.toBeInTheDocument();
    view.rerender(
      <WorkoutPreview day={day} rows={[]} exercises={[]} onClose={() => {}} onStart={start} />
    );
    expect(screen.getByRole("button", { name: "Start this workout" })).toBeDisabled();
    expect(start).not.toHaveBeenCalled();
  });
});
