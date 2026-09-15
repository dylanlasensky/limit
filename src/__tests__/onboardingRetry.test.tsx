import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Onboarding from "@/pages/Onboarding";

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  buildPlan: vi.fn(),
  navigate: vi.fn(),
  activePlans: [] as any[],
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      UserProfile: {
        list: vi.fn().mockResolvedValue([{ id: "profile" }]),
        update: mocks.updateProfile,
      },
      DietaryProfile: {
        list: vi.fn().mockResolvedValue([{ id: "diet" }]),
        update: vi.fn().mockResolvedValue({ id: "diet" }),
      },
      WorkoutPlan: { filter: vi.fn(async () => mocks.activePlans) },
    },
  },
}));
vi.mock("@/hooks/use-system-theme", () => ({ default: () => false }));
vi.mock("@/lib/training/planService", () => ({ createPersonalizedPlan: mocks.buildPlan }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: { div: ({ children }: any) => <div>{children}</div> },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.activePlans = [];
  vi.stubGlobal("scrollTo", vi.fn());
  mocks.updateProfile.mockImplementation(async (id, data) => ({ id, ...data }));
  mocks.buildPlan.mockImplementation(async (profile, rec) => {
    const plan = {
      id: `plan-${mocks.buildPlan.mock.calls.length}`,
      name: rec.name,
      daysPerWeek: profile.days,
    };
    mocks.activePlans = [plan];
    return plan;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function next() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

function fillSetup() {
  render(<Onboarding />);
  fireEvent.click(screen.getByRole("button", { name: /Build Muscle/ }));
  next();
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan" } });
  fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: "1990-01-01" } });
  fireEvent.change(screen.getByLabelText("Feet"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Inches"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Weight (lb)"), { target: { value: "170" } });
  next();
  fireEvent.click(screen.getByRole("button", { name: /Beginner/ }));
  next();
  for (const day of ["Monday", "Wednesday", "Friday"])
    fireEvent.click(screen.getByRole("button", { name: day }));
  next();
  next();
  next();
}

describe("onboarding retries", () => {
  it("rebuilds changed weekdays and equipment even when the existing plan has the same name and day count", async () => {
    let completionAttempts = 0;
    mocks.updateProfile.mockImplementation(async (id, data) => {
      if (data.onboardingComplete === true && completionAttempts++ === 0)
        throw new Error("Final setup save failed");
      return { id, ...data };
    });
    fillSetup();
    fireEvent.click(screen.getByRole("button", { name: "START MY LIMIT PLAN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Final setup save failed");
    expect(mocks.activePlans).toHaveLength(1);
    expect(mocks.navigate).not.toHaveBeenCalled();

    // Return through Food and Priorities to Schedule, maintaining three days.
    for (let i = 0; i < 3; i++)
      fireEvent.click(screen.getByRole("button", { name: "Back to previous step" }));
    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
    fireEvent.click(screen.getByRole("button", { name: "Tuesday" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to previous step" }));
    fireEvent.click(screen.getByRole("button", { name: "Full commercial gym" }));
    fireEvent.click(screen.getByRole("button", { name: "Dumbbells" }));
    for (let i = 0; i < 4; i++) next();
    fireEvent.click(screen.getByRole("button", { name: "START MY LIMIT PLAN" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/home", { replace: true }));
    expect(mocks.buildPlan).toHaveBeenCalledTimes(2);
    expect(mocks.buildPlan.mock.calls[1][0]).toMatchObject({
      availableDays: ["Monday", "Tuesday", "Friday"],
      equipment: ["Dumbbells"],
      days: 3,
    });
    expect(mocks.buildPlan.mock.calls[0][1].name).toBe(mocks.buildPlan.mock.calls[1][1].name);
  });

  it("does not mark setup complete or navigate if the safe replacement build fails", async () => {
    const previousPlan = { id: "working-plan", name: "Full Body", daysPerWeek: 3 };
    mocks.activePlans = [previousPlan];
    mocks.buildPlan.mockRejectedValueOnce(new Error("Replacement did not finish saving"));
    fillSetup();
    fireEvent.click(screen.getByRole("button", { name: "START MY LIMIT PLAN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Replacement did not finish saving");
    expect(mocks.activePlans).toEqual([previousPlan]);
    expect(
      mocks.updateProfile.mock.calls.some(([, data]) => data.onboardingComplete === true)
    ).toBe(false);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "START MY LIMIT PLAN" })).toBeEnabled();
  });
});
