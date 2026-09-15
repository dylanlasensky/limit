// Reproducible starting plans, not a claim that one split is universally optimal.
import { normalizeEquipmentPreferences } from "@/lib/training/equipmentPreferences";
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const exerciseBudget = (len: number | string): number =>
  ({ 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 })[+len] || 6;
export type GoalKey = "muscle_strength" | "strength" | "muscle" | "fat_loss" | "general";
export const goalKey = (goal?: string | null): GoalKey => {
  const value = (goal || "").toLowerCase();
  if (value.includes("strength") && value.includes("muscle")) return "muscle_strength";
  if (/stronger|strength/.test(value)) return "strength";
  if (/muscle|gain/.test(value)) return "muscle";
  if (/fat|lose/.test(value)) return "fat_loss";
  return "general";
};
export const PRIORITY_MAP: Record<string, string[]> = {
  Chest: ["Chest"],
  Back: ["Lats", "Upper back"],
  Shoulders: ["Side delts", "Rear delts"],
  Arms: ["Biceps", "Triceps"],
  Quads: ["Quads"],
  Hamstrings: ["Hamstrings"],
  Glutes: ["Glutes"],
  Calves: ["Calves"],
  Core: ["Abs/core"],
};

// Explicit weekdays are authoritative. Spread defaults out only when none were supplied.
export const orderedTrainingDays = (profile: any): number[] => {
  const supplied = profile.availableDays?.length ? profile.availableDays : profile.trainingDays;
  if (Array.isArray(supplied) && supplied.length) {
    return [
      ...new Set<number>(
        supplied.map((day: string) => WEEKDAYS.indexOf(day)).filter((day: number) => day >= 0)
      ),
    ].sort((a, b) => a - b);
  }
  const count = Math.min(6, Math.max(2, Math.round(Number(profile.days) || 3)));
  return (
    {
      2: [0, 3],
      3: [0, 2, 4],
      4: [0, 1, 3, 4],
      5: [0, 1, 2, 4, 5],
      6: [0, 1, 2, 3, 4, 5],
    } as Record<number, number[]>
  )[count];
};
export const dayVariant = (name: string): number => {
  const letter = name.match(/\b([A-F])\b/)?.[1];
  if (letter) return letter.charCodeAt(0) - 65;
  return /hypertrophy|focus$/i.test(name) && !/squat|bench/i.test(name) ? 1 : 0;
};
export interface Scheme {
  sets: number;
  repMin: number;
  repMax: number;
  rest: number;
}
export const scheme = (goal: string, role: string, experience: string): Scheme => {
  const base =
    experience === "beginner"
      ? role === "iso"
        ? 2
        : 3
      : experience === "advanced" && /main/.test(role)
        ? 4
        : 3;
  if (role === "main_strength")
    return {
      sets: experience === "beginner" ? 3 : 4,
      repMin: experience === "beginner" ? 5 : 3,
      repMax: 6,
      rest: 210,
    };
  if (goal === "strength")
    return role === "main"
      ? { sets: base, repMin: 4, repMax: 6, rest: 180 }
      : role === "secondary"
        ? { sets: base, repMin: 6, repMax: 8, rest: 150 }
        : { sets: base, repMin: 8, repMax: 12, rest: 90 };
  if (goal === "muscle_strength" && role === "main")
    return { sets: base, repMin: 4, repMax: 8, rest: 180 };
  return role === "main"
    ? { sets: base, repMin: 6, repMax: 10, rest: 150 }
    : role === "secondary"
      ? { sets: base, repMin: 8, repMax: 12, rest: 120 }
      : { sets: base, repMin: 10, repMax: 15, rest: 75 };
};

export interface Slot {
  muscles: string[];
  role: string;
  type?: string;
  movementPatterns?: string[];
  essential?: boolean;
  priority?: boolean;
  priorityMuscle?: string;
}
const S = (
  muscles: string[],
  role: string,
  type?: string,
  movementPatterns?: string[],
  essential = false
): Slot => ({ muscles, role, type, movementPatterns, essential });
const press = () => S(["Chest"], "main", "Compound", ["Horizontal press"], true);
const pull = (vertical = false) =>
  S(
    ["Lats", "Upper back"],
    "main",
    "Compound",
    vertical ? ["Vertical pull", "Horizontal pull"] : ["Horizontal pull", "Vertical pull"],
    true
  );
const squat = () =>
  S(["Quads", "Glutes"], "main", "Compound", ["Squat", "Leg press", "Lunge and step"], true);
const hinge = () =>
  S(["Hamstrings", "Glutes"], "secondary", "Compound", ["Hip hinge", "Hip thrust"], true);
const shoulders = () => S(["Side delts", "Rear delts"], "iso", "Isolation");
const core = () => S(["Abs/core"], "iso");
const arm = (biceps: boolean) => S([biceps ? "Biceps" : "Triceps"], "iso", "Isolation");
const calves = () => S(["Calves"], "iso", "Isolation");
const curl = () => S(["Hamstrings"], "iso", "Isolation", ["Knee flexion"]);

export const focusFor = (name?: string | null): string => {
  const value = (name || "").toLowerCase();
  if (value.includes("full body")) return "full";
  if (value.includes("squat")) return "squat";
  if (value.includes("bench")) return "bench";
  if (value.includes("deadlift")) return "deadlift";
  if (value.includes("assist")) return "upper_assist";
  if (/shoulder|arm/.test(value)) return "arms_shoulders";
  if (value.includes("push")) return "push";
  if (value.includes("pull")) return "pull";
  if (value.includes("upper")) return "upper";
  if (/lower|leg/.test(value)) return "lower";
  return "full";
};
const focusSlots = (focus: string, variant: number): Slot[] => {
  const second = variant % 2 === 1;
  switch (focus) {
    case "full":
      return [
        second ? hinge() : squat(),
        press(),
        pull(second),
        second ? squat() : hinge(),
        arm(!second),
        shoulders(),
        core(),
        calves(),
      ];
    case "upper":
      return [
        press(),
        pull(second),
        pull(!second),
        arm(!second),
        arm(second),
        shoulders(),
        S(["Front delts"], "secondary", "Compound", ["Vertical press"]),
        core(),
      ];
    case "lower":
      return [
        second ? hinge() : squat(),
        second ? squat() : hinge(),
        curl(),
        S(["Glutes"], "secondary", "Compound", ["Hip thrust", "Lunge and step"]),
        calves(),
        core(),
      ];
    case "push":
      return [
        press(),
        S(["Front delts"], "secondary", "Compound", ["Vertical press"], true),
        arm(false),
        shoulders(),
        S(["Chest"], "iso", "Isolation", ["Chest fly"]),
        core(),
      ];
    case "pull":
      return [
        pull(second),
        pull(!second),
        arm(true),
        S(["Rear delts"], "iso", "Isolation"),
        core(),
      ];
    case "arms_shoulders":
      return [
        S(["Front delts"], "secondary", "Compound", ["Vertical press"], true),
        shoulders(),
        arm(!second),
        arm(second),
        S(["Rear delts"], "iso", "Isolation"),
        core(),
      ];
    case "squat":
      return [{ ...squat(), role: "main_strength" }, pull(), curl(), calves(), core()];
    case "bench":
      return [{ ...press(), role: "main_strength" }, pull(true), shoulders(), arm(false), core()];
    case "deadlift":
      return [
        { ...hinge(), role: "main_strength" },
        press(),
        pull(),
        S(["Glutes"], "secondary", "Compound", ["Hip thrust", "Lunge and step"]),
        arm(true),
      ];
    case "upper_assist":
      return [press(), pull(true), shoulders(), arm(!second), arm(second), core()];
    default:
      return [];
  }
};
const relevantPriority = (focus: string, muscles: string[]) => {
  if (focus === "full") return true;
  const lower = ["Quads", "Hamstrings", "Glutes", "Calves"];
  if (["lower", "squat", "deadlift"].includes(focus))
    return muscles.some((muscle) => lower.includes(muscle) || muscle === "Abs/core");
  if (focus === "push" || focus === "bench")
    return muscles.some((muscle) =>
      ["Chest", "Front delts", "Side delts", "Triceps", "Abs/core"].includes(muscle)
    );
  if (focus === "pull")
    return muscles.some((muscle) =>
      ["Lats", "Upper back", "Rear delts", "Biceps", "Abs/core"].includes(muscle)
    );
  return muscles.some((muscle) => !lower.includes(muscle));
};
export const slotsFor = (dayName: string, profile: any): Slot[] => {
  const focus = focusFor(dayName),
    variant = dayVariant(dayName);
  const slots = focusSlots(focus, variant);
  if (/strength/i.test(dayName) && slots[0]) slots[0] = { ...slots[0], role: "main_strength" };
  const requested = [
    ...new Set<string>(
      (profile.priorityMuscles || []).filter((name: string) => PRIORITY_MAP[name])
    ),
  ];
  const priorities = requested.filter((name) => relevantPriority(focus, PRIORITY_MAP[name]));
  const rotated = priorities.length
    ? [
        ...priorities.slice(variant % priorities.length),
        ...priorities.slice(0, variant % priorities.length),
      ]
    : [];
  const prioritySlots = rotated.map((name) => {
    const muscles = PRIORITY_MAP[name].filter((muscle) => relevantPriority(focus, [muscle]));
    const muscle = muscles[variant % muscles.length];
    const glutes = muscle === "Glutes";
    return {
      ...S(
        [muscle],
        glutes ? "secondary" : "iso",
        ["Lats", "Upper back", "Abs/core", "Glutes"].includes(muscle) ? undefined : "Isolation",
        glutes
          ? ["Hip thrust", "Lunge and step", "Hip hinge"]
          : muscle === "Hamstrings"
            ? ["Knee flexion", "Hip hinge"]
            : undefined
      ),
      priority: true,
      priorityMuscle: name,
    };
  });
  // Reserve main movement coverage, then priorities before general accessories.
  const essentials = slots.filter((slot) => slot.essential);
  const accessories = slots.filter(
    (slot) =>
      !slot.essential &&
      !prioritySlots.some(
        (priority) => slot.muscles.length === 1 && priority.muscles.includes(slot.muscles[0])
      )
  );
  const prefix = Math.min(3, essentials.length);
  return [
    ...essentials.slice(0, prefix),
    ...prioritySlots,
    ...essentials.slice(prefix),
    ...accessories,
  ];
};
export const targetMusclesFor = (dayName: string): string[] =>
  (
    ({
      full: ["Chest", "Back", "Shoulders", "Legs"],
      upper: ["Chest", "Back", "Shoulders", "Arms"],
      lower: ["Quads", "Hamstrings", "Glutes", "Calves"],
      push: ["Chest", "Shoulders", "Triceps"],
      pull: ["Back", "Biceps"],
      arms_shoulders: ["Shoulders", "Arms"],
      squat: ["Quads", "Back", "Hamstrings"],
      bench: ["Chest", "Back", "Triceps"],
      deadlift: ["Hamstrings", "Back", "Chest"],
      upper_assist: ["Chest", "Back", "Arms"],
    }) as Record<string, string[]>
  )[focusFor(dayName)] || [];
export interface ProgramCandidate {
  key: string;
  name: string;
  dayNames: string[];
  score: number;
}
export interface ProgramOption extends ProgramCandidate {
  why: string;
}

const recoveryGroups = (name: string): string[] =>
  (
    ({
      full: ["push", "pull", "legs"],
      upper: ["push", "pull"],
      lower: ["legs"],
      push: ["push"],
      pull: ["pull"],
      arms_shoulders: ["push", "pull"],
      squat: ["legs", "pull"],
      bench: ["push", "pull"],
      deadlift: ["legs", "push", "pull"],
      upper_assist: ["push", "pull"],
    }) as Record<string, string[]>
  )[focusFor(name)] || [];
const overlapCost = (names: string[], weekdays: number[]): number => {
  let cost = 0;
  for (let i = 0; i < names.length; i++) {
    const next = (i + 1) % names.length;
    const gap = (weekdays[next] - weekdays[i] + 7) % 7;
    if (gap !== 1) continue;
    cost +=
      recoveryGroups(names[i]).filter((group) => recoveryGroups(names[next]).includes(group))
        .length * 7;
  }
  return cost;
};
const arrangeDays = (names: string[], weekdays: number[]): { names: string[]; penalty: number } => {
  let best = [...names],
    penalty = overlapCost(best, weekdays);
  const visit = (chosen: string[], left: string[]) => {
    if (!left.length) {
      const score = overlapCost(chosen, weekdays);
      if (score < penalty) {
        penalty = score;
        best = chosen;
      }
      return;
    }
    left.forEach((name, index) =>
      visit(
        [...chosen, name],
        left.filter((_, i) => i !== index)
      )
    );
  };
  if (penalty) visit([], names);
  return { names: best, penalty };
};
export const scoreProgramStructures = (
  profile: any
): { best: ProgramOption; options: ProgramOption[] } => {
  const weekdays = orderedTrainingDays(profile);
  const days = Math.min(6, Math.max(2, weekdays.length || 3));
  const goal = goalKey(profile.fitnessGoal),
    exp = profile.experienceLevel || "beginner",
    len = +profile.sessionLength || 60;
  const prios: string[] = (profile.priorityMuscles || []).filter(
    (name: string) => PRIORITY_MAP[name]
  );
  const eq = normalizeEquipmentPreferences(profile.equipment);
  const bodyweightOnly = !eq.length || eq.every((item) => /^bodyweight(?: only)?$/i.test(item));
  const spec = prios.some((name) => ["Glutes", "Quads", "Hamstrings", "Calves"].includes(name))
    ? "Lower Focus"
    : prios.some((name) => ["Arms", "Shoulders"].includes(name))
      ? "Shoulders + Arms"
      : "Upper Focus";
  const candidates: ProgramCandidate[] = [];
  const add = (key: string, name: string, dayNames: string[], score: number) =>
    candidates.push({ key, name, dayNames, score });
  if (days <= 4 || bodyweightOnly)
    add(
      "full_body",
      "Full Body",
      Array.from({ length: days }, (_, i) => "Full Body " + String.fromCharCode(65 + i)),
      66 +
        (exp === "beginner" ? 22 : 0) +
        (goal === "strength" && days <= 3 ? 28 : 0) +
        (len <= 45 ? 10 : 0) +
        (goal === "general" || goal === "fat_loss" ? 8 : 0)
    );
  if (days === 4)
    add(
      "upper_lower",
      "Upper / Lower",
      ["Upper A", "Lower A", "Upper B", "Lower B"],
      88 + (exp !== "beginner" ? 6 : 0)
    );
  if (days === 3 && !bodyweightOnly)
    add(
      "ppl",
      "Push / Pull / Legs",
      ["Push", "Pull", "Legs"],
      62 + (goal === "muscle" && exp !== "beginner" ? 4 : 0)
    );
  if (days === 6 && !bodyweightOnly)
    add(
      "ppl2",
      "Push / Pull / Legs ×2",
      ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
      84 + (exp !== "beginner" && goal === "muscle" ? 10 : 0)
    );
  if (days === 6)
    add(
      "upper_lower",
      "Upper / Lower ×3",
      ["Upper A", "Lower A", "Upper B", "Lower B", "Upper C", "Lower C"],
      86 + (exp === "beginner" ? 8 : 0)
    );
  if (days === 5)
    add(
      "upper_lower_spec",
      "Upper / Lower + " + spec,
      ["Upper A", "Lower A", "Upper B", "Lower B", spec],
      86 + (prios.length ? 8 : 0)
    );
  if (days === 4 && goal === "muscle_strength")
    add(
      "powerbuilding",
      "Strength + Muscle",
      ["Upper Strength", "Lower Strength", "Upper Hypertrophy", "Lower Hypertrophy"],
      92 + (exp !== "beginner" ? 8 : -12)
    );
  if (goal === "strength" && days >= 3 && days <= 4 && !bodyweightOnly && len >= 45)
    add(
      "strength_focus",
      "Strength Focus",
      days === 4
        ? ["Squat Focus", "Bench Focus", "Deadlift & Pull", "Upper Assistance"]
        : ["Squat Focus", "Bench Focus", "Deadlift & Pull"],
      exp === "beginner" ? 65 : 90
    );
  const goalText = {
    muscle: "muscle growth",
    muscle_strength: "muscle and strength",
    strength: "strength",
    fat_loss: "maintaining muscle while losing fat",
    general: "general fitness",
  }[goal];
  const options = candidates
    .map((candidate) => {
      const ordered = arrangeDays(candidate.dayNames, weekdays);
      const description =
        candidate.key === "full_body"
          ? "Each session combines lower-body, pushing and available pulling movements."
          : candidate.key === "strength_focus"
            ? "Main-lift practice is paired with supporting work and longer rests."
            : candidate.key === "upper_lower_spec"
              ? "Upper and lower sessions provide a base, with an additional focus session."
              : "Sessions divide movement groups to balance training and recovery.";
      return {
        ...candidate,
        dayNames: ordered.names,
        score: candidate.score - ordered.penalty,
        why:
          "A " +
          days +
          "-day starting plan for " +
          goalText +
          ", using your selected weekdays and available equipment. " +
          description +
          (prios.length
            ? " Priority work for " +
              prios.join(", ") +
              " is fitted around the main movements and your session time."
            : "") +
          (ordered.penalty
            ? " Your available days include close-together sessions; use the suggested manageable starting volume and adjust if recovery is difficult."
            : "") +
          " Progress comes from consistent practice and adjusting the plan as you learn what works for you.",
      };
    })
    .sort((a, b) => b.score - a.score);
  return { best: options[0], options };
};
