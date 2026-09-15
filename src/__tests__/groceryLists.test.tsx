import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import { buildWeek, weekStart, type PlannedMeal } from "@/components/limit/data";
import GroceryListPanel from "@/components/limit/GroceryListPanel";
import {
  buildGroceryList,
  groceryItemsFor,
  groceryText,
  loadGroceryList,
  setGroceryChecked,
  type SavedGroceryList,
} from "@/lib/grocery-lists";
const db = vi.hoisted(() => ({
  filter: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock("@/api/base44Client", () => ({ base44: { entities: { GroceryList: db } } }));
vi.mock("@/lib/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
const week = format(weekStart(), "yyyy-MM-dd");
const meals: PlannedMeal[] = [
  {
    ...buildWeek({}, {})[0][0],
    key: "meal",
    servings: 2,
    ingredients: [
      { name: "Rice", category: "Pantry", quantity: "1 recipe portion" },
      { name: "Beans", category: "Pantry", quantity: "1 recipe portion" },
    ],
  },
];
let saved: SavedGroceryList | null;
function initial(): SavedGroceryList {
  return {
    id: "groceries",
    created_by_id: "me",
    weekStart: week,
    updated_date: "2026-01-01T00:00:00Z",
    sourceMealIds: ["meal"],
    items: [
      { name: "Rice", qty: 1, unit: "recipe portion(s)", category: "Pantry", checked: false },
      { name: "Beans", qty: 1, unit: "recipe portion(s)", category: "Pantry", checked: true },
    ],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  saved = initial();
  db.filter.mockImplementation(async () => (saved ? [saved] : []));
  db.get.mockImplementation(async () => saved);
  db.create.mockImplementation(
    async (payload) =>
      (saved = {
        ...payload,
        id: "created",
        created_by_id: "me",
        updated_date: "2026-01-02T00:00:00Z",
      })
  );
  db.updateMany.mockImplementation(async (query, change) => {
    if (!saved || saved.id !== query.id || saved.updated_date !== query.updated_date)
      return { success: true, updated: 0 };
    saved = { ...saved, ...change.$set, updated_date: saved.updated_date + "1" };
    return { success: true, updated: 1 };
  });
});
afterEach(cleanup);

describe("persistent grocery list data", () => {
  it("loads only the latest current-week list for the signed-in account", async () => {
    expect((await loadGroceryList("me", week))?.items[1].checked).toBe(true);
    expect(db.filter).toHaveBeenCalledWith(
      { created_by_id: "me", weekStart: week },
      "-created_date",
      1
    );
    saved = { ...initial(), created_by_id: "someone-else" };
    await expect(loadGroceryList("me", week)).rejects.toThrow("verified");
  });
  it("combines recipe portions without inventing shopping weights", () => {
    const items = groceryItemsFor([...meals, { ...meals[0], key: "other", servings: 3 }]);
    expect(items.find((item) => item.name === "Rice")).toMatchObject({
      qty: 5,
      unit: "recipe portion(s)",
    });
    expect(() => groceryItemsFor([])).toThrow("Select at least one");
  });
  it("preserves checks only when the ingredient quantity is unchanged", () => {
    const old = groceryItemsFor(meals).map((item) => ({ ...item, checked: true }));
    expect(groceryItemsFor(meals, old).every((item) => item.checked)).toBe(true);
    expect(groceryItemsFor([{ ...meals[0], servings: 3 }], old).some((item) => item.checked)).toBe(
      false
    );
  });
  it("rebuilds the existing list instead of making another record", async () => {
    await buildGroceryList("me", week, meals);
    expect(db.create).not.toHaveBeenCalled();
    expect(db.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "groceries",
        created_by_id: "me",
        updated_date: initial().updated_date,
      }),
      { $set: expect.objectContaining({ sourceMealIds: ["meal"], items: expect.any(Array) }) }
    );
  });
  it("reuses a create that succeeded despite a lost response on retry", async () => {
    saved = null;
    db.create.mockImplementationOnce(async (payload) => {
      saved = {
        ...payload,
        id: "created",
        created_by_id: "me",
        updated_date: "2026-01-02T00:00:00Z",
      };
      throw new Error("Response lost");
    });
    await expect(buildGroceryList("me", week, meals)).rejects.toThrow("Response lost");
    expect((await buildGroceryList("me", week, meals)).id).toBe("created");
    expect(db.create).toHaveBeenCalledOnce();
  });
  it("merges a checked change into the latest list, preserving other changes", async () => {
    const previous = initial();
    saved = {
      ...initial(),
      updated_date: "newer",
      items: initial().items.map((item) => ({ ...item, checked: false })),
    };
    const result = await setGroceryChecked(previous, previous.items[0], true);
    expect(result.items[0].checked).toBe(true);
    expect(result.items[1].checked).toBe(false);
    expect(db.updateMany.mock.calls[0][0].updated_date).toBe("newer");
  });
  it("does not overwrite concurrent writes or apply a check to a changed quantity", async () => {
    db.updateMany.mockResolvedValueOnce({ success: true, updated: 0 });
    await expect(setGroceryChecked(initial(), initial().items[0], true)).rejects.toThrow(
      "changed elsewhere"
    );
    saved!.items[0].qty = 9;
    await expect(setGroceryChecked(initial(), initial().items[0], true)).rejects.toThrow(
      "ingredient changed"
    );
    expect(db.updateMany).toHaveBeenCalledOnce();
  });
  it("copies only remaining ingredients with the honest units", () => {
    expect(groceryText(initial().items)).toBe("Rice — 1 recipe portion(s)");
  });
});

describe("grocery list interactions", () => {
  it("restores saved checks and persists a new check across reopening", async () => {
    const first = render(<GroceryListPanel meals={meals} />);
    expect(await screen.findByRole("checkbox", { name: /Beans/ })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Rice/ }));
    await screen.findByText("Shopping progress saved.");
    expect(screen.getByRole("checkbox", { name: /Rice/ })).toBeChecked();
    first.unmount();
    render(<GroceryListPanel meals={meals} />);
    expect(await screen.findByRole("checkbox", { name: /Rice/ })).toBeChecked();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });
  it("keeps the previous list on failure and retries the original checkbox intent", async () => {
    db.updateMany.mockRejectedValueOnce(new Error("Connection interrupted"));
    render(<GroceryListPanel meals={meals} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Rice/ }));
    await screen.findByRole("alert");
    expect(screen.getByRole("checkbox", { name: /Rice/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await screen.findByText("Grocery list saved.");
    expect(screen.getByRole("checkbox", { name: /Rice/ })).toBeChecked();
  });
  it("disables rapid overlapping checkbox writes while saving", async () => {
    let resolve!: (value: unknown) => void;
    db.updateMany.mockImplementationOnce(
      () =>
        new Promise((value) => {
          resolve = value;
        })
    );
    render(<GroceryListPanel meals={meals} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Rice/ }));
    await waitFor(() => expect(db.updateMany).toHaveBeenCalledOnce());
    expect(screen.getByRole("checkbox", { name: /Beans/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Beans/ }));
    expect(db.updateMany).toHaveBeenCalledOnce();
    await act(async () => resolve({ success: false, updated: 0 }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed elsewhere");
  });
  it("offers a retry after load failure and cannot build from an empty selection", async () => {
    db.filter.mockRejectedValueOnce(new Error("Offline"));
    render(<GroceryListPanel meals={[]} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t load");
    fireEvent.click(screen.getByRole("button", { name: "Reload saved list" }));
    expect(await screen.findByRole("checkbox", { name: /Beans/ })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Update list from 0 selected meals" })
    ).toBeDisabled();
  });
});
