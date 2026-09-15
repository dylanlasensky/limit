export type PlateUnit = "lb" | "kg";

export const standardPlates: Record<PlateUnit, number[]> = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export type PlateCalculation =
  | { error: string }
  | {
      exact: boolean;
      total: number;
      difference: number;
      perSide: { weight: number; count: number }[];
    };

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Assumes enough matching pairs of each selected plate. Never rounds the load upward. */
export function calculatePlates(
  target: number,
  bar: number,
  plateWeights: number[]
): PlateCalculation {
  if (!Number.isFinite(target) || target < 0 || target > 2500)
    return { error: "Enter a total weight from 0–2,500." };
  if (!Number.isFinite(bar) || bar < 0 || bar > 2500)
    return { error: "Enter a bar weight from 0–2,500." };
  if (target < bar) return { error: "The total weight cannot be less than the bar weight." };
  if (Math.abs(round(target) - target) > 0.000001 || Math.abs(round(bar) - bar) > 0.000001)
    return { error: "Use no more than two decimal places." };

  const plates = [...new Set(plateWeights)]
    .filter((weight) => Number.isFinite(weight) && weight >= 0.01 && weight <= 2500)
    .map((weight) => Math.round(weight * 100))
    .sort((a, b) => b - a);
  const perSideTarget = (Math.round(target * 100) - Math.round(bar * 100)) / 2;
  const limit = Math.floor(perSideTarget);
  const counts = new Int32Array(limit + 1).fill(-1);
  const lastPlate = new Int32Array(limit + 1).fill(-1);
  counts[0] = 0;
  // Dynamic programming also works when a plate size is unavailable, where a
  // largest-first approach could incorrectly report that a load is impossible.
  for (let load = 1; load <= limit; load++) {
    for (const plate of plates) {
      if (
        plate <= load &&
        counts[load - plate] >= 0 &&
        (counts[load] < 0 || counts[load - plate] + 1 < counts[load])
      ) {
        counts[load] = counts[load - plate] + 1;
        lastPlate[load] = plate;
      }
    }
  }
  let achieved = limit;
  while (achieved > 0 && counts[achieved] < 0) achieved--;
  const breakdown = new Map<number, number>();
  for (let remaining = achieved; remaining > 0;) {
    const plate = lastPlate[remaining];
    breakdown.set(plate, (breakdown.get(plate) || 0) + 1);
    remaining -= plate;
  }
  const total = round(bar + (achieved * 2) / 100);
  return {
    exact: Math.abs(total - target) < 0.000001,
    total,
    difference: round(target - total),
    perSide: [...breakdown.entries()]
      .sort(([a], [b]) => b - a)
      .map(([weight, count]) => ({ weight: weight / 100, count })),
  };
}
