import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  writeDraft,
  type EditableSetField,
  type WorkoutDraftState,
  type WorkoutSetRow,
} from "@/components/workout/workoutDraft";
type RowsUpdater = WorkoutSetRow[] | ((rows: WorkoutSetRow[]) => WorkoutSetRow[]);
export default function useWorkoutRows(state: WorkoutDraftState, storageKey?: string | null) {
  const [rows, setRows] = useState<WorkoutSetRow[]>([]),
    [savingIds, setSavingIds] = useState<Set<string>>(new Set()),
    [syncError, setSyncError] = useState("");
  const current = useRef<WorkoutSetRow[]>([]),
    busy = useRef(false),
    stateRef = useRef(state);
  stateRef.current = state;
  const commit = useCallback(
    (next: RowsUpdater) => {
      const value = typeof next === "function" ? next(current.current) : next;
      current.current = value;
      setRows(value);
      if (storageKey && stateRef.current.session) {
        try {
          writeDraft(storageKey, stateRef.current, value);
        } catch {
          setSyncError(
            "Device storage is unavailable. Keep this screen open until all sets are synced."
          );
        }
      }
    },
    [storageKey]
  );
  const flush = useCallback(async () => {
    if (busy.current || !stateRef.current.session || !navigator.onLine) return false;
    busy.current = true;
    setSyncError("");
    try {
      for (const row of current.current.filter((r) => r.pending)) {
        setSavingIds(new Set([row.key]));
        const { data } = await base44.functions.invoke("workoutCommand", {
          action: "saveSet",
          sessionId: stateRef.current.session.id,
          row,
        });
        commit((rs) =>
          rs.map((r) =>
            r.key !== row.key
              ? r
              : {
                  ...r,
                  savedId: data.set.id,
                  revision: data.set.revision,
                  pending: r.operationId !== row.operationId,
                }
          )
        );
      }
      return true;
    } catch (e: any) {
      setSyncError(
        e?.response?.data?.error || "That set hasn’t synced. Your entries are saved on this device."
      );
      return false;
    } finally {
      busy.current = false;
      setSavingIds(new Set());
    }
  }, [commit]);
  useEffect(() => {
    const online = () => flush();
    window.addEventListener("online", online);
    const timer = setInterval(() => {
      if (current.current.some((r) => r.pending)) flush();
    }, 15000);
    return () => {
      window.removeEventListener("online", online);
      clearInterval(timer);
    };
  }, [flush]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (current.current.some((r) => r.pending)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const edit = (key: string, field: EditableSetField, value: string) =>
    commit((rs) =>
      rs.map((r) =>
        r.key === key
          ? {
              ...r,
              [field]: value,
              completed: false,
              pending: !!r.savedId,
              operationId: crypto.randomUUID(),
            }
          : r
      )
    );
  const toggle = async (key: string): Promise<string | null> => {
    const row = current.current.find((r) => r.key === key);
    if (!row) return null;
    if (
      row.weight === "" ||
      !Number.isFinite(+row.weight) ||
      +row.weight < 0 ||
      +row.weight > 2500 ||
      !Number.isInteger(+row.reps) ||
      +row.reps < 1 ||
      +row.reps > 100
    )
      return "Enter a valid weight and whole reps first.";
    commit((rs) =>
      rs.map((r) =>
        r.key === key
          ? { ...r, completed: !r.completed, pending: true, operationId: crypto.randomUUID() }
          : r
      )
    );
    if (!navigator.onLine) {
      setSyncError("Offline — saved on this device. Reconnect to sync.");
      return null;
    }
    await flush();
    return null;
  };
  const addSet = (we: string) =>
    commit((rs) => {
      const mine = rs.filter((r) => r.workoutExerciseId === we),
        last = mine.at(-1);
      if (!last || mine.length >= 30) return rs;
      const number = Math.max(...mine.map((r) => r.setNumber)) + 1;
      return [
        ...rs,
        {
          ...last,
          key: `${we}:${number}`,
          setNumber: number,
          reps: "",
          completed: false,
          savedId: null,
          pending: false,
          revision: "",
          operationId: "",
        },
      ];
    });
  const removeSet = (key: string) =>
    commit((rs) => rs.filter((r) => r.key !== key || r.savedId || r.pending));
  return {
    rows,
    setRows: commit,
    savingIds,
    syncError,
    flush,
    edit,
    toggle,
    addSet,
    removeSet,
    current,
  };
}
