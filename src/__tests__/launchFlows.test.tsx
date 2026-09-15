import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Profile from "@/pages/Profile";
import Nutrition from "@/pages/Nutrition";

const mocks = vi.hoisted(() => ({
  profileList: vi.fn(),
  profileUpdate: vi.fn(),
  profileCreate: vi.fn(),
  dietList: vi.fn(),
  dietUpdate: vi.fn(),
  dietCreate: vi.fn(),
  buildPlan: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      UserProfile: {
        list: mocks.profileList,
        update: mocks.profileUpdate,
        create: mocks.profileCreate,
      },
      DietaryProfile: { list: mocks.dietList, update: mocks.dietUpdate, create: mocks.dietCreate },
      FoodEntry: { filter: vi.fn().mockResolvedValue([]) },
    },
  },
}));
vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({ user: { email: "test@example.invalid" }, logout: vi.fn() }),
}));
vi.mock("@/lib/training/planService", () => ({ createPersonalizedPlan: mocks.buildPlan }));
vi.mock("@/components/limit/AccountDeletion", () => ({ default: () => null }));
vi.mock("@/components/limit/AppPreferences", () => ({ default: () => null }));
vi.mock("@/components/health/ConnectedHealthPanel", () => ({ default: () => null }));
vi.mock("@/components/limit/MealPlanner", () => ({ default: () => <div>Meal ideas loaded</div> }));
vi.mock("@/components/limit/AddFoodFlow", () => ({ default: () => <div>Food entry</div> }));

const profile = {
  id: "profile",
  name: "Jordan",
  measurementSystemVersion: "us_v1",
  currentWeight: 180,
  goalWeight: 180,
  heightFeet: 5,
  heightInches: 11,
  birthDate: "1990-01-01",
  availableDays: ["Monday", "Wednesday", "Friday"],
  trainingDays: ["Monday", "Wednesday", "Friday"],
  experienceLevel: "beginner",
  sessionLength: 60,
  fitnessGoal: "gain muscle",
  equipment: ["Full commercial gym"],
};
const diet = { id: "diet", allergies: ["Peanuts"] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profileList.mockResolvedValue([profile]);
  mocks.dietList.mockResolvedValue([diet]);
  mocks.profileUpdate.mockImplementation(async (id, values) => ({ id, ...values }));
  mocks.dietUpdate.mockImplementation(async (id, values) => ({ id, ...values }));
  mocks.profileCreate.mockImplementation(async (values) => ({ id: "created-profile", ...values }));
  mocks.dietCreate.mockImplementation(async (values) => ({ id: "created-diet", ...values }));
  mocks.buildPlan.mockResolvedValue({ id: "new-plan" });
});
afterEach(cleanup);

function show(component: React.ReactNode, path = "/profile") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>
    </QueryClientProvider>
  );
}

async function openSection(title: string) {
  const button = await screen.findByRole("button", { name: `${title} settings` });
  if (button.getAttribute("aria-expanded") !== "true") fireEvent.click(button);
}

describe("profile saving and rebuilding", () => {
  it.each(["", "2015-01-01"])(
    "clears old automatic nutrition targets when adult age becomes unavailable: %s",
    async (birthDate) => {
      mocks.profileList.mockResolvedValueOnce([
        {
          ...profile,
          targetsCustomized: false,
          calorieTarget: 2200,
          proteinTarget: 150,
          carbTarget: 250,
          fatTarget: 65,
        },
      ]);
      show(<Profile />);
      await openSection("About you");
      const birthday = await screen.findByLabelText("Date of birth");
      fireEvent.change(birthday, { target: { value: birthDate } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await screen.findByRole("button", { name: "Saved" });
      expect(mocks.profileUpdate.mock.calls[0][1]).toMatchObject({
        calorieTarget: 0,
        proteinTarget: 0,
        carbTarget: 0,
        fatTarget: 0,
      });
      expect(mocks.profileUpdate.mock.calls[0][1].targetExplanation).toContain(
        "log food without a target"
      );
    }
  );

  it("preserves explicitly customized targets when an under-18 profile is saved", async () => {
    mocks.profileList.mockResolvedValueOnce([
      {
        ...profile,
        birthDate: "2015-01-01",
        targetsCustomized: true,
        calorieTarget: 2200,
        proteinTarget: 150,
        carbTarget: 250,
        fatTarget: 65,
      },
    ]);
    show(<Profile />);
    await openSection("About you");
    await screen.findByLabelText("Date of birth");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan A" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("button", { name: "Saved" });
    expect(mocks.profileUpdate.mock.calls[0][1]).toMatchObject({
      targetsCustomized: true,
      calorieTarget: 2200,
      proteinTarget: 150,
      carbTarget: 250,
      fatTarget: 65,
    });
  });

  it("rejects invalid body data before creating a replacement program", async () => {
    show(<Profile />);
    await openSection("About you");
    const weight = await screen.findByLabelText("Current weight (lb)");
    fireEvent.change(weight, { target: { value: "-10" } });
    await openSection("Training");
    fireEvent.click(screen.getByRole("button", { name: "Rebuild my program" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Weight must be above 0/);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
    expect(mocks.buildPlan).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Rebuild my program" })).toBeEnabled();
  });

  it("saves the selected schedule before rebuilding, not the stale original weekdays", async () => {
    show(<Profile />);
    await openSection("About you");
    await screen.findByLabelText("Current weight (lb)");
    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
    await openSection("Training");
    fireEvent.click(screen.getByRole("button", { name: "Rebuild my program" }));
    await waitFor(() => expect(mocks.buildPlan).toHaveBeenCalledOnce());
    expect(mocks.profileUpdate.mock.calls[0][1].availableDays).toEqual(["Monday", "Friday"]);
    expect(mocks.buildPlan.mock.calls[0][0]).toMatchObject({
      availableDays: ["Monday", "Friday"],
      trainingDays: ["Monday", "Friday"],
      days: 2,
    });
    expect(mocks.profileUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.buildPlan.mock.invocationCallOrder[0]
    );
  });

  it("does not rebuild if saving allergy preferences failed", async () => {
    mocks.dietUpdate.mockRejectedValueOnce(new Error("Save failed"));
    show(<Profile />);
    await openSection("Nutrition");
    fireEvent.click(screen.getByRole("button", { name: "Fish" }));
    await openSection("Training");
    fireEvent.click(screen.getByRole("button", { name: "Rebuild my program" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Food preferences are still unsaved"
    );
    expect(mocks.buildPlan).not.toHaveBeenCalled();
  });

  it("marks new allergy changes unsaved instead of continuing to say Saved", async () => {
    show(<Profile />);
    await openSection("About you");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan A" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("button", { name: "Saved" });
    await openSection("Nutrition");
    fireEvent.click(screen.getByRole("button", { name: "Fish" }));
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("opens a linked section and keeps other settings collapsed while drafts survive switching", async () => {
    show(<Profile />, "/profile#nutrition");
    const nutrition = await screen.findByRole("button", { name: "Nutrition settings" });
    expect(nutrition).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Name")).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    const avoidedFoods = screen.getByLabelText("Other foods to avoid, separated by commas");
    fireEvent.change(avoidedFoods, { target: { value: "Mushrooms, " } });
    expect(avoidedFoods).toHaveValue("Mushrooms, ");
    fireEvent.change(avoidedFoods, { target: { value: "Mushrooms, olives" } });
    await openSection("About you");
    expect(avoidedFoods).not.toBeVisible();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan A" } });
    await openSection("Nutrition");
    expect(avoidedFoods).toHaveValue("Mushrooms, olives");
    expect(screen.queryByText("Your profile changed.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("button", { name: "Saved" });
    expect(mocks.profileUpdate.mock.calls[0][1].name).toBe("Jordan A");
    expect(mocks.dietUpdate.mock.calls[0][1].foodsToAvoid).toEqual(["Mushrooms", "olives"]);
    expect(mocks.buildPlan).not.toHaveBeenCalled();
  });

  it("retains edits and the created profile ID when dietary saving fails, then updates that profile on retry", async () => {
    mocks.profileList.mockResolvedValueOnce([{ ...profile, id: undefined }]);
    mocks.profileCreate.mockResolvedValueOnce({ id: "created-profile" });
    mocks.dietUpdate.mockRejectedValueOnce(new Error("Network unavailable"));
    show(<Profile />);
    await openSection("About you");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan A" } });
    await openSection("Nutrition");
    fireEvent.click(screen.getByRole("button", { name: "Fish" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText(/Food preferences are still unsaved/);
    expect(screen.getByRole("button", { name: "Fish" })).toHaveAttribute("aria-pressed", "true");
    await openSection("About you");
    expect(screen.getByLabelText("Name")).toHaveValue("Jordan A");
    expect(screen.getByLabelText("Height feet")).toHaveValue(5);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("button", { name: "Saved" });
    expect(mocks.profileCreate).toHaveBeenCalledOnce();
    expect(mocks.profileUpdate).toHaveBeenCalledWith(
      "created-profile",
      expect.objectContaining({ name: "Jordan A" })
    );
    expect(mocks.dietUpdate).toHaveBeenLastCalledWith(
      "diet",
      expect.objectContaining({ allergies: ["Peanuts", "Fish"] })
    );
    expect(mocks.buildPlan).not.toHaveBeenCalled();
  });
});

describe("nutrition dietary-preference failures", () => {
  it("never treats a failed allergy lookup as an empty restriction list", async () => {
    mocks.dietList.mockRejectedValueOnce(new Error("Network unavailable"));
    show(<Nutrition />);
    expect(await screen.findByText(/couldn’t verify your saved allergies/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log food" })).not.toBeInTheDocument();
    expect(screen.queryByText("Meal ideas loaded")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Log food" })).toBeInTheDocument();
    expect(mocks.dietList).toHaveBeenCalledTimes(2);
  });
});
