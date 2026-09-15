import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FoodEntryEditor from "@/components/limit/FoodEntryEditor";
import ManualFood from "@/components/limit/ManualFood";
import ScannedFoodEditor from "@/components/limit/ScannedFoodEditor";
import ScannedMealEditor from "@/components/limit/ScannedMealEditor";
import Nutrition from "@/pages/Nutrition";
import AddFoodFlow from "@/components/limit/AddFoodFlow";

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  filter: vi.fn(),
  list: vi.fn(),
}));
vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      FoodEntry: api,
      UserProfile: {
        list: async () => [
          {
            id: "profile",
            calorieTarget: 2200,
            proteinTarget: 120,
            carbTarget: 250,
            fatTarget: 70,
          },
        ],
      },
      DietaryProfile: { list: async () => [{}] },
    },
  },
}));
vi.mock("@/hooks/use-local-date", () => ({ default: () => "2020-06-02" }));
vi.mock("@/components/limit/MealPlanner", () => ({
  default: ({ onLogged }) => <button onClick={onLogged}>Log planned meal today</button>,
}));
vi.mock("@/components/limit/PullToRefresh", () => ({ default: ({ children }) => <>{children}</> }));
vi.mock("@/components/limit/NativeSelect", () => ({
  default: ({ value, onChange, options, label }) => (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) =>
        typeof option === "string" ? (
          <option key={option}>{option}</option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )
      )}
    </select>
  ),
}));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }) => (open ? <div role="dialog">{children}</div> : null),
  DrawerContent: ({ children }) => <div>{children}</div>,
  DrawerDescription: ({ children }) => <p>{children}</p>,
  DrawerTitle: ({ children }) => <h2>{children}</h2>,
}));
const entry = {
  id: "food-1",
  date: "2020-06-02",
  foodName: "Yogurt",
  mealType: "Breakfast",
  quantity: 1,
  unit: "cup",
  calories: 160,
  protein: 12,
  carbs: 20,
  fat: 4,
  estimated: true,
  entryMethod: "scan_food",
};
let rows: any[];
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
  rows = [{ ...entry }];
  api.filter.mockImplementation(async ({ date }) => rows.filter((row) => row.date === date));
  api.list.mockImplementation(async () => rows);
  api.create.mockImplementation(async (data) => {
    const row = { ...data, id: "new-food" };
    rows.push(row);
    return row;
  });
  api.update.mockImplementation(async (id, data) => {
    const row = { ...data, id };
    rows = rows.map((item) => (item.id === id ? row : item));
    return row;
  });
  api.delete.mockImplementation(async (id) => {
    rows = rows.filter((row) => row.id !== id);
    return { success: true };
  });
});
afterEach(cleanup);
function show(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return client;
}
const editor = (props = {}) => (
  <FoodEntryEditor
    entry={entry}
    onSaved={vi.fn()}
    onDeleted={vi.fn()}
    onClose={vi.fn()}
    {...props}
  />
);

describe("food entry editing", () => {
  it.each([{ response: { status: 500 } }, { status: 503, message: "Unavailable" }])(
    "keeps edits visible after failed saving, then retries the same row (%j)",
    async (failure) => {
      const onSaved = vi.fn();
      api.update.mockRejectedValueOnce(failure);
      show(editor({ onSaved }));
      fireEvent.change(screen.getByLabelText("Food name"), { target: { value: "Greek yogurt" } });
      fireEvent.change(screen.getByLabelText("calories"), { target: { value: "180" } });
      fireEvent.click(screen.getByRole("button", { name: "Save food changes" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Your edits are still here");
      expect(screen.getByLabelText("Food name")).toHaveValue("Greek yogurt");
      expect(screen.getByLabelText("calories")).toHaveValue(180);
      expect(onSaved).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Save food changes" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
      expect(api.update).toHaveBeenLastCalledWith(
        "food-1",
        expect.objectContaining({
          foodName: "Greek yogurt",
          calories: 180,
          estimated: true,
          entryMethod: "scan_food",
        })
      );
      expect(api.create).not.toHaveBeenCalled();
    }
  );
  it("does not turn a cleared calorie field into a zero-calorie correction", async () => {
    show(editor());
    fireEvent.change(screen.getByLabelText("calories"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save food changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter calories");
    expect(api.update).not.toHaveBeenCalled();
  });
  it("guards rapid duplicate saves and disables dismissal while saving", async () => {
    let resolve: (value: any) => void = () => {};
    api.update.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const onSaved = vi.fn();
    show(editor({ onSaved }));
    const button = screen.getByRole("button", { name: "Save food changes" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Close food editor" })).toBeDisabled();
    await act(async () => resolve(entry));
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it("requires explicit deletion confirmation and retains the entry on failure", async () => {
    const onDeleted = vi.fn();
    api.delete.mockRejectedValueOnce(new Error("offline"));
    show(editor({ onDeleted }));
    fireEvent.click(screen.getByRole("button", { name: "Remove from diary" }));
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep entry" }));
    expect(screen.getByLabelText("Food name")).toHaveValue("Yogurt");
    fireEvent.click(screen.getByRole("button", { name: "Remove from diary" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t confirm removal");
    expect(onDeleted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  });
});

describe("selected diary date", () => {
  it("refetches a complete diary when food is added before the initial read finishes", async () => {
    let resolveInitial: (value: any) => void = () => {};
    let resolveCreate: (value: any) => void = () => {};
    api.filter.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolveInitial = done;
        })
    );
    api.create.mockImplementationOnce(async (data) => {
      await new Promise((done) => {
        resolveCreate = done;
      });
      const saved = { ...data, id: "new-food" };
      rows.push(saved);
      return saved;
    });
    const client = show(<Nutrition />);
    fireEvent.click(await screen.findByRole("button", { name: "Log food" }));
    fireEvent.click(screen.getByRole("button", { name: /Manual entry/ }));
    fireEvent.change(screen.getByLabelText("Food name"), { target: { value: "Pasta" } });
    fireEvent.change(screen.getByLabelText("calories"), { target: { value: "350" } });
    fireEvent.click(screen.getByRole("button", { name: "ADD FOOD" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    expect(client.getQueryData(["foodEntries", "2020-06-02"])).toBeUndefined();
    await act(async () => resolveCreate(undefined));
    expect(await screen.findByRole("button", { name: "Edit Pasta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Yogurt" })).toBeInTheDocument();
    await act(async () => resolveInitial([{ ...entry }]));
    expect(screen.getByRole("button", { name: "Edit Pasta" })).toBeInTheDocument();
    expect(client.getQueryData(["foodEntries", "2020-06-02"])).toHaveLength(2);
  });
  it.each(["save", "delete"])(
    "keeps the editor open through hardware Back during a pending %s",
    async (operation) => {
      let finish: (value: any) => void = () => {};
      const deferred = () =>
        new Promise((done) => {
          finish = done;
        });
      if (operation === "save")
        api.update.mockImplementationOnce(async (id, data) => {
          await deferred();
          rows = [{ ...data, id }];
          return rows[0];
        });
      else
        api.delete.mockImplementationOnce(async () => {
          await deferred();
          rows = [];
          return { success: true };
        });
      show(<Nutrition />);
      fireEvent.click(await screen.findByRole("button", { name: "Edit Yogurt" }));
      if (operation === "save") {
        fireEvent.change(screen.getByLabelText("Food name"), { target: { value: "Greek yogurt" } });
        fireEvent.click(screen.getByRole("button", { name: "Save food changes" }));
        await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
      } else {
        fireEvent.click(screen.getByRole("button", { name: "Remove from diary" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
        await waitFor(() => expect(api.delete).toHaveBeenCalledOnce());
      }
      act(() => {
        window.history.replaceState({}, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      expect(screen.getByRole("heading", { name: "Edit food entry" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close food editor" })).toBeDisabled();
      await act(async () => finish(undefined));
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: "Edit food entry" })).not.toBeInTheDocument()
      );
      if (operation === "save")
        expect(
          await screen.findByRole("button", { name: "Edit Greek yogurt" })
        ).toBeInTheDocument();
      else expect(screen.queryByRole("button", { name: "Edit Yogurt" })).not.toBeInTheDocument();
    }
  );
  it("does not let an old save close a new editor after leaving and returning to nutrition", async () => {
    let finish: (value: any) => void = () => {};
    api.update.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done;
        })
    );
    show(<Nutrition />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Yogurt" }));
    fireEvent.click(screen.getByRole("button", { name: "Save food changes" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
    cleanup();
    show(<Nutrition />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Yogurt" }));
    fireEvent.change(screen.getByLabelText("Food name"), {
      target: { value: "New unsaved draft" },
    });
    await act(async () => finish(entry));
    expect(screen.getByRole("heading", { name: "Edit food entry" })).toBeInTheDocument();
    expect(screen.getByLabelText("Food name")).toHaveValue("New unsaved draft");
  });
  it("navigates past days, returns to today and prevents future dates", async () => {
    show(<Nutrition />);
    await screen.findByRole("button", { name: "Edit Yogurt" });
    expect(screen.getByRole("button", { name: "Next diary day" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous diary day" }));
    await waitFor(() =>
      expect(api.filter).toHaveBeenCalledWith({ date: "2020-06-01" }, "created_date", 500, 0)
    );
    expect(screen.getByLabelText("Choose diary date")).toHaveValue("2020-06-01");
    fireEvent.change(screen.getByLabelText("Choose diary date"), {
      target: { value: "2020-06-03" },
    });
    expect(screen.getByLabelText("Choose diary date")).toHaveValue("2020-06-01");
    fireEvent.click(screen.getByRole("button", { name: "Back to today" }));
    await screen.findByRole("button", { name: "Edit Yogurt" });
    expect(screen.getByLabelText("Choose diary date")).toHaveValue("2020-06-02");
  });
  it("moves an edited entry to another date and meal without leaving a duplicate", async () => {
    show(<Nutrition />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Yogurt" }));
    fireEvent.change(screen.getByLabelText("Diary date"), { target: { value: "2020-06-01" } });
    fireEvent.change(screen.getByLabelText("Edit meal"), { target: { value: "Dinner" } });
    fireEvent.click(screen.getByRole("button", { name: "Save food changes" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Edit Yogurt" })).not.toBeInTheDocument()
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "food-1", date: "2020-06-01", mealType: "Dinner" });
    fireEvent.click(screen.getByRole("button", { name: "Previous diary day" }));
    expect(await screen.findByRole("button", { name: "Edit Yogurt" })).toBeInTheDocument();
  });
  it("manual entries and optimistic cache updates use the selected date", async () => {
    const onDone = vi.fn();
    const client = show(
      <ManualFood entryDate="2020-06-01" initialMealType="Dinner" onDone={onDone} />
    );
    client.setQueryData(["foodEntries", "2020-06-01"], []);
    fireEvent.change(screen.getByLabelText("Food name"), { target: { value: "Rice" } });
    fireEvent.change(screen.getByLabelText("calories"), { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: "ADD FOOD" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2020-06-01", mealType: "Dinner" })
    );
    expect(client.getQueryData(["foodEntries", "2020-06-01"])).toEqual([
      expect.objectContaining({ id: "new-food" }),
    ]);
  });
  it("passes a past date and selected meal from the diary into the full add-food flow", async () => {
    show(<Nutrition />);
    await screen.findByRole("button", { name: "Edit Yogurt" });
    fireEvent.click(screen.getByRole("button", { name: "Previous diary day" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add Dinner" }));
    fireEvent.click(screen.getByRole("button", { name: /Manual entry/ }));
    fireEvent.change(screen.getByLabelText("Food name"), { target: { value: "Pasta" } });
    fireEvent.change(screen.getByLabelText("calories"), { target: { value: "350" } });
    fireEvent.click(screen.getByRole("button", { name: "ADD FOOD" }));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ date: "2020-06-01", mealType: "Dinner", foodName: "Pasta" })
      )
    );
    expect(await screen.findByRole("button", { name: "Edit Pasta" })).toBeInTheDocument();
  });
  it("reuses recent foods on the selected date without losing their estimated status", async () => {
    const onDone = vi.fn();
    show(<AddFoodFlow entryDate="2020-06-01" initialMealType="Lunch" onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: /Recent foods/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Yogurt.*160 cal/ }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2020-06-01", mealType: "Lunch", estimated: true })
    );
  });
  it.each(["food", "meal"])(
    "%s scan logs to the selected date and guards duplicate taps",
    async (type) => {
      const onDone = vi.fn();
      show(
        type === "food" ? (
          <ScannedFoodEditor
            entryDate="2020-06-01"
            onDone={onDone}
            result={{ title: "Rice", reliable: true, nutrients: { calories: 200 } }}
          />
        ) : (
          <ScannedMealEditor
            entryDate="2020-06-01"
            onDone={onDone}
            conflicts={[]}
            result={{ items: [{ name: "Rice", amount: 1, unit: "cup", calories: 200 }] }}
          />
        )
      );
      const button = screen.getByRole("button", {
        name: type === "food" ? "ADD FOOD" : "LOG MEAL",
      });
      fireEvent.click(button);
      fireEvent.click(button);
      await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
      expect(api.create).toHaveBeenCalledOnce();
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ date: "2020-06-01", estimated: type === "meal" })
      );
    }
  );
  it("clearly keeps planned-meal quick logging on today even while browsing a past diary", async () => {
    const client = show(<Nutrition />);
    await screen.findByRole("button", { name: "Edit Yogurt" });
    fireEvent.click(screen.getByRole("button", { name: "Previous diary day" }));
    fireEvent.click(screen.getByRole("tab", { name: "Meal Plan" }));
    expect(await screen.findByText(/Meal ideas are added to today’s diary/)).toHaveTextContent(
      "backfill a previous day"
    );
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "Log planned meal today" }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["foodEntries", "2020-06-02"] });
  });
});
