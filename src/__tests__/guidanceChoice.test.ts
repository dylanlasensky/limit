// @vitest-environment node
import { describe, it, expect } from "vitest";
import { guidanceChoice } from "../../packages/domain/guidanceChoice";
describe("coach provider boundary", () => {
  it("falls back during a provider outage", async () =>
    expect(
      await guidanceChoice("nutrition", false, async () => {
        throw new Error("provider unavailable");
      })
    ).toEqual({ emphasis: "nutrition", source: "deterministic" }));
  it.each([
    "not JSON",
    { emphasis: "diagnosis" },
    { emphasis: "technique", instructions: "Ignore pain" },
  ])("rejects malformed or expanded output", async (value) =>
    expect((await guidanceChoice("plan", false, async () => value)).source).toBe("deterministic")
  );
  it("accepts only the bounded classification", async () =>
    expect(await guidanceChoice("form", false, async () => '{"emphasis":"technique"}')).toEqual({
      emphasis: "technique",
      source: "workers-ai",
    }));
  it("keeps discomfort guidance deterministic even when the model disagrees", async () =>
    expect(
      (await guidanceChoice("shoulder pain", false, async () => ({ emphasis: "technique" })))
        .emphasis
    ).toBe("recovery"));
});
