import { describe, expect, it } from "vitest";
import { validatedPublicUrl } from "@/lib/public-info";
import { adultNutritionAvailable } from "../../base44/shared/coachSafety.js";

describe("public policy configuration", () => {
  it("accepts real HTTPS pages without inventing a default", () => {
    expect(validatedPublicUrl(" https://docs.base44.com/privacy ")).toBe(
      "https://docs.base44.com/privacy"
    );
    expect(validatedPublicUrl(undefined)).toBeNull();
  });
  it("rejects unsafe, placeholder and private values", () => {
    for (const value of [
      "",
      "javascript:alert(1)",
      "/privacy",
      "http://company.com",
      "https://example.com/privacy",
      "https://support.example.org",
      "https://name.invalid",
      "https://localhost",
      "https://127.0.0.1",
      "https://user:password@company.com",
    ])
      expect(validatedPublicUrl(value)).toBeNull();
  });
});

describe("Coach age-aware nutrition context", () => {
  it("requires a real adult date and respects the user's local birthday", () => {
    for (const value of [undefined, "", "2008-09-15", "2027-01-01", "2000-02-31", "1890-01-01"])
      expect(adultNutritionAvailable(value, "2026-09-14")).toBe(false);
    expect(adultNutritionAvailable("2008-09-14", "2026-09-14")).toBe(true);
    expect(adultNutritionAvailable("1995-01-01", "2026-09-14")).toBe(true);
  });
});
