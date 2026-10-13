import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  owner: "owner",
  day: "day",
  command: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: api.day }),
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
  auth: { useSession: () => ({ data: { user: { id: api.owner } }, isPending: false }) },
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
  api.day = "day";
  api.owner = "owner";
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

it("preserves input entered while a cached workout refresh is pending", async () => {
  const loading = deferred<object>();
  api.load.mockReturnValue({
    session,
    exercises: [{ id: "lift", exerciseId: "squat", exerciseName: "Squat", sets: 2 }],
    catalog: [],
    rows: sets.map((set) => ({
      workoutExerciseId: "lift",
      exerciseId: "squat",
      setNumber: set.setNumber,
      weight: "20",
      reps: "8",
      rir: "",
      completed: true,
      operationId: "cached-" + set.setNumber,
      revision: set.revision,
      savedId: set.id,
      pending: false,
      draftEdited: false,
    })),
    excludedRows: [],
    index: 0,
    paused: false,
    pausedAt: null,
    pausedMs: 0,
    restUntil: null,
  });
  api.command.mockImplementation(() => loading.promise);
  render(<Workout />);
  const reps = await screen.findAllByLabelText("Repetitions");
  fireEvent.change(reps[0], { target: { value: "12" } });
  expect(reps[0]).toHaveValue("12");
  expect(api.save.mock.calls.at(-1)?.[2].rows[0].reps).toBe("12");
  await act(async () => loading.resolve({ session }));
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(3));
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("12");
  expect(api.save.mock.calls.at(-1)?.[2].rows[0].reps).toBe("12");
});

function cachedWorkout() {
  return {
    session,
    exercises: [{ id: "lift", exerciseId: "squat", exerciseName: "Squat", sets: 2 }],
    catalog: [],
    rows: sets.map((set) => ({
      workoutExerciseId: "lift",
      exerciseId: "squat",
      setNumber: set.setNumber,
      weight: "20",
      reps: "8",
      rir: "",
      completed: true,
      operationId: "cached-" + set.setNumber,
      revision: set.revision,
      savedId: set.id,
      pending: false,
      draftEdited: false,
    })),
    excludedRows: [],
    index: 0,
    paused: false,
    pausedAt: null,
    pausedMs: 0,
    restUntil: null,
  };
}

it("retains new edits as conflicts when delayed set lookup returns a newer remote revision", async () => {
  const loadingSets = deferred<object[]>();
  api.load.mockReturnValue(cachedWorkout());
  api.command.mockResolvedValue({ session });
  api.list.mockImplementation((name) =>
    name === "WorkoutExercise"
      ? Promise.resolve(cachedWorkout().exercises)
      : name === "ExerciseSet"
        ? loadingSets.promise
        : Promise.resolve([])
  );
  render(<Workout />);
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(3));
  fireEvent.change(screen.getAllByLabelText("Repetitions")[0], { target: { value: "12" } });
  await act(async () =>
    loadingSets.resolve([{ ...sets[0], reps: 9, revision: "remote-new" }, sets[1]])
  );
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("9");
  expect(screen.getByText(/Set 1: 12 reps/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Finish workout" })).toBeDisabled();
  expect(api.save.mock.calls.at(-1)?.[2].excludedRows[0]).toMatchObject({
    reps: "12",
    pending: true,
  });
});

it("keeps a pause made while refreshing and defers network mutations until refresh settles", async () => {
  const loading = deferred<object>();
  api.load.mockReturnValue(cachedWorkout());
  api.command.mockImplementation(() => loading.promise);
  render(<Workout />);
  const reps = await screen.findAllByLabelText("Repetitions");
  expect(reps[0]).toBeEnabled();
  expect(screen.getByRole("button", { name: "Retry sync" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Finish workout" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Pause workout" }));
  const pausedAt = api.save.mock.calls.at(-1)?.[2].pausedAt;
  expect(pausedAt).toBeTypeOf("number");
  await act(async () => loading.resolve({ session }));
  expect(screen.getByRole("button", { name: "Resume workout" })).toBeVisible();
  expect(api.save.mock.calls.at(-1)?.[2]).toMatchObject({ paused: true, pausedAt });
  expect(screen.getByRole("button", { name: "Retry sync" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Finish workout" })).toBeEnabled();
  expect(api.command).toHaveBeenCalledTimes(1);
});

it("keeps local input usable and retryable when refresh loses the connection", async () => {
  const loading = deferred<object>();
  api.load.mockReturnValue(cachedWorkout());
  api.command.mockImplementation((body) =>
    body.action === "start"
      ? loading.promise
      : Promise.resolve({ set: { ...sets[0], reps: 12, revision: body.row.operationId } })
  );
  render(<Workout />);
  const reps = await screen.findAllByLabelText("Repetitions");
  fireEvent.change(reps[0], { target: { value: "12" } });
  await act(async () => loading.reject(new Error("Connection lost")));
  expect(screen.getByText("Connection lost")).toBeVisible();
  expect(reps[0]).toHaveValue("12");
  expect(screen.getByRole("button", { name: "Retry sync" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry sync" }));
  await waitFor(() => expect(api.save.mock.calls.at(-1)?.[2].rows[0].pending).toBe(false));
  expect(api.command).toHaveBeenCalledWith(
    expect.objectContaining({ action: "saveSet", row: expect.objectContaining({ reps: "12" }) })
  );
  expect(api.remove).not.toHaveBeenCalled();
});

it("records completed sets locally while refresh is pending without racing the server", async () => {
  const loading = deferred<object>();
  const cached = {
    ...cachedWorkout(),
    rows: cachedWorkout().rows.map((row) => ({
      ...row,
      completed: false,
      savedId: undefined,
      revision: "",
    })),
  };
  api.load.mockReturnValue(cached);
  api.list.mockImplementation(async (name) => (name === "WorkoutExercise" ? cached.exercises : []));
  api.command.mockImplementation((body) =>
    body.action === "start"
      ? loading.promise
      : Promise.resolve({
          set: { ...sets[0], reps: Number(body.row.reps), revision: body.row.operationId },
        })
  );
  render(<Workout />);
  const reps = await screen.findAllByLabelText("Repetitions");
  fireEvent.change(reps[0], { target: { value: "12" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Complete set" })[0]);
  expect(api.save.mock.calls.at(-1)?.[2].rows[0]).toMatchObject({
    reps: "12",
    completed: true,
    pending: true,
  });
  expect(api.command).toHaveBeenCalledTimes(1);
  const restUntil = api.save.mock.calls.at(-1)?.[2].restUntil;
  expect(restUntil).toBeTypeOf("number");
  await act(async () => loading.resolve({ session }));
  expect(reps[0]).toHaveValue("12");
  expect(api.save.mock.calls.at(-1)?.[2].rows[0]).toMatchObject({
    reps: "12",
    completed: true,
    pending: true,
  });
  expect(api.save.mock.calls.at(-1)?.[2].restUntil).toBe(restUntil);
  fireEvent.click(screen.getByRole("button", { name: "Retry sync" }));
  await waitFor(() => expect(api.save.mock.calls.at(-1)?.[2].rows[0].pending).toBe(false));
  expect(api.command.mock.calls.filter(([body]) => body.action === "saveSet")).toHaveLength(1);
  expect(api.command).toHaveBeenCalledWith(
    expect.objectContaining({ action: "saveSet", row: expect.objectContaining({ reps: "12" }) })
  );
});

it("settles refresh when local draft loading fails", async () => {
  api.load.mockImplementationOnce(() => {
    throw new Error("Local storage unavailable");
  });
  render(<Workout />);
  expect(await screen.findByText("Local storage unavailable")).toBeVisible();
  expect(api.command).not.toHaveBeenCalled();
});

it("does not remove a different draft when a cancelled refresh completes", async () => {
  const oldRefresh = deferred<object>(),
    newRefresh = deferred<object>();
  const nextSession = { ...session, id: "next-session", name: "Next workout" };
  api.load.mockImplementation((_owner, key) =>
    key === "owner:day" ? cachedWorkout() : { ...cachedWorkout(), session: nextSession }
  );
  api.command.mockImplementation((body) =>
    body.workoutDayId === "day" ? oldRefresh.promise : newRefresh.promise
  );
  const view = render(<Workout />);
  await screen.findAllByLabelText("Repetitions");
  api.day = "next-day";
  view.rerender(<Workout />);
  expect(await screen.findByRole("heading", { name: "Next workout" })).toBeVisible();
  fireEvent.change(screen.getAllByLabelText("Repetitions")[0], { target: { value: "14" } });
  await act(async () => oldRefresh.resolve({ session: { ...session, status: "completed" } }));
  expect(api.remove).not.toHaveBeenCalled();
  expect(api.replace).not.toHaveBeenCalled();
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("14");
  expect(screen.getByRole("button", { name: "Retry sync" })).toBeDisabled();
  await act(async () => newRefresh.resolve({ session: nextSession }));
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("14");
  expect(screen.getByRole("button", { name: "Retry sync" })).toBeEnabled();
});

it("never hydrates a new account from an older account's pending refresh", async () => {
  const alpha = deferred<object>(),
    beta = deferred<object>();
  const betaSession = {
    ...session,
    id: "beta-session",
    ownerId: "beta",
    created_by_id: "beta",
    name: "Beta workout",
  };
  const betaDraft = {
    ...cachedWorkout(),
    session: betaSession,
    rows: cachedWorkout().rows.map((row) => ({
      ...row,
      reps: "5",
      savedId: "beta-" + row.savedId,
    })),
  };
  api.load.mockImplementation((owner) => (owner === "owner" ? cachedWorkout() : betaDraft));
  api.command.mockImplementation((body) =>
    body.workoutDayId === "day" ? alpha.promise : beta.promise
  );
  api.list.mockImplementation(async (name) =>
    name === "WorkoutExercise"
      ? betaDraft.exercises
      : name === "ExerciseSet"
        ? sets.map((set) => ({
            ...set,
            id: "beta-" + set.id,
            ownerId: "beta",
            created_by_id: "beta",
            workoutSessionId: "beta-session",
            reps: 5,
          }))
        : []
  );
  const view = render(<Workout />);
  const inputs = await screen.findAllByLabelText("Repetitions");
  fireEvent.change(inputs[0], { target: { value: "12" } });
  api.owner = "beta";
  api.day = "beta-day";
  view.rerender(<Workout />);
  expect(await screen.findByRole("heading", { name: "Beta workout" })).toBeVisible();
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("5");
  await act(async () => alpha.resolve({ session }));
  expect(api.list).not.toHaveBeenCalled();
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("5");
  await act(async () => beta.resolve({ session: betaSession }));
  expect(screen.getAllByLabelText("Repetitions")[0]).toHaveValue("5");
  expect(api.save.mock.calls.at(-1)?.slice(0, 2)).toEqual(["beta", "beta:beta-day"]);
  expect(api.save.mock.calls.at(-1)?.[2].excludedRows).toEqual([]);
});
