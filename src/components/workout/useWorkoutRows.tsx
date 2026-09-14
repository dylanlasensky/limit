import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  writeDraft,
  validateSet,
  type EditableSetField,
  type WorkoutDraftState,
  type WorkoutSetRow,
} from "@/components/workout/workoutDraft";

type RowsUpdater = WorkoutSetRow[] | ((rows: WorkoutSetRow[]) => WorkoutSetRow[]);
export default function useWorkoutRows(state: WorkoutDraftState, storageKey?: string | null) {
  const [rows, setRows] = useState<WorkoutSetRow[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [syncError, setSyncError] = useState("");
  const [conflict, setConflict] = useState(false);
  const current = useRef<WorkoutSetRow[]>([]);
  const flight = useRef<Promise<boolean> | null>(null);
  const stateRef = useRef(state);
  const conflictRef = useRef(false);
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

  const flush = useCallback((): Promise<boolean> => {
    // Every caller awaits the same drain, including Finish pressed mid-save.
    if (flight.current) return flight.current;
    if (!stateRef.current.session || !navigator.onLine || conflictRef.current)
      return Promise.resolve(false);
    const sessionId = stateRef.current.session.id;
    const run = async () => {
      setSyncError("");
      try {
        // Read the latest queue after EVERY acknowledgement, not a stale snapshot.
        while (true) {
          const row = current.current.find((r) => r.pending && !r.removed);
          if (!row) return true;
          const validation = validateSet(row);
          if (validation) {
            setSyncError(validation);
            return false;
          }
          const sent = { ...row };
          setSavingIds(new Set([sent.key]));
          const { data } = await base44.functions.invoke("workoutCommand", {
            action: "saveSet",
            sessionId,
            row: sent,
          });
          if (!data?.set?.id || data.set.revision !== sent.operationId) {
            throw new Error("Invalid save acknowledgement.");
          }
          if (stateRef.current.session?.id !== sessionId) return false;
          commit((rs) =>
            rs.map((r) =>
              r.key !== sent.key
                ? r
                : {
                    ...r,
                    savedId: data.set.id,
                    revision: data.set.revision,
                    pending: r.operationId !== sent.operationId,
                  }
            )
          );
        }
      } catch (e: any) {
        const message = e?.response?.data?.error || e?.data?.error;
        // A conflict needs an explicit choice; never silently overwrite another device.
        if (
          (e?.status || e?.response?.status) === 409 &&
          /another screen|no longer active/i.test(message || "")
        ) {
          conflictRef.current = true;
          setConflict(true);
        }
        setSyncError(message || "Couldn’t sync. Keep this screen open or reconnect to retry.");
        return false;
      } finally {
        setSavingIds(new Set());
      }
    };
    flight.current = run().finally(() => {
      flight.current = null;
    });
    return flight.current;
  }, [commit]);

  useEffect(() => {
    const online = () => void flush();
    window.addEventListener("online", online);
    const timer = setInterval(() => {
      if (current.current.some((r) => r.pending)) void flush();
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
              pending: !!r.savedId || r.pending,
              operationId: crypto.randomUUID(),
            }
          : r
      )
    );
  const toggle = async (key: string): Promise<string | null> => {
    const row = current.current.find((r) => r.key === key);
    if (!row) return null;
    const error = validateSet(row);
    if (error) return error;
    commit((rs) =>
      rs.map((r) =>
        r.key === key
          ? {
              ...r,
              completed: !r.completed,
              pending: true,
              operationId: crypto.randomUUID(),
            }
          : r
      )
    );
    if (!navigator.onLine) {
      setSyncError("Offline. Keep this device’s draft until you reconnect.");
      return null;
    }
    await flush();
    return null;
  };
  const addSet = (we: string) =>
    commit((rs) => {
      const mine = rs.filter((r) => r.workoutExerciseId === we),
        last = mine.at(-1);
      const number = Math.max(0, ...mine.map((r) => r.setNumber)) + 1;
      if (!last || number > 30) return rs;
      return [
        ...rs,
        {
          ...last,
          key: we + ":" + number,
          setNumber: number,
          reps: "",
          rir: "",
          completed: false,
          savedId: null,
          pending: false,
          removed: false,
          revision: "",
          operationId: "",
        },
      ];
    });
  const removeSet = (key: string) =>
    commit((rs) =>
      rs.map((r) => (r.key === key && !r.savedId && !r.pending ? { ...r, removed: true } : r))
    );
  return {
    rows: rows.filter((r) => !r.removed),
    setRows: commit,
    savingIds,
    syncError,
    conflict,
    flush,
    edit,
    toggle,
    addSet,
    removeSet,
    current,
  };
}
