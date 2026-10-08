import { describe, expect, it } from "vitest";
import { previewSessionBudget } from "../../packages/domain/sessionBudget.js";

const rows = [
  { id: "squat", exerciseName: "Squat", sets: 4, repMax: 8, restSeconds: 180 },
  { id: "press", exerciseName: "Press", sets: 4, repMax: 8, restSeconds: 180 },
  { id: "row", exerciseName: "Row", sets: 4, repMax: 10, restSeconds: 120 },
  { id: "curl", exerciseName: "Curl", sets: 4, repMax: 12, restSeconds: 90 },
];

describe("one-session time budget", () => {
  it("keeps key movements and rest while cutting accessories only in the snapshot", () => {
    const result = previewSessionBudget(rows, 40);
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.selected.slice(0, 2)).toEqual(rows.slice(0, 2));
    expect(result.estimatedMinutes).toBeLessThanOrEqual(40);
    expect(rows[3].sets).toBe(4);
    expect(
      result.selected.every(
        (row) => row.restSeconds === rows.find((original) => original.id === row.id)?.restSeconds
      )
    ).toBe(true);
  });

  it("refuses budgets that cannot preserve key movements", () => {
    expect(previewSessionBudget(rows, 20).available).toBe(false);
  });

  it("preserves coach-mandated accessories", () => {
    const result = previewSessionBudget(
      rows.map((row) => ({ ...row, coachMandated: row.id === "curl" })),
      50
    );
    expect(result.available).toBe(true);
    if (result.available) expect(result.selected.some((row) => row.id === "curl")).toBe(true);
  });
});
