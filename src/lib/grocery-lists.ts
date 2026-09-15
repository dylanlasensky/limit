import { base44 } from "@/api/base44Client";
import type { PlannedMeal } from "@/components/limit/data";

export interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  category: string;
  checked: boolean;
}
export interface SavedGroceryList {
  id: string;
  created_by_id: string;
  updated_date: string;
  weekStart: string;
  sourceMealIds: string[];
  items: GroceryItem[];
}
export const groceryKey = (item: Pick<GroceryItem, "name" | "unit">) =>
  `${item.name.trim().toLowerCase()}|${item.unit.trim().toLowerCase()}`;

function verified(row: any, userId: string, week: string): SavedGroceryList {
  if (
    !userId ||
    !row?.id ||
    row.created_by_id !== userId ||
    row.weekStart !== week ||
    typeof row.updated_date !== "string" ||
    !Array.isArray(row.items) ||
    row.items.some(
      (item: any) =>
        !item ||
        typeof item.name !== "string" ||
        !item.name.trim() ||
        typeof item.unit !== "string" ||
        !Number.isFinite(item.qty) ||
        item.qty <= 0
    )
  )
    throw new Error("This grocery list could not be verified. Reload it before making changes.");
  return {
    ...row,
    sourceMealIds: row.sourceMealIds || [],
    items: row.items.map((item: any) => ({
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      category: typeof item.category === "string" ? item.category : "Other",
      checked: item.checked === true,
    })),
  };
}

export async function loadGroceryList(userId: string, week: string) {
  if (!userId) throw new Error("Sign in to load your grocery list.");
  const rows = await base44.entities.GroceryList.filter(
    { created_by_id: userId, weekStart: week },
    "-created_date",
    1
  );
  return rows[0] ? verified(rows[0], userId, week) : null;
}

export function groceryItemsFor(meals: PlannedMeal[], previous: GroceryItem[] = []): GroceryItem[] {
  if (!meals.length) throw new Error("Select at least one meal for your grocery list.");
  const items = new Map<string, GroceryItem>();
  for (const meal of meals) {
    const portions = Number(meal.servings) || 1;
    if (!Number.isFinite(portions) || portions <= 0)
      throw new Error("Check the selected meal portions.");
    for (const ingredient of meal.ingredients || []) {
      const name = ingredient.name?.trim();
      if (!name) continue;
      const item = {
        name,
        qty: portions,
        unit: "recipe portion(s)",
        category: ingredient.category || "Other",
        checked: false,
      };
      const key = groceryKey(item),
        existing = items.get(key);
      if (existing) existing.qty += portions;
      else items.set(key, item);
    }
  }
  if (!items.size) throw new Error("The selected meals do not have ingredients yet.");
  return [...items.values()]
    .map((item) => ({
      ...item,
      checked: previous.some(
        (old) => groceryKey(old) === groceryKey(item) && old.qty === item.qty && old.checked
      ),
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

async function updateList(
  current: SavedGroceryList,
  payload: Pick<SavedGroceryList, "items" | "sourceMealIds">
) {
  if (
    JSON.stringify(current.items) === JSON.stringify(payload.items) &&
    JSON.stringify(current.sourceMealIds) === JSON.stringify(payload.sourceMealIds)
  )
    return current;
  // A conditional update fails instead of silently replacing a newer device's changes.
  const result = await base44.entities.GroceryList.updateMany(
    {
      id: current.id,
      created_by_id: current.created_by_id,
      updated_date: current.updated_date,
    },
    { $set: payload }
  );
  if (result?.success !== true || result.updated !== 1)
    throw new Error("This list changed elsewhere. Reload it, then try your change again.");
  return verified(
    await base44.entities.GroceryList.get(current.id),
    current.created_by_id,
    current.weekStart
  );
}

export async function buildGroceryList(userId: string, week: string, meals: PlannedMeal[]) {
  if (!meals.length) throw new Error("Select at least one meal for your grocery list.");
  // Resolve the existing ID again on every retry, including an uncertain create response.
  const current = await loadGroceryList(userId, week);
  const payload = {
    sourceMealIds: [...new Set(meals.map((meal) => String(meal.key)))],
    items: groceryItemsFor(meals, current?.items),
  };
  if (current) return updateList(current, payload);
  return verified(
    await base44.entities.GroceryList.create({ weekStart: week, ...payload }),
    userId,
    week
  );
}

export async function setGroceryChecked(
  list: SavedGroceryList,
  item: GroceryItem,
  checked: boolean
) {
  const latest = verified(
    await base44.entities.GroceryList.get(list.id),
    list.created_by_id,
    list.weekStart
  );
  const match = latest.items.find((row) => groceryKey(row) === groceryKey(item));
  if (!match || match.qty !== item.qty)
    throw new Error("This ingredient changed. Reload the grocery list before checking it off.");
  return updateList(latest, {
    sourceMealIds: latest.sourceMealIds,
    items: latest.items.map((row) =>
      groceryKey(row) === groceryKey(item) ? { ...row, checked } : row
    ),
  });
}

export function groceryText(items: GroceryItem[]) {
  return items
    .filter((item) => !item.checked)
    .map((item) => `${item.name} — ${item.qty} ${item.unit}`)
    .join("\n");
}
