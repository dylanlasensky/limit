import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: { user: { id: "account-a", name: "Alex" } },
  id: "session-1",
}));
const api = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));

vi.mock("expo-router", async () => {
  const React = await import("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: state.id }),
    Redirect: () => React.createElement("div", null, "Sign in"),
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement("span", null, children),
    router: { push: vi.fn(), replace: vi.fn() },
  };
});
vi.mock("react-native", async () => {
  const React = await import("react");
  return {
    Text: ({ children }: { children: React.ReactNode }) =>
      React.createElement("span", null, children),
    Linking: { openURL: vi.fn() },
  };
});
vi.mock("../../apps/mobile/src/ui", async () => {
  const React = await import("react");
  const box = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children);
  return {
    Page: box,
    Card: box,
    Title: ({ children }: { children: React.ReactNode }) =>
      React.createElement("h2", null, children),
    Copy: ({ children }: { children: React.ReactNode }) => React.createElement("p", null, children),
    Action: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement("button", { onClick: onPress }, label),
    styles: { text: {} },
  };
});
vi.mock("../../apps/mobile/src/lib/api", () => ({
  auth: { useSession: () => ({ data: state.session, isPending: false }), signOut: vi.fn() },
  list: api.list,
  get: api.get,
  origin: "https://example.test",
}));
vi.mock("../../apps/mobile/src/lib/drafts", () => ({ clearDrafts: vi.fn() }));

import Home from "../../apps/mobile/src/app/index";
import Plan from "../../apps/mobile/src/app/plan";
import History from "../../apps/mobile/src/app/history/index";
import HistoryDetail from "../../apps/mobile/src/app/history/[id]";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const sessionRecord = (ownerId: string, name: string) => ({
  id: "session-1",
  ownerId,
  created_by_id: ownerId,
  created_date: "2026-10-03",
  updated_date: "2026-10-03",
  name,
  date: "2026-10-03",
  status: "completed",
});

beforeEach(() => {
  state.session = { user: { id: "account-a", name: "Alex" } };
  state.id = "session-1";
  api.list.mockReset();
  api.get.mockReset();
});
afterEach(cleanup);

describe("native account isolation during navigation", () => {
  it("drops a late history response from the prior account", async () => {
    const old = deferred<ReturnType<typeof sessionRecord>[]>();
    api.list
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce([sessionRecord("account-b", "B workout")]);
    const view = render(<History />);
    state.session = { user: { id: "account-b", name: "Blair" } };
    view.rerender(<History />);
    expect(await screen.findByText("B workout")).toBeInTheDocument();
    await act(async () => old.resolve([sessionRecord("account-a", "A private workout")]));
    expect(screen.queryByText("A private workout")).not.toBeInTheDocument();
  });

  it("hides workout details immediately when the account changes", async () => {
    api.get.mockResolvedValueOnce(sessionRecord("account-a", "A private details"));
    api.list.mockResolvedValue([]);
    const next = deferred<ReturnType<typeof sessionRecord>>();
    api.get.mockReturnValueOnce(next.promise);
    const view = render(<HistoryDetail />);
    expect(await screen.findByText("A private details")).toBeInTheDocument();
    state.session = { user: { id: "account-b", name: "Blair" } };
    view.rerender(<HistoryDetail />);
    expect(screen.queryByText("A private details")).not.toBeInTheDocument();
    expect(screen.getByText("Loading completed workout…")).toBeInTheDocument();
    await act(async () => next.resolve(sessionRecord("account-b", "B details")));
  });

  it("does not show the prior account's plan while the next one loads", async () => {
    api.list.mockResolvedValueOnce([
      { id: "plan-a", ownerId: "account-a", name: "A private plan" },
    ]);
    const next = deferred<{ id: string; ownerId: string; name: string }[]>();
    api.list.mockReturnValueOnce(next.promise);
    const view = render(<Home />);
    expect(await screen.findByText("A private plan")).toBeInTheDocument();
    state.session = { user: { id: "account-b", name: "Blair" } };
    view.rerender(<Home />);
    expect(screen.queryByText("A private plan")).not.toBeInTheDocument();
    expect(screen.getByText("Loading your plan…")).toBeInTheDocument();
    await act(async () => next.resolve([{ id: "plan-b", ownerId: "account-b", name: "B plan" }]));
    expect(screen.getByText("B plan")).toBeInTheDocument();
  });

  it("hides weekly workout days immediately on account switch", async () => {
    const next = deferred<
      {
        id: string;
        ownerId: string;
        planId: string;
        weekday: number;
        name: string;
        isRest: boolean;
      }[]
    >();
    api.list
      .mockResolvedValueOnce([{ id: "plan-a", ownerId: "account-a" }])
      .mockResolvedValueOnce([
        {
          id: "day-a",
          ownerId: "account-a",
          planId: "plan-a",
          weekday: 0,
          name: "A private workout",
          isRest: false,
        },
      ])
      .mockResolvedValueOnce([{ id: "plan-b", ownerId: "account-b" }])
      .mockReturnValueOnce(next.promise);
    const view = render(<Plan />);
    expect(await screen.findByText("A private workout")).toBeInTheDocument();
    state.session = { user: { id: "account-b", name: "Blair" } };
    view.rerender(<Plan />);
    expect(screen.queryByText("A private workout")).not.toBeInTheDocument();
    expect(screen.getByText("Loading your plan…")).toBeInTheDocument();
    await act(async () =>
      next.resolve([
        {
          id: "day-b",
          ownerId: "account-b",
          planId: "plan-b",
          weekday: 1,
          name: "B workout",
          isRest: false,
        },
      ])
    );
    expect(screen.getByText("B workout")).toBeInTheDocument();
  });

  it("drops a late weekly plan response from the prior account", async () => {
    const old = deferred<{ id: string; ownerId: string }[]>();
    api.list
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce([{ id: "plan-b", ownerId: "account-b" }])
      .mockResolvedValueOnce([]);
    const view = render(<Plan />);
    state.session = { user: { id: "account-b", name: "Blair" } };
    view.rerender(<Plan />);
    expect(await screen.findByText("No active plan yet.")).toBeInTheDocument();
    expect(screen.getByText("Build my starting plan")).toBeInTheDocument();
    await act(async () => old.resolve([{ id: "plan-a", ownerId: "account-a" }]));
    expect(screen.queryByText("A private workout")).not.toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(3);
  });
});
