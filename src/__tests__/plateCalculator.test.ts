import { describe, expect, it } from "vitest";
import { calculatePlates, standardPlates } from "@/lib/training/plateCalculator";

describe("plate calculator", () => {
  it("includes the bar and produces a per-side breakdown in pounds", () => {
    expect(calculatePlates(225, 45, standardPlates.lb)).toEqual({
      exact: true,
      total: 225,
      difference: 0,
      perSide: [{ weight: 45, count: 2 }],
    });
  });

  it("supports kilograms and fractional plates", () => {
    expect(calculatePlates(102.5, 20, standardPlates.kg)).toEqual({
      exact: true,
      total: 102.5,
      difference: 0,
      perSide: [
        { weight: 25, count: 1 },
        { weight: 15, count: 1 },
        { weight: 1.25, count: 1 },
      ],
    });
  });

  it("supports lighter bars without assuming their weight from gender", () => {
    expect(calculatePlates(55, 15, standardPlates.kg)).toMatchObject({
      exact: true,
      total: 55,
      perSide: [{ weight: 20, count: 1 }],
    });
  });

  it("finds combinations a greedy algorithm would miss with unavailable plates", () => {
    expect(calculatePlates(100, 20, [25, 20])).toMatchObject({
      exact: true,
      perSide: [{ weight: 20, count: 2 }],
    });
  });

  it("reports the closest lower load instead of silently rounding up", () => {
    expect(calculatePlates(137, 45, standardPlates.lb)).toEqual({
      exact: false,
      total: 135,
      difference: 2,
      perSide: [{ weight: 45, count: 1 }],
    });
  });

  it("does not pretend a half-cent per-side remainder is exact", () => {
    expect(calculatePlates(45.01, 45, standardPlates.lb)).toMatchObject({
      exact: false,
      total: 45,
      difference: 0.01,
    });
  });

  it("supports an unloaded bar or no selected plates", () => {
    expect(calculatePlates(45, 45, [])).toEqual({
      exact: true,
      total: 45,
      difference: 0,
      perSide: [],
    });
    expect(calculatePlates(100, 45, [])).toMatchObject({
      exact: false,
      total: 45,
      difference: 55,
    });
  });

  it.each([
    [40, 45],
    [-1, 45],
    [NaN, 45],
    [Infinity, 45],
    [2501, 45],
    [100, -1],
    [100, NaN],
    [100, Infinity],
    [100, 2501],
    [100.001, 45],
    [100, 45.001],
  ])("rejects invalid target %s and bar %s", (target, bar) => {
    expect(calculatePlates(target, bar, standardPlates.lb)).toHaveProperty("error");
  });

  it("ignores duplicate and invalid plate sizes", () => {
    expect(calculatePlates(135, 45, [45, 45, -1, 0, NaN, Infinity])).toMatchObject({
      exact: true,
      perSide: [{ weight: 45, count: 1 }],
    });
  });
});
