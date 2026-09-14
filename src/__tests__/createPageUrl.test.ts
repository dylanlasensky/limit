import { describe, expect, it } from "vitest";
import { createPageUrl } from "@/utils";

describe("createPageUrl", () => {
  it("prefixes the page name with a slash", () => {
    expect(createPageUrl("Home")).toBe("/Home");
  });

  it("replaces every space with a hyphen", () => {
    expect(createPageUrl("Meal Plan Details")).toBe("/Meal-Plan-Details");
  });

  it("leaves names without spaces unchanged", () => {
    expect(createPageUrl("WorkoutHistory")).toBe("/WorkoutHistory");
  });
});
