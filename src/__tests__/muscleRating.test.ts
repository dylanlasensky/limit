import { describe, expect, it } from "vitest";
import {
  calculateMuscleRating,
  emptyRating,
  snapshotPayload,
} from "@/components/limit/muscleRating";

const MUSCLES = [
  "Chest",
  "Shoulders",
  "Back",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
];

const benchPress = {
  name: "Barbell Bench Press",
  primaryMuscle: "Chest",
  secondaryMuscles: ["Triceps", "Front delts"],
};
const profile = { measurementSystemVersion: "us_v1", currentWeight: 180 };

const session = (id) => ({ id, status: "completed" });
const set = (workoutSessionId, weight, reps) => ({
  workoutSessionId,
  exerciseName: "Barbell Bench Press",
  weight,
  reps,
  completed: true,
});

describe("emptyRating", () => {
  it("produces a Beginner rating for every muscle with no data", () => {
    const rating = emptyRating();
    expect(rating.hasData).toBe(false);
    expect(rating.overallLevel).toBe("Beginner");
    expect(Object.keys(rating.muscles).sort()).toEqual([...MUSCLES].sort());
    for (const m of MUSCLES) {
      expect(rating.muscles[m].level).toBe("Beginner");
      expect(rating.muscles[m].sets).toBe(0);
      expect(rating.muscles[m].confidence).toBe(0);
    }
  });
});

describe("calculateMuscleRating", () => {
  it("credits the primary muscle and secondary muscles of a logged exercise", () => {
    const rating = calculateMuscleRating({
      sets: [set("s1", 185, 5), set("s1", 185, 5)],
      exercises: [benchPress],
      sessions: [session("s1")],
      profile,
      weights: [],
    });
    expect(rating.hasData).toBe(true);
    expect(rating.bodyWeight).toBe(180);
    expect(rating.muscles.Chest.sets).toBe(2);
    expect(rating.muscles.Chest.exercises).toEqual(["Barbell Bench Press"]);
    // Secondary muscles are credited (aliases map "Front delts" -> Shoulders).
    expect(rating.muscles.Triceps.sets).toBe(2);
    expect(rating.muscles.Shoulders.sets).toBe(2);
    // Untouched muscles stay empty.
    expect(rating.muscles.Quads.sets).toBe(0);
    expect(rating.muscles.Chest.score).toBeGreaterThan(emptyRating().muscles.Chest.score);
  });

  it("ignores sets from sessions that were not completed", () => {
    const rating = calculateMuscleRating({
      sets: [set("abandoned", 225, 5)],
      exercises: [benchPress],
      sessions: [{ id: "abandoned", status: "in_progress" }],
      profile,
      weights: [],
    });
    expect(rating.muscles.Chest.sets).toBe(0);
  });

  it("scores heavier relative loads higher and gains confidence with more sessions", () => {
    const light = calculateMuscleRating({
      sets: [set("s1", 95, 8)],
      exercises: [benchPress],
      sessions: [session("s1")],
      profile,
      weights: [],
    });
    const heavy = calculateMuscleRating({
      sets: [set("s1", 275, 5)],
      exercises: [benchPress],
      sessions: [session("s1")],
      profile,
      weights: [],
    });
    expect(heavy.muscles.Chest.score).toBeGreaterThan(light.muscles.Chest.score);

    const multi = calculateMuscleRating({
      sets: [set("s1", 185, 5), set("s2", 190, 5), set("s3", 195, 5)],
      exercises: [benchPress],
      sessions: [session("s1"), session("s2"), session("s3")],
      profile,
      weights: [],
    });
    expect(multi.muscles.Chest.sessions).toBe(3);
    expect(multi.muscles.Chest.confidence).toBeGreaterThan(light.muscles.Chest.confidence);
  });

  it("uses the most recent logged body weight, converting kg to lb", () => {
    const rating = calculateMuscleRating({
      sets: [],
      exercises: [],
      sessions: [],
      profile,
      weights: [
        { date: "2024-01-01", weight: 200, unit: "lb" },
        { date: "2024-03-01", weight: 80, unit: "kg" },
      ],
    });
    expect(rating.bodyWeight).toBe(Math.round(80 * 2.20462));
  });
});

describe("snapshotPayload", () => {
  it("flattens a rating into per-muscle score, level and confidence maps", () => {
    const rating = calculateMuscleRating({
      sets: [set("s1", 185, 5)],
      exercises: [benchPress],
      sessions: [session("s1")],
      profile,
      weights: [],
    });
    const payload = snapshotPayload(rating, "s1");
    expect(payload.workoutSessionId).toBe("s1");
    expect(payload.overallLevel).toBe(rating.overallLevel);
    expect(payload.overallScore).toBe(rating.overallScore);
    expect(payload.muscleScores.Chest).toBe(rating.muscles.Chest.score);
    expect(payload.muscleLevels.Chest).toBe(rating.muscles.Chest.level);
    expect(payload.confidence.Chest).toBe(rating.muscles.Chest.confidence);
    expect(Object.keys(payload.muscleScores)).toHaveLength(MUSCLES.length);
    expect(new Date(payload.date).toString()).not.toBe("Invalid Date");
  });
});
