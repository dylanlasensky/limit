import { describe, expect, it } from "vitest";
import { exerciseCatalog } from "../../base44/shared/exerciseCatalog.js";
import { browseCatalog, muscleFamilies } from "@/lib/training/browseCatalog";
import { readFavorites } from "@/hooks/use-exercise-favorites";

describe("complete browse catalog", () => {
  it("shows all 365 movements with just 18 saved records, without inventing database IDs", () => {
    const saved = exerciseCatalog.slice(0, 18).map((row, i) => ({ ...row, id: "database-" + i }));
    const result = browseCatalog(saved);
    expect(result).toHaveLength(365);
    expect(result.filter((x) => !x.referenceOnly)).toHaveLength(18);
    expect(result.filter((x) => x.referenceOnly).every((x) => !x.id)).toBe(true);
    expect(result.find((x) => x.catalogKey === saved[0].catalogKey)?.id).toBe("database-0");
  });
  it("keeps the full library browsable with no database and preserves custom exercises", () => {
    expect(browseCatalog([])).toHaveLength(365);
    const result = browseCatalog([
      { id: "custom", name: "My coach’s movement", equipment: "Other" },
    ]);
    expect(result).toHaveLength(366);
    expect(result.find((x) => x.id === "custom")?.referenceOnly).toBe(false);
  });
  it("deduplicates display aliases without changing saved record names or IDs", () => {
    const result = browseCatalog([
      { id: "legacy", name: "Bench Press", equipment: "Barbell", primaryMuscle: "Chest" },
    ]);
    expect(result).toHaveLength(365);
    expect(result.find((x) => x.id === "legacy")?.name).toBe("Bench Press");
    expect(new Set(result.map((x) => x.browseKey)).size).toBe(result.length);
  });
  it("covers every primary muscle with a discoverable family", () => {
    const muscles = Object.values(muscleFamilies).flat();
    for (const row of exerciseCatalog) expect(muscles).toContain(row.primaryMuscle);
  });
  it("preserves duplicate saved IDs and canonical browse muscles without rewriting legacy values", () => {
    const result = browseCatalog([
      { id: "legacy", name: "Lat Pulldown", equipment: "Cable", primaryMuscle: "Back" },
      { id: "new", name: "Lat Pulldown", equipment: "Cable", primaryMuscle: "Lats" },
    ]);
    const row = result.find((x) => x.id === "legacy")!;
    expect(row.savedIds).toEqual(["legacy", "new"]);
    expect(row.primaryMuscle).toBe("Back");
    expect(muscleFamilies.Back).toContain(row.browseMuscle);
  });
});

describe("device favorites", () => {
  it("isolates accounts and safely handles malformed stored data", () => {
    localStorage.setItem("limit-exercise-favorites:one", JSON.stringify(["bench", 123]));
    localStorage.setItem("limit-exercise-favorites:two", "not json");
    expect(readFavorites("one")).toEqual(["bench"]);
    expect(readFavorites("two")).toEqual([]);
    expect(readFavorites("three")).toEqual([]);
    localStorage.clear();
  });
});
