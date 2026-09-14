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
] as const;

export type MuscleGroup = (typeof MUSCLES)[number];
export type MuscleLevel = "Beginner" | "Intermediate" | "Advanced" | "Elite";
export type ExerciseKind = "compound" | "dumbbell" | "bodyweight" | "machine" | "isolation";

interface ExerciseProfile {
  kind: ExerciseKind;
  elite: number;
}

interface LevelQuality {
  sessions: number;
  exercises: number;
}

export interface MuscleSignal {
  score: number;
  weight: number;
  session?: string;
  exercise?: string;
  load: number;
  reps: number;
  e1rm: number;
  kind: ExerciseKind;
}

export interface MuscleScore {
  score: number;
  level: MuscleLevel;
  confidence: number;
  sets: number;
  sessions: number;
  exercises: Array<string | undefined>;
  best: MuscleSignal[];
}

export interface MuscleRating {
  overallScore: number;
  overallLevel: MuscleLevel;
  muscles: Record<MuscleGroup, MuscleScore>;
  categories: Record<"Push" | "Pull" | "Legs" | "Arms" | "Core", number>;
  bodyWeight: number;
  hasData: boolean;
}

export interface MuscleRatingInput {
  sets?: any[];
  exercises?: any[];
  sessions?: any[];
  profile?: Record<string, any>;
  weights?: any[];
}

export interface RatingSnapshot {
  date: string;
  workoutSessionId?: string;
  overallLevel: MuscleLevel;
  overallScore: number;
  muscleScores: Record<string, number>;
  muscleLevels: Record<string, MuscleLevel>;
  confidence: Record<string, number>;
  details: Record<MuscleGroup, MuscleScore>;
}

const aliases: Record<string, MuscleGroup> = {
  Chest: "Chest",
  "Front delts": "Shoulders",
  "Side delts": "Shoulders",
  "Rear delts": "Shoulders",
  Shoulders: "Shoulders",
  Lats: "Back",
  "Upper back": "Back",
  "Lower back": "Back",
  Traps: "Back",
  Back: "Back",
  Biceps: "Biceps",
  Forearms: "Biceps",
  Triceps: "Triceps",
  Quads: "Quads",
  Hamstrings: "Hamstrings",
  Glutes: "Glutes",
  Calves: "Calves",
  "Abs/core": "Core",
  Core: "Core",
};
const profiles: Array<[RegExp, ExerciseProfile]> = [
  [/bench press/i, { kind: "compound", elite: 1.75 }],
  [/incline dumbbell press/i, { kind: "dumbbell", elite: 1.25 }],
  [/shoulder press|overhead press/i, { kind: "dumbbell", elite: 0.95 }],
  [/back squat/i, { kind: "compound", elite: 2.15 }],
  [/front squat/i, { kind: "compound", elite: 1.75 }],
  [/romanian deadlift/i, { kind: "compound", elite: 2 }],
  [/deadlift/i, { kind: "compound", elite: 2.55 }],
  [/hip thrust/i, { kind: "compound", elite: 2.4 }],
  [/barbell row/i, { kind: "compound", elite: 1.45 }],
  [/pull-up|chin-up/i, { kind: "bodyweight", elite: 1.5 }],
  [/push-up|dip/i, { kind: "bodyweight", elite: 1.45 }],
  [/lat pulldown|cable row|leg press/i, { kind: "machine", elite: 1.5 }],
  [/curl|pushdown|lateral raise|leg curl|calf raise|crunch/i, { kind: "isolation", elite: 0.55 }],
  [/./, { kind: "machine", elite: 1.2 }],
];
const levelFor = (score: number, quality: LevelQuality): MuscleLevel => {
  if (score >= 85 && quality.sessions >= 5 && quality.exercises >= 2) return "Elite";
  if (score >= 65 && quality.sessions >= 3 && quality.exercises >= 2) return "Advanced";
  if (score >= 40 && quality.sessions >= 2) return "Intermediate";
  return "Beginner";
};
const profileFor = (name: string) => profiles.find(([rx]) => rx.test(name))?.[1];
const bodyWeightLb = (profile: Record<string, any> | undefined, weights: any[]): number => {
  const latest = [...weights].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  if (latest) return latest.unit === "kg" ? latest.weight * 2.20462 : latest.weight;
  const value = profile?.currentWeight || 170;
  return profile?.measurementSystemVersion === "us_v1" ? value : value * 2.20462;
};
export const calculateMuscleRating = ({
  sets = [],
  exercises = [],
  sessions = [],
  profile = {},
  weights = [],
}: MuscleRatingInput): MuscleRating => {
  const bw = Math.max(80, bodyWeightLb(profile, weights));
  const exerciseByName: Record<string, any> = Object.fromEntries(
    exercises.map((x) => [x.name.toLowerCase(), x])
  );
  const completed = new Set(sessions.filter((x) => x.status === "completed").map((x) => x.id));
  const buckets = Object.fromEntries(MUSCLES.map((x) => [x, [] as MuscleSignal[]])) as Record<
    MuscleGroup,
    MuscleSignal[]
  >;
  sets
    .filter(
      (x) => x.completed !== false && (!x.workoutSessionId || completed.has(x.workoutSessionId))
    )
    .forEach((set) => {
      const exercise = exerciseByName[set.exerciseName?.toLowerCase()] || {};
      const spec = profileFor(set.exerciseName || "")!;
      const reps = Math.max(1, +set.reps || 1),
        load = Math.max(0, +set.weight || 0);
      let effective = load * (1 + Math.min(reps, 15) / 30);
      if (spec.kind === "dumbbell") effective *= 2;
      if (spec.kind === "bodyweight") effective = (bw + load) * (1 + Math.min(reps, 15) / 40);
      let score = Math.min(100, (effective / bw / spec.elite) * 100);
      if (spec.kind === "machine") score = Math.min(score, 78);
      if (spec.kind === "isolation") score = Math.min(score, 64);
      const primary = aliases[exercise.primaryMuscle || set.primaryMuscle];
      const second = ((exercise.secondaryMuscles || []) as string[])
        .map((x) => aliases[x])
        .filter(Boolean);
      if (primary)
        buckets[primary].push({
          score,
          weight: 1,
          session: set.workoutSessionId,
          exercise: set.exerciseName,
          load,
          reps,
          e1rm: Math.round(effective),
          kind: spec.kind,
        });
      second.forEach((m) =>
        buckets[m].push({
          score,
          weight: 0.3,
          session: set.workoutSessionId,
          exercise: set.exerciseName,
          load,
          reps,
          e1rm: Math.round(effective),
          kind: spec.kind,
        })
      );
    });
  const muscles = {} as Record<MuscleGroup, MuscleScore>;
  MUSCLES.forEach((name) => {
    const rows = buckets[name],
      sessionCount = new Set(rows.map((x) => x.session).filter(Boolean)).size,
      exerciseCount = new Set(rows.map((x) => x.exercise)).size,
      ranked = [...rows].sort((a, b) => b.score - a.score),
      top = ranked.slice(0, Math.max(1, Math.min(5, ranked.length)));
    const raw = top.length
      ? top.reduce((a, x) => a + x.score * x.weight, 0) / top.reduce((a, x) => a + x.weight, 0)
      : 18;
    const confidence = Math.min(
      100,
      sessionCount * 18 + exerciseCount * 12 + Math.min(rows.length, 12) * 2
    );
    const score = Math.round(raw * (0.72 + (0.28 * confidence) / 100));
    const quality = { sessions: sessionCount, exercises: exerciseCount };
    muscles[name] = {
      score,
      level: levelFor(score, quality),
      confidence,
      sets: rows.length,
      sessions: sessionCount,
      exercises: [...new Set(rows.map((x) => x.exercise))],
      best: ranked.slice(0, 3),
    };
  });
  const avg = (names: MuscleGroup[]) =>
    names.reduce((a, x) => a + muscles[x].score, 0) / names.length;
  const categories = {
    Push: avg(["Chest", "Shoulders", "Triceps"]),
    Pull: avg(["Back", "Biceps"]),
    Legs: avg(["Quads", "Hamstrings", "Glutes", "Calves"]),
    Arms: avg(["Biceps", "Triceps"]),
    Core: muscles.Core.score,
  };
  const covered = Object.values(muscles).filter((x) => x.sessions >= 2).length;
  const overallScore = Math.round(
    categories.Push * 0.25 +
      categories.Pull * 0.25 +
      categories.Legs * 0.3 +
      categories.Arms * 0.1 +
      categories.Core * 0.1
  );
  const allSessions = new Set(sets.map((x) => x.workoutSessionId).filter(Boolean)).size;
  const quality = { sessions: allSessions, exercises: covered };
  let overallLevel = levelFor(overallScore, quality);
  if (covered < 5 && ["Advanced", "Elite"].includes(overallLevel)) overallLevel = "Intermediate";
  return {
    overallScore,
    overallLevel,
    muscles,
    categories,
    bodyWeight: Math.round(bw),
    hasData: sets.length > 0,
  };
};
export const emptyRating = (): MuscleRating =>
  calculateMuscleRating({ sets: [], exercises: [], sessions: [], profile: {}, weights: [] });
export const snapshotPayload = (
  rating: MuscleRating,
  workoutSessionId?: string
): RatingSnapshot => ({
  date: new Date().toISOString(),
  workoutSessionId,
  overallLevel: rating.overallLevel,
  overallScore: rating.overallScore,
  muscleScores: Object.fromEntries(Object.entries(rating.muscles).map(([k, v]) => [k, v.score])),
  muscleLevels: Object.fromEntries(Object.entries(rating.muscles).map(([k, v]) => [k, v.level])),
  confidence: Object.fromEntries(Object.entries(rating.muscles).map(([k, v]) => [k, v.confidence])),
  details: rating.muscles,
});
