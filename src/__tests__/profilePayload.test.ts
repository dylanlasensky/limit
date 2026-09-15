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
  it("validates birth dates and exact training days before a save or rebuild", () => {
    expect(() => profilePayload({ ...profile, birthDate: "2099-01-01" })).toThrow(/date of birth/);
    expect(() => profilePayload({ ...profile, availableDays: ["Monday"] })).toThrow(/2 and 6/);
    expect(() => profilePayload({ ...profile, availableDays: ["Monday", "Monday"] })).toThrow(
      /2 and 6/
    );
    expect(() => profilePayload({ ...profile, equipment: [] })).toThrow(/equipment/);
    expect(
      profilePayload({
        ...profile,
        name: "  Jordan  ",
        goalWeight: "",
        availableDays: ["Friday", "Monday"],
      })
    ).toMatchObject({
      name: "Jordan",
      goalWeight: 180,
      availableDays: ["Monday", "Friday"],
      trainingDays: ["Monday", "Friday"],
    });
  });
  it("sends numeric values to the backend even while inputs preserve an editable string", () => {
    expect(
      profilePayload({
        ...profile,
        currentWeight: "180.5",
        heightFeet: "5",
        heightInches: "11",
        calorieTarget: "2400",
      })
    ).toMatchObject({
      currentWeight: 180.5,
      heightFeet: 5,
      heightInches: 11,
      calorieTarget: 2400,
    });
  });
  it("uses a populated legacy training schedule when availableDays is empty", () => {
    expect(
      profilePayload({ ...profile, availableDays: [], trainingDays: ["Friday", "Monday"] })
    ).toMatchObject({
      availableDays: ["Monday", "Friday"],
      trainingDays: ["Monday", "Friday"],
    });
    expect(() => profilePayload({ ...profile, availableDays: [], trainingDays: [] })).toThrow(
      /2 and 6/
    );
  });
});
