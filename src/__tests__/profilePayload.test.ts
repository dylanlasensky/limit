import { describe, expect, it } from "vitest";
import { profilePayload } from "@/lib/profile-payload";
const profile = { name: "Jordan", currentWeight: 180, heightFeet: 5, heightInches: 11 };
describe("profile settings payload", () => {
  it("never overwrites server locks or ownership metadata with stale form data", () => {
    expect(
      profilePayload({
        ...profile,
        id: "id",
        created_by_id: "user",
        workoutLockToken: "stale",
        workoutLockUntil: 123,
      })
    ).toEqual(profile);
  });
  it.each([{ currentWeight: -1 }, { heightInches: 12 }, { heightFeet: 0 }, { calorieTarget: NaN }])(
    "rejects invalid metrics %j",
    (patch) => {
      expect(() => profilePayload({ ...profile, ...patch })).toThrow();
    }
  );
});
