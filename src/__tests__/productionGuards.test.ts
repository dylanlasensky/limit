// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
  );
}
describe("production source integrity", () => {
  it("has no JavaScript files that shadow TypeScript modules", () => {
    const source = files(path.join(root, "src"));
    expect(
      source.filter(
        (file) =>
          /\.(jsx|js)$/.test(file) &&
          [file.replace(/\.(jsx|js)$/, ".ts"), file.replace(/\.(jsx|js)$/, ".tsx")].some((typed) =>
            source.includes(typed)
          )
      )
    ).toEqual([]);
  });
  it("ships the manifest referenced by index.html", () => {
    const manifest = JSON.parse(readFileSync(path.join(root, "public/manifest.json"), "utf8"));
    expect(manifest.name).toBe("LIMIT");
    expect(manifest.start_url).toBe("/");
    expect(readFileSync(path.join(root, "public", manifest.icons[0].src), "utf8")).toContain(
      "<svg"
    );
  });
  it("all private data schemas have read rules; workouts are server-write only", () => {
    for (const name of [
      "UserProfile",
      "DietaryProfile",
      "FoodEntry",
      "WeightEntry",
      "WorkoutSession",
      "ExerciseSet",
      "MuscleRatingSnapshot",
    ]) {
      const schema = JSON.parse(
        readFileSync(path.join(root, "base44/entities", name + ".jsonc"), "utf8")
      );
      expect(schema.rls.read).toBeTruthy();
      if (["WorkoutSession", "ExerciseSet", "MuscleRatingSnapshot"].includes(name)) {
        expect(schema.rls.create).toEqual({ user_condition: { role: "admin" } });
      }
    }
  });
});
