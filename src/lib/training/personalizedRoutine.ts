import {
  dayVariant,
  exerciseBudget,
  goalKey,
  orderedTrainingDays,
  PRIORITY_MAP,
  scheme,
  slotsFor,
} from "@/lib/training/programEngine";
import { equipmentPool, selectExercise } from "@/lib/training/exerciseSelection";

export interface DayExercise {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  category: string;
  equipment: string;
  order: number;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes: string;
  progressionNotes: string;
}

const unilateral = (row: any) =>
  /single[ -]|one[ -]arm|alternating|split squat|lunge|step[ -]up|pallof|woodchop|wood chop|bird dog|dead bug|side bend|per side|each side|both sides/i.test(
    [row.exerciseName || row.name || "", row.notes || "", ...(row.instructions || [])].join(" ")
  );

// Planning estimate, not a timer: six minutes for preparation/warm-ups,
// a minute to change stations, controlled reps (both sides where applicable),
// and prescribed rest BETWEEN sets. Never shorten rest to fit more work.
export const estimateMinutes = (rows: any[]): number => {
  if (!rows.length) return 0;
  return Math.ceil(
    6 +
      rows.reduce((total, row) => {
        const sets = Math.max(1, Number(row.sets) || 3);
        const work = Math.max(45, (Number(row.repMax) || 12) * 3) * (unilateral(row) ? 2 : 1);
        return total + (60 + sets * work + (sets - 1) * (row.restSeconds ?? 120)) / 60;
      }, 0)
  );
};

export const sessionMinutes = (profile: any): number =>
  Math.min(90, Math.max(30, Number(profile.sessionLength) || 60));

export function buildDayExercises(dayName: string, profile: any, exercises: any[]): DayExercise[] {
  const experience = profile.experienceLevel || "beginner";
  const goal = goalKey(profile.fitnessGoal);
  const priorities = (profile.priorityMuscles || []).flatMap((p: string) => PRIORITY_MAP[p] || []);
  const allowed = equipmentPool(profile);
  const used = new Set<string>();
  const candidates: {
    row: DayExercise;
    targetSets: number;
    priority: boolean;
    focusSlot: boolean;
  }[] = [];
  for (const slot of slotsFor(dayName, profile)) {
    const ex = selectExercise(slot, exercises, used, allowed, dayVariant(dayName), experience);
    if (!ex?.id) continue;
    used.add(ex.id);
    const dose = scheme(goal, slot.role, experience);
    const priority = !!slot.priority || priorities.includes(ex.primaryMuscle);
    const bodyweight = ex.equipment === "Bodyweight";
    const perSide = unilateral(ex) ? " Reps are per side; complete both sides." : "";
    const guidance =
      "Choose a load or variation that leaves 2–3 clean reps in reserve. Rest longer if needed.";
    candidates.push({
      row: {
        exerciseId: ex.id,
        exerciseName: ex.name,
        primaryMuscle: ex.primaryMuscle,
        category: ex.category,
        equipment: ex.equipment,
        order: 0,
        sets: 2,
        repMin: bodyweight ? 8 : dose.repMin,
        repMax: bodyweight ? 15 : dose.repMax,
        restSeconds: dose.rest,
        notes: guidance + perSide,
        progressionNotes:
          "Build toward the top of the rep range with controlled form before adding a small amount of weight or a harder variation. Repeat or reduce when recovery is poor.",
      },
      // More available days should not automatically mean maximal daily volume.
      targetSets: Math.min(
        experience === "beginner" && orderedTrainingDays(profile).length >= 5 ? 2 : 4,
        dose.sets + (priority ? 1 : 0)
      ),
      priority,
      focusSlot: !!slot.priority,
    });
  }
  // slotsFor keeps the core patterns first and rotates priorities before
  // optional accessories, so short sessions do not silently drop the focus.
  const ranked = candidates;
  const selected: typeof candidates = [];
  const minutes = sessionMinutes(profile);
  const maxSets = experience === "beginner" ? 14 : experience === "advanced" ? 22 : 18;
  const maxExercises = Math.min(exerciseBudget(minutes), Math.floor(maxSets / 2));
  for (const candidate of ranked) {
    if (selected.length >= maxExercises) break;
    if (estimateMinutes([...selected.map((x) => x.row), candidate.row]) <= minutes)
      selected.push(candidate);
  }
  // Add working sets only after coverage is secured, priorities first. Do not
  // fill a long time allowance with unnecessary sets merely because it exists.
  const setOrder = [...selected].sort(
    (a, b) => Number(b.focusSlot) - Number(a.focusSlot) || Number(b.priority) - Number(a.priority)
  );
  const group = (muscle: string) => (["Lats", "Upper back"].includes(muscle) ? "Back" : muscle);
  const groupSets = (muscle: string) =>
    selected
      .filter((item) => group(item.row.primaryMuscle) === group(muscle))
      .reduce((sum, item) => sum + item.row.sets, 0);
  const maxGroupSets = experience === "beginner" ? 6 : 8;
  for (const candidate of setOrder) {
    while (
      candidate.row.sets < candidate.targetSets &&
      groupSets(candidate.row.primaryMuscle) < maxGroupSets &&
      selected.reduce((n, x) => n + x.row.sets, 0) < maxSets
    ) {
      candidate.row.sets++;
      if (estimateMinutes(selected.map((x) => x.row)) > minutes) {
        candidate.row.sets--;
        break;
      }
    }
  }
  return selected.map((candidate, i) => ({ ...candidate.row, order: i + 1 }));
}

export function routineCoverageNote(templates: DayExercise[][]): string {
  const muscles = new Set(templates.flat().map((row) => row.primaryMuscle));
  const gaps: string[] = [];
  if (!muscles.has("Lats") && !muscles.has("Upper back"))
    gaps.push(
      "Back training is limited by your equipment; add suitable pulling equipment in Profile to include rows or pulldowns."
    );
  if (!muscles.has("Hamstrings"))
    gaps.push("Direct hamstring work is limited by your equipment and time allowance.");
  return gaps.join(" ");
}
