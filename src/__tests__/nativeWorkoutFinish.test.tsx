import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  command: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "day" }),
  Redirect: () => null,
  router: { replace: api.replace, back: vi.fn() },
}));
vi.mock("expo-crypto", () => ({ randomUUID: () => crypto.randomUUID() }));
vi.mock("../../apps/mobile/node_modules/expo-crypto", () => ({
  randomUUID: () => crypto.randomUUID(),
}));
vi.mock("react-native", () => ({
  Text: ({
    children,
    accessibilityRole,
  }: React.PropsWithChildren<{ accessibilityRole?: string }>) => (
    <span role={accessibilityRole}>{children}</span>
  ),
  View: "div",
}));
vi.mock("../../apps/mobile/src/media-guide", () => ({ MediaGuide: () => null }));
vi.mock("../../apps/mobile/src/ui", () => ({
  Page: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Title: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  Copy: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  Input: ({
    label,
    value,
    editable = true,
    onChangeText,
  }: {
    label: string;
    value: string;
    editable?: boolean;
    onChangeText: (value: string) => void;
  }) => (
    <input
      aria-label={label}
      value={value}
      disabled={!editable}
      onChange={(event) => onChangeText(event.target.value)}
    />
  ),
  Action: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {label}
    </button>
  ),
  styles: { text: {} },
}));
vi.mock("../../apps/mobile/src/lib/api", () => ({
  auth: { useSession: () => ({ data: { user: { id: "owner" } }, isPending: false }) },
  command: api.command,
  list: api.list,
}));
vi.mock("../../apps/mobile/src/lib/drafts", () => ({
  loadDraft: api.load,
  saveDraft: api.save,
  removeDraft: api.remove,
}));

import Workout from "../../apps/mobile/src/app/workout/[id]";

const metadata = {
  ownerId: "owner",
  created_by_id: "owner",
  created_date: "2026-10-12",
  updated_date: "2026-10-12",
};
const session = { ...metadata, id: "session", name: "Today", date: "2026-10-12", status: "active" };
const sets = [1, 2].map((setNumber) => ({
  ...metadata,
  id: `set-${setNumber}`,
  workoutSessionId: "session",
  workoutExerciseId: "lift",
  exerciseId: "squat",
  exerciseName: "Squat",
  setNumber,
  weight: 20,
  reps: 8,
  completed: true,
  revision: `revision-${setNumber}`,
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.load.mockReturnValue(null);
  api.list.mockImplementation(async (name) =>
    name === "WorkoutExercise"
      ? [{ id: "lift", exerciseId: "squat", exerciseName: "Squat", sets: 2 }]
      : name === "ExerciseSet"
        ? sets
        : []
  );
});
afterEach(cleanup);

describe("native Finish preserves the submitted snapshot", () => {
  it("locks edits through a delayed set save and the final commit", async () => {
    const saving = deferred<object>(),
      finishing = deferred<object>();
    api.command.mockImplementation((body) =>
      body.action === "start"
        ? Promise.resolve({ session })
        : body.action === "saveSet"
          ? saving.promise
          : finishing.promise
    );
    render(<Workout />);
    const weights = await screen.findAllByLabelText("Weight");
    fireEvent.change(weights[1], { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Finish workout" }));
    await waitFor(() =>
      expect(api.command).toHaveBeenCalledWith(expect.objectContaining({ action: "saveSet" }))
    );
    expect(weights[0]).toBeDisabled();
    expect(weights[1]).toBeDisabled();
    // Even a queued native change event must not mutate the committed snapshot.
    fireEvent.change(weights[0], { target: { value: "99" } });
    await act(async () =>
      saving.resolve({ set: { ...sets[1], weight: 25, revision: "saved-25" } })
    );
    await waitFor(() =>
      expect(api.command).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "finish",
          expectedSets: [
            { id: "set-1", revision: "revision-1" },
            { id: "set-2", revision: "saved-25" },
          ],
        })
      )
    );
    expect(weights[0]).toBeDisabled();
    expect(api.remove).not.toHaveBeenCalled();
    expect(
      api.save.mock.calls.at(-1)?.[2].rows.map((row: { weight: string }) => row.weight)
    ).toEqual(["20", "25"]);
    await act(async () => finishing.resolve({ session: { ...session, status: "completed" } }));
    expect(api.remove).toHaveBeenCalledWith("owner", "owner:day");
  });

  it("keeps the draft and unlocks edits when saving fails", async () => {
    const saving = deferred<object>();
    api.command.mockImplementation((body) =>
      body.action === "start" ? Promise.resolve({ session }) : saving.promise
    );
    render(<Workout />);
    const weights = await screen.findAllByLabelText("Weight");
    fireEvent.change(weights[1], { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Finish workout" }));
    await act(async () => saving.reject(new Error("Connection lost")));
    expect(await screen.findByText("Connection lost")).toBeInTheDocument();
    expect(weights[1]).toBeEnabled();
    expect(api.remove).not.toHaveBeenCalled();
    expect(api.command.mock.calls.some(([body]) => body.action === "finish")).toBe(false);
    expect(api.save.mock.calls.at(-1)?.[2].rows[1]).toMatchObject({ pending: true, weight: "25" });
  });
});

it("shows retained conflict values and requires explicit discard before finishing saved sets", async () => {
  const local = {
    workoutExerciseId: "lift",
    exerciseId: "squat",
    setNumber: 1,
    weight: "0",
    reps: "17",
    rir: "3",
    completed: true,
    operationId: "local-op",
    revision: "outdated-revision",
    pending: true,
  };
  api.load.mockReturnValue({
    session,
    exercises: [{ id: "lift", exerciseId: "squat", exerciseName: "Squat", sets: 2 }],
    catalog: [],
    rows: [],
    excludedRows: [local],
    index: 0,
    paused: false,
    pausedAt: null,
    pausedMs: 0,
    restUntil: null,
  });
  api.command.mockImplementation(async (body) =>
    body.action === "start" ? { session } : { ok: true }
  );
  render(<Workout />);
  await waitFor(() =>
    expect(api.save).toHaveBeenCalledWith(
      "owner",
      "owner:day",
      expect.objectContaining({ excludedRows: [local] })
    )
  );
  expect(screen.getByText("Review retained sets")).toBeVisible();
  expect(screen.getByText(/Set 1: 17 reps.*0 lb.*3 reps left/)).toBeVisible();
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("8");
  expect(screen.getByRole("button", { name: "Finish workout" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Discard retained local sets" }));
  expect(screen.queryByText("Review retained sets")).not.toBeInTheDocument();
  expect(api.save).toHaveBeenLastCalledWith(
    "owner",
    "owner:day",
    expect.objectContaining({ excludedRows: [] })
  );
  fireEvent.click(screen.getByRole("button", { name: "Finish workout" }));
  await waitFor(() =>
    expect(api.command).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "finish",
        expectedSets: sets.map((set) => ({ id: set.id, revision: set.revision })),
      })
    )
  );
  expect(api.command.mock.calls.some(([body]) => body.action === "saveSet")).toBe(false);
});

it("marks edited incomplete inputs as local intent without automatically saving them", async () => {
  api.list.mockImplementation(async (name) =>
    name === "WorkoutExercise"
      ? [{ id: "lift", exerciseId: "squat", exerciseName: "Squat", sets: 2 }]
      : name === "ExerciseSet"
        ? sets.map((set) => ({ ...set, completed: false }))
        : []
  );
  api.command.mockResolvedValue({ session });
  render(<Workout />);
  const inputs = await screen.findAllByLabelText("Repetitions");
  fireEvent.change(inputs[0], { target: { value: "17" } });
  expect(api.save).toHaveBeenLastCalledWith(
    "owner",
    "owner:day",
    expect.objectContaining({
      rows: expect.arrayContaining([
        expect.objectContaining({
          reps: "17",
          draftEdited: true,
          pending: false,
          completed: false,
        }),
      ]),
    })
  );
  expect(api.command.mock.calls.some(([body]) => body.action === "saveSet")).toBe(false);
});
