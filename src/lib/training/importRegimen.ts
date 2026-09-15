import { base44 } from "@/api/base44Client";
import { normalizeExerciseName } from "../../../base44/shared/exerciseCatalog.js";
import { requireAiConsent } from "../../../base44/shared/aiConsent.js";

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const clean = (value?: string | null): string => normalizeExerciseName(value || "");
const score = (a?: string | null, b?: string | null): number => {
  const x = clean(a),
    y = clean(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.88;
  const left = new Set(x.split(" ")),
    right = y.split(" ");
  return right.filter((word) => left.has(word)).length / Math.max(left.size, right.length);
};
export interface RegimenExercise {
  key: string;
  importedName: string;
  exerciseName: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  primaryMuscle?: string;
  category?: string;
  equipment?: string;
  notes?: string;
  progressionNotes?: string;
  coachMandated?: boolean;
  exerciseId?: string;
  matchConfidence?: number;
  candidates?: any[];
  [key: string]: any;
}

export interface RegimenDay {
  key: string;
  name: string;
  weekday: number;
  coachMandated?: boolean;
  fixedSchedule?: boolean;
  exercises: RegimenExercise[];
  [key: string]: any;
}

export interface RegimenDraft {
  name: string;
  notes: string;
  days: RegimenDay[];
}

export interface RegimenMeta {
  sport: string;
  seasonPhase: string;
  coachProvided: boolean;
  athleteMode: string;
  structureLocked: boolean;
}

export interface SaveRegimenOptions {
  sourceType?: string;
  existingId?: string | null;
  duplicate?: boolean;
}

const shape = (raw: any): RegimenDraft => ({
  name: raw.name || "Imported Program",
  notes: raw.notes || "",
  days: (raw.days || []).slice(0, 7).map((day: any, index: number) => ({
    key: uid(),
    name: day.name || `Training Day ${index + 1}`,
    weekday: Number.isInteger(day.weekday) ? Math.min(6, Math.max(0, day.weekday)) : index,
    coachMandated: !!day.coachMandated,
    fixedSchedule: !!day.fixedSchedule,
    exercises: (day.exercises || []).map((exercise: any, order: number) => ({
      key: uid(),
      importedName: exercise.name || exercise.importedName || `Exercise ${order + 1}`,
      exerciseName: exercise.name || exercise.exerciseName || `Exercise ${order + 1}`,
      sets: Math.min(20, Math.max(1, +exercise.sets || 3)),
      repMin: Math.min(100, Math.max(1, +exercise.repMin || +exercise.reps || 8)),
      repMax: Math.min(
        100,
        Math.max(1, +exercise.repMax || +exercise.repMin || +exercise.reps || 12)
      ),
      restSeconds: Math.min(900, Math.max(15, +exercise.restSeconds || 120)),
      primaryMuscle: exercise.primaryMuscle || "",
      category: exercise.category || "",
      equipment: exercise.equipment || "",
      notes: exercise.notes || "",
      progressionNotes: exercise.progressionNotes || "",
      coachMandated: !!exercise.coachMandated,
    })),
  })),
});

export const blankRegimen = () =>
  shape({
    name: "My Program",
    days: [
      {
        name: "Day 1",
        weekday: 0,
        exercises: [{ name: "First exercise", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 }],
      },
    ],
  });

export function matchRegimen(raw: any, catalog: any[]): RegimenDraft {
  const draft = shape(raw);
  return {
    ...draft,
    days: draft.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => {
        const candidates = catalog
          .map((item: any) => ({
            ...item,
            matchScore: Math.max(
              ...[item.name, ...(item.aliases || [])].map((name) =>
                score(exercise.exerciseName, name)
              )
            ),
          }))
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 4);
        const best = candidates[0],
          // Only unambiguous exact names/aliases are automatic. Variants require review.
          matched = best?.matchScore === 1 && candidates[1]?.matchScore !== 1;
        return {
          ...exercise,
          exerciseId: matched ? best.id : "",
          exerciseName: matched ? best.name : exercise.exerciseName,
          primaryMuscle: matched
            ? best.primaryMuscle
            : exercise.primaryMuscle || best?.primaryMuscle || "",
          category: matched ? best.category : exercise.category || "Imported",
          equipment: matched ? best.equipment : exercise.equipment || "Coach program",
          matchConfidence: Math.round((best?.matchScore || 0) * 100),
          candidates,
        };
      }),
    })),
  };
}

export async function parseRegimen({
  text,
  file,
  aiConsent,
  signal,
}: {
  text?: string;
  file?: File | null;
  aiConsent?: string;
  signal?: AbortSignal;
}) {
  const assertActive = () => {
    if (signal?.aborted) throw new DOMException("Import closed.", "AbortError");
  };
  assertActive();
  requireAiConsent({ aiConsent });
  if (text && text.length > 50000) throw new Error("Keep workout text under 50,000 characters.");
  if (file && file.size > 10 * 1024 * 1024) throw new Error("Choose a file smaller than 10 MB.");
  let fileUri: string | undefined;
  if (file) ({ file_uri: fileUri } = await base44.integrations.Core.UploadPrivateFile({ file }));
  // Uploads already sent cannot be recalled, but closing the feature prevents any later AI call.
  assertActive();
  const { data } = await base44.functions.invoke("parseWorkoutRegimen", {
    text,
    fileUri,
    aiConsent,
  });
  assertActive();
  return shape(data);
}

export async function loadImportedPlan(planId: string, catalog: any[]) {
  const plan: any = await base44.entities.WorkoutPlan.get(planId);
  const days = (await base44.entities.WorkoutDay.filter({ planId }))
    .filter((day: any) => !day.isRest)
    .sort((a: any, b: any) => a.weekday - b.weekday);
  const rows: any[] = days.length
    ? await base44.entities.WorkoutExercise.filter({
        workoutDayId: { $in: days.map((day) => day.id) },
      })
    : [];
  const raw = {
    name: plan.name,
    notes: plan.importNotes,
    days: days.map((day: any) => ({
      ...day,
      exercises: rows
        .filter((row) => row.workoutDayId === day.id)
        .sort((a, b) => a.order - b.order)
        .map((row) => ({ name: row.importedName || row.exerciseName, ...row })),
    })),
  };
  return {
    plan,
    draft: matchRegimen(raw, catalog),
    meta: {
      sport: plan.sport || "",
      seasonPhase: plan.seasonPhase || "not_applicable",
      coachProvided: !!plan.coachProvided,
      athleteMode: plan.athleteMode || "smart_progression",
      structureLocked: !!plan.structureLocked,
    },
  };
}

export async function saveImportedRegimen(
  draft: RegimenDraft,
  meta: RegimenMeta,
  { sourceType = "manual", existingId, duplicate = false }: SaveRegimenOptions = {}
) {
  if (!draft.name.trim()) throw new Error("Name your program before saving.");
  if (!draft.days.length) throw new Error("Add at least one training day.");
  if (new Set(draft.days.map((day) => day.weekday)).size !== draft.days.length)
    throw new Error("Each training day needs a different weekday.");
  if (draft.days.some((day) => !day.exercises.length))
    throw new Error("Every training day needs at least one exercise.");
  if (existingId && !duplicate) {
    const active = await base44.entities.WorkoutSession.filter({ status: "active" });
    if (active.some((session: any) => session.planId === existingId))
      throw new Error("Finish or discard the active workout before editing this plan.");
  }
  const payload = {
    name: duplicate ? `${draft.name.trim()} Copy` : draft.name.trim(),
    description: meta.coachProvided
      ? "Coach-provided regimen imported into LIMIT"
      : "Imported regimen",
    goal: "follow existing program",
    daysPerWeek: draft.days.length,
    programType: "imported",
    recommended: false,
    active: false,
    sourceType,
    sport: meta.sport || "",
    seasonPhase: meta.seasonPhase,
    coachProvided: meta.coachProvided,
    athleteMode: meta.athleteMode,
    structureLocked: meta.structureLocked,
    importNotes: draft.notes || "",
  };
  const plan = await base44.entities.WorkoutPlan.create(payload);
  const byWeekday = new Map<number, RegimenDay>(draft.days.map((day) => [day.weekday, day]));
  const dayRecords = Array.from({ length: 7 }, (_, weekday) => {
    const day = byWeekday.get(weekday);
    return {
      planId: plan.id,
      weekday,
      name: day?.name || "Rest",
      targetMuscles: [
        ...new Set((day?.exercises || []).map((item) => item.primaryMuscle).filter(Boolean)),
      ],
      isRest: !day,
      coachMandated: !!day?.coachMandated,
      fixedSchedule: !!day?.fixedSchedule,
    };
  });
  const created = await base44.entities.WorkoutDay.bulkCreate(dayRecords);
  const exerciseRows = created.flatMap((day: any) => {
    const source = byWeekday.get(day.weekday);
    return (source?.exercises || []).map((exercise, index) => ({
      workoutDayId: day.id,
      exerciseId: exercise.exerciseId || "",
      exerciseName: exercise.exerciseName.trim(),
      order: index + 1,
      sets: +exercise.sets,
      repMin: +exercise.repMin,
      repMax: +exercise.repMax,
      restSeconds: +exercise.restSeconds,
      primaryMuscle: exercise.primaryMuscle || "Other",
      category: exercise.category || "Imported",
      equipment: exercise.equipment || "Coach program",
      notes: exercise.notes || "",
      progressionNotes: exercise.progressionNotes || "",
      importedName: exercise.importedName || exercise.exerciseName,
      matchConfidence: +(exercise.matchConfidence ?? 0) || 0,
      coachMandated: !!exercise.coachMandated,
    }));
  });
  if (exerciseRows.length) await base44.entities.WorkoutExercise.bulkCreate(exerciseRows);
  const { data } = await base44.functions.invoke("workoutCommand", {
    action: "activatePlan",
    planId: plan.id,
  });
  return data.plan;
}
