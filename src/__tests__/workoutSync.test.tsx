import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useWorkoutRows from "@/components/workout/useWorkoutRows";
import type { WorkoutSetRow } from "@/components/workout/workoutDraft";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/api/base44Client", () => ({ base44: { functions: { invoke } } }));
const row = (key: string): WorkoutSetRow => ({
  key,
  workoutExerciseId: "we",
  exerciseId: "e",
  exerciseName: "Squat",
  primaryMuscle: "Quads",
  setNumber: Number(key),
  weight: "100",
  reps: "5",
  rir: "",
  completed: true,
  savedId: null,
  revision: "",
  pending: true,
  operationId: "op-" + key,
});
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
describe("serialized set sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });
  it("Finish waits for a running save and drains newly queued rows", async () => {
    const first = deferred();
    invoke.mockReturnValueOnce(first.promise).mockImplementation(async (_name, input) => ({
      data: { set: { id: "saved-2", revision: input.row.operationId } },
    }));
    const { result } = renderHook(() => useWorkoutRows({ session: { id: "session" } }, "draft"));
    act(() => result.current.setRows([row("1")]));
    let saving!: Promise<boolean>, finishing!: Promise<boolean>;
    act(() => {
      saving = result.current.flush();
    });
    act(() => {
      result.current.setRows((rs) => [...rs, row("2")]);
      finishing = result.current.flush();
    });
    expect(saving).toBe(finishing);
    await act(async () => {
      first.resolve({ data: { set: { id: "saved-1", revision: "op-1" } } });
      expect(await finishing).toBe(true);
    });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.current.rows.every((r) => !r.pending)).toBe(true);
  });
  it("saves a mid-flight edit after acknowledgement using the new revision", async () => {
    const first = deferred();
    invoke.mockReturnValueOnce(first.promise).mockImplementation(async (_n, input) => ({
      data: { set: { id: "s", revision: input.row.operationId } },
    }));
    const { result } = renderHook(() => useWorkoutRows({ session: { id: "session" } }, "draft"));
    act(() => result.current.setRows([row("1")]));
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.flush();
    });
    act(() => result.current.edit("1", "weight", "115"));
    await act(async () => {
      first.resolve({ data: { set: { id: "s", revision: "op-1" } } });
      await saving;
    });
    expect(invoke.mock.calls[1][1].row).toMatchObject({
      weight: "115",
      revision: "op-1",
      completed: false,
    });
    expect(result.current.rows[0].pending).toBe(false);
  });
  it("retains unsynced work after a failed request", async () => {
    invoke.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useWorkoutRows({ session: { id: "session" } }, "draft"));
    act(() => result.current.setRows([row("1")]));
    await act(async () => {
      expect(await result.current.flush()).toBe(false);
    });
    expect(result.current.rows[0].pending).toBe(true);
    expect(JSON.parse(localStorage.getItem("draft")!).rows[0].weight).toBe("100");
  });
  it("does not auto-overwrite a conflict", async () => {
    invoke.mockRejectedValue({
      response: { status: 409, data: { error: "This set changed on another screen." } },
    });
    const { result } = renderHook(() => useWorkoutRows({ session: { id: "session" } }));
    act(() => result.current.setRows([row("1")]));
    await act(async () => {
      await result.current.flush();
      await result.current.flush();
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.current.conflict).toBe(true);
  });
  it("never sends an invalid or offline row", async () => {
    const { result } = renderHook(() => useWorkoutRows({ session: { id: "session" } }));
    act(() => result.current.setRows([{ ...row("1"), reps: "" }]));
    await act(async () => {
      expect(await result.current.flush()).toBe(false);
    });
    Object.defineProperty(navigator, "onLine", { value: false });
    await act(async () => {
      expect(await result.current.flush()).toBe(false);
    });
    expect(invoke).not.toHaveBeenCalled();
  });
  it("reuses a removed unsaved slot after reaching 30 sets", () => {
    const { result } = renderHook(() => useWorkoutRows({ session: { id: "session" } }, "draft"));
    act(() =>
      result.current.setRows([{ ...row("1"), key: "we:1", savedId: "saved-1", pending: false }])
    );
    act(() => {
      for (let number = 2; number <= 30; number++) result.current.addSet("we");
    });
    const original = result.current.current.current;
    expect(result.current.rows).toHaveLength(30);
    act(() => result.current.removeSet("we:17"));
    expect(result.current.rows).toHaveLength(29);
    act(() => result.current.addSet("we"));
    expect(result.current.rows).toHaveLength(30);
    expect(result.current.rows.map((r) => r.key)).toEqual(original.map((r) => r.key));
    expect(result.current.rows[16]).toMatchObject({
      key: "we:17",
      setNumber: 17,
      reps: "",
      completed: false,
      savedId: null,
      pending: false,
      removed: false,
    });
    expect(result.current.rows.filter((r) => r.key !== "we:17")).toEqual(
      original.filter((r) => r.key !== "we:17")
    );
    expect(JSON.parse(localStorage.getItem("draft")!).rows).toHaveLength(30);
    expect(invoke).not.toHaveBeenCalled();
  });
  it.each([
    { savedId: "saved-30", pending: false },
    { savedId: null, pending: true },
  ])("does not reuse a removed saved or pending slot: %j", (protectedState) => {
    const { result } = renderHook(() => useWorkoutRows({ session: { id: "session" } }));
    const protectedRow = { ...row("30"), removed: true, ...protectedState };
    act(() => result.current.setRows([row("1"), protectedRow]));
    act(() => result.current.addSet("we"));
    expect(result.current.current.current).toEqual([row("1"), protectedRow]);
  });
});
