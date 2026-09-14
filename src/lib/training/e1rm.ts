// Deterministic strength math. No AI.
export const epley = (weight: number | string, reps: number | string): number =>
  Number.isFinite(+weight) && +weight > 0 && Number.isInteger(+reps) && +reps >= 1 && +reps <= 12
    ? +weight * (+reps === 1 ? 1 : 1 + +reps / 30)
    : 0;
export const roundLoad = (w: number): number => Math.max(0, Math.round(w / 5) * 5);

// Progressive overload suggestion from the most recent completed sets of an exercise.
export interface SetRow {
  reps: any;
  weight: any;
  completed?: boolean;
  setType?: string;
  rir?: any;
  exerciseName: string;
  exerciseId?: any;
  [key: string]: any;
}

export interface ProgressionSuggestion {
  weight: number;
  note: string;
}

export const suggestProgression = (
  previousSets: SetRow[] | null | undefined,
  repMin = 6,
  repMax = 10
): ProgressionSuggestion | null => {
  const done = (previousSets || []).filter(
    (s) =>
      s.completed !== false &&
      +s.reps > 0 &&
      Number.isFinite(+s.weight) &&
      (s.setType || "working") === "working"
  );
  if (!done.length) return null;
  const top = Math.max(...done.map((s) => +s.weight || 0));
  const atTop = done.filter((s) => (+s.weight || 0) === top);
  const worstReps = Math.min(...atTop.map((s) => +s.reps));
  const comfortable = atTop.every((s) => s.rir == null || +s.rir >= 1);
  if (
    top > 0 &&
    atTop.length >= 2 &&
    atTop.length === done.length &&
    worstReps >= repMax &&
    comfortable
  )
    return {
      weight: roundLoad(top + 5),
      note: "Every working set reached the top of the range. Try +5 lb if form stays controlled.",
    };
  if (worstReps < repMin)
    return { weight: top, note: "Hold this weight and build back into the range." };
  return { weight: top, note: `Try +1 total rep at ${top} lb.` };
};

// Detect PRs from this session's completed rows vs existing PersonalRecord list.
// Returns [{exerciseName, exerciseId, type, value, weight, reps, existingId, previous}]
export interface DetectedPR {
  exerciseName: string;
  exerciseId: any;
  type: string;
  value: number;
  weight: number;
  reps: number;
  existingId: any;
  previous: any;
}

export const detectPRs = (completedRows: SetRow[], records: any[]): DetectedPR[] => {
  const prs: DetectedPR[] = [];
  const byExercise: Record<string, SetRow[]> = {};
  completedRows.forEach((r) => {
    if ((r.setType || "working") !== "working") return;
    (byExercise[r.exerciseName] = byExercise[r.exerciseName] || []).push(r);
  });
  Object.entries(byExercise).forEach(([name, rows]) => {
    const best = rows.reduce(
      (a, r) => (epley(+r.weight, +r.reps) > epley(+a.weight, +a.reps) ? r : a),
      rows[0]
    );
    const bestE1rm = Math.round(epley(+best.weight, +best.reps));
    const heaviest = rows.reduce((a, r) => Math.max(a, +r.weight || 0), 0);
    if (bestE1rm <= 0) return;
    const find = (type: string) =>
      records.find(
        (x) =>
          x.type === type &&
          (x.exerciseId && best.exerciseId
            ? x.exerciseId === best.exerciseId
            : x.exerciseName === name)
      );
    const e1rmRec = find("e1rm");
    if (!e1rmRec || bestE1rm > e1rmRec.value)
      prs.push({
        exerciseName: name,
        exerciseId: best.exerciseId,
        type: "e1rm",
        value: bestE1rm,
        weight: +best.weight,
        reps: +best.reps,
        existingId: e1rmRec?.id,
        previous: e1rmRec?.value,
      });
    const weightRec = find("weight");
    const heavyRow = rows.find((r) => +r.weight === heaviest);
    if (heaviest > 0 && (!weightRec || heaviest > weightRec.value))
      prs.push({
        exerciseName: name,
        exerciseId: best.exerciseId,
        type: "weight",
        value: heaviest,
        weight: heaviest,
        reps: +heavyRow!.reps,
        existingId: weightRec?.id,
        previous: weightRec?.value,
      });
  });
  return prs;
};
