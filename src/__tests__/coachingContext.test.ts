// @vitest-environment node
import { describe, expect, it } from "vitest";
import { coachingContext } from "../../packages/domain/coachingContext";
const profile = {
  availableDays: ["Monday", "Thursday"],
  sessionLength: 30,
  birthDate: "1990-01-01",
  calorieTarget: 2000,
  proteinTarget: 100,
  carbTarget: 250,
  fatTarget: 67,
};
describe("personalized context safety", () => {
  it("uses recent completed history and the saved schedule", () => {
    const answer = coachingContext(
      profile,
      {},
      [
        { status: "completed", date: "2026-09-26" },
        { status: "active", date: "2026-09-27" },
        { status: "completed", date: "2026-08-01" },
      ],
      "2026-09-27"
    );
    expect(answer).toContain("1 workout in the last two weeks");
    expect(answer).toContain("2 training days");
    expect(answer).toContain("does not change them");
  });
  it("retains allergies and dietary exclusions without approving food safety", () => {
    const answer = coachingContext(
      profile,
      { allergies: ["Peanuts"], dietaryPreferences: ["Vegan"], foodsToAvoid: ["Sesame"] },
      [],
      "2026-09-27"
    );
    for (const constraint of ["Peanuts", "Vegan", "Sesame"]) expect(answer).toContain(constraint);
    expect(answer).toContain("does not clear foods as allergy-safe");
  });
  it.each([
    { ...profile, birthDate: "2012-01-01" },
    { ...profile, birthDate: undefined },
    { ...profile, calorieTarget: 500 },
  ])("does not repeat unsupported nutrition targets", (value) => {
    expect(coachingContext(value, undefined, [], "2026-09-27")).not.toContain("calories");
  });
  it("acknowledges movement limitations", () => {
    expect(coachingContext({ ...profile, injuries: ["Shoulder limitation"] }, {}, [])).toContain(
      "Automatic new plans are paused"
    );
  });
});
