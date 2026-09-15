import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listExercises } from "@/lib/training/exerciseLibrary";
import {
  blankRegimen,
  loadImportedPlan,
  matchRegimen,
  parseRegimen,
  saveImportedRegimen,
  type RegimenDay,
  type RegimenDraft,
  type RegimenExercise,
  type RegimenMeta,
} from "@/lib/training/importRegimen";

export type RegimenImportStage = "source" | "review" | "done" | (string & {});

export interface BeginRegimenInput {
  text?: string;
  file?: File | null;
  type: string;
  aiConsent?: string;
}

export default function useRegimenImport(planId?: string | null) {
  const parsing = useRef<AbortController>();
  useEffect(() => () => parsing.current?.abort(), []);
  const client = useQueryClient(),
    catalog = useQuery({
      queryKey: ["exercises"],
      queryFn: () => listExercises(),
      staleTime: 60000,
    }),
    [stage, setStage] = useState<RegimenImportStage>("source"),
    [draft, setDraft] = useState<RegimenDraft | undefined>(),
    [meta, setMeta] = useState<RegimenMeta>({
      sport: "",
      seasonPhase: "not_applicable",
      coachProvided: false,
      athleteMode: "smart_progression",
      structureLocked: false,
    }),
    [sourceType, setSourceType] = useState<string>("pasted_text"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!planId || !catalog.data) return;
    setBusy(true);
    loadImportedPlan(planId, catalog.data)
      .then((result) => {
        setDraft(result.draft);
        setMeta(result.meta);
        setSourceType(result.plan.sourceType || "manual");
        setStage("review");
      })
      .catch((e: any) => setError(e.message || "Couldn’t load this plan."))
      .finally(() => setBusy(false));
  }, [planId, catalog.data]);
  const begin = async ({ text, file, type, aiConsent }: BeginRegimenInput) => {
    parsing.current?.abort();
    const request = new AbortController();
    parsing.current = request;
    setBusy(true);
    setError("");
    try {
      if (!["manual", "pasted_text", "uploaded_file"].includes(type))
        throw new Error("Choose an import method.");
      const parsed =
        type === "manual"
          ? blankRegimen()
          : await parseRegimen({
              ...(type === "pasted_text" ? { text } : { file }),
              aiConsent,
              signal: request.signal,
            });
      if (request.signal.aborted) return;
      setDraft(matchRegimen(parsed, catalog.data || []));
      setSourceType(type);
      setStage("review");
    } catch (e: any) {
      if (request.signal.aborted) return;
      setError(e.message || "LIMIT couldn’t read that regimen. Try pasted text or another file.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  // Draft editors only run once a draft exists (review stage).
  const updateDraft = (fn: (value: RegimenDraft) => RegimenDraft) =>
    setDraft((value) => fn(value as RegimenDraft));
  const day = (index: number, patch: Partial<RegimenDay>) =>
      updateDraft((value) => ({
        ...value,
        days: value.days.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      })),
    exercise = (dayIndex: number, index: number, patch: Partial<RegimenExercise>) =>
      updateDraft((value) => ({
        ...value,
        days: value.days.map((item, i) =>
          i === dayIndex
            ? {
                ...item,
                exercises: item.exercises.map((row, j) =>
                  j === index ? { ...row, ...patch } : row
                ),
              }
            : item
        ),
      })),
    addDay = () =>
      updateDraft((value) => ({
        ...value,
        days: [
          ...value.days,
          {
            key: crypto.randomUUID(),
            name: `Day ${value.days.length + 1}`,
            weekday:
              [0, 1, 2, 3, 4, 5, 6].find(
                (number) => !value.days.some((item) => item.weekday === number)
              ) ?? 0,
            exercises: [],
          },
        ],
      })),
    removeDay = (index: number) =>
      updateDraft((value) => ({ ...value, days: value.days.filter((_, i) => i !== index) })),
    addExercise = (index: number) =>
      updateDraft((value) => ({
        ...value,
        days: value.days.map((item, i) =>
          i === index
            ? {
                ...item,
                exercises: [
                  ...item.exercises,
                  {
                    key: crypto.randomUUID(),
                    importedName: "New exercise",
                    exerciseName: "New exercise",
                    sets: 3,
                    repMin: 8,
                    repMax: 12,
                    restSeconds: 120,
                    candidates: [],
                  },
                ],
              }
            : item
        ),
      })),
    removeExercise = (dayIndex: number, index: number) =>
      updateDraft((value) => ({
        ...value,
        days: value.days.map((item, i) =>
          i === dayIndex
            ? { ...item, exercises: item.exercises.filter((_, j) => j !== index) }
            : item
        ),
      }));
  const save = async (duplicate?: boolean) => {
    setBusy(true);
    setError("");
    try {
      await saveImportedRegimen(draft!, meta, { sourceType, existingId: planId, duplicate });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["activePlan"] }),
        client.invalidateQueries({ queryKey: ["workoutExercises"] }),
      ]);
      setStage("done");
    } catch (e: any) {
      setError(e.message || "Couldn’t save this program. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return {
    stage,
    setStage,
    draft,
    setDraft,
    meta,
    setMeta,
    busy: busy || catalog.isLoading,
    error,
    begin,
    day,
    exercise,
    addDay,
    removeDay,
    addExercise,
    removeExercise,
    save,
    catalog: catalog.data || [],
    editing: !!planId,
  };
}
