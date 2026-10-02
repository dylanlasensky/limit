import { describe, expect, it } from "vitest";
import { mediaSchema, playableMedia } from "../../packages/contracts/media";
import manifest from "../../media/manifest.json";
import { aiTelemetry } from "../../packages/domain/aiTelemetry";
describe("media evidence boundary", () => {
  it("validates every generated or blocked catalog entry", () => {
    expect(manifest).toHaveLength(365);
    for (const row of manifest) {
      const media = mediaSchema.parse(row);
      expect(playableMedia(media)).toBe(["technical", "approved"].includes(row.reviewStatus));
      if (row.reviewStatus !== "approved" && row.reviewStatus !== "draft")
        expect(media.reviewer).toBeNull();
    }
  });
  it("refuses draft, missing proof, and fabricated human approval", () => {
    const media = mediaSchema.parse(manifest.find((row) => row.source));
    expect(playableMedia({ ...media, reviewStatus: "draft" })).toBe(false);
    expect(playableMedia({ ...media, technicalChecks: [] })).toBe(false);
    expect(playableMedia({ ...media, reviewStatus: "approved", reviewer: null })).toBe(false);
    expect(
      playableMedia({
        ...media,
        reviewStatus: "approved",
        reviewer: "Named reviewer",
        reviewEvidence: "media/reviews/evidence.json",
      })
    ).toBe(true);
  });
  it("rejects object traversal and invalid checksums", () => {
    expect(mediaSchema.safeParse({ ...manifest[0], poster: "../secret" }).success).toBe(false);
    expect(mediaSchema.safeParse({ ...manifest[0], videoSha256: "invented" }).success).toBe(false);
  });
  it("telemetry selects usage fields without copying prompts, identity, or errors", () => {
    const record = aiTelemetry("coach", "success", "random-correlation", 20, {
      prompt_tokens: 10,
      completion_tokens: 2,
      prompt: "sensitive health",
      email: "private@example.org",
      neurons: NaN,
    });
    expect(JSON.stringify(record)).not.toMatch(/sensitive|private@/);
    expect(record.neurons).toBeNull();
    expect(record.estimatedCostUsd).toBeCloseTo(0.000007436);
    expect(aiTelemetry("text-import", "safety-refusal", "random", 3).estimatedCostUsd).toBeNull();
  });
});
