// @vitest-environment node
import { describe, it, expect } from "vitest";
import { aiResponse } from "../../packages/domain/aiResponse";
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
  it.each([
    { response: { emphasis: "technique" } },
    { response: '{"emphasis":"technique"}' },
    '{"emphasis":"technique"}',
  ])("accepts validated Workers AI response variants", async (response) =>
    expect(await guidanceChoice("form", false, async () => aiResponse(response))).toEqual({
      emphasis: "technique",
      source: "workers-ai",
    })
  );
  it("rejects malformed Workers AI JSON", async () =>
    expect(
      (await guidanceChoice("form", false, async () => aiResponse({ response: "broken" }))).source
    ).toBe("deterministic"));
  it("keeps discomfort guidance deterministic even when the model disagrees", async () =>
    expect(
      (await guidanceChoice("shoulder pain", false, async () => ({ emphasis: "technique" })))
        .emphasis
    ).toBe("recovery"));
});
