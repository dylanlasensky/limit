import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  connectionFreshness,
  deleteHealthData,
  healthDataCollections,
  readHealthImports,
  readHealthPreferences,
  saveHealthPreferences,
  validateHealthPreferences,
} from "@/lib/health/health-preferences";
import { resetHealthDataSession } from "@/lib/health/health-data";
import HealthPreferences from "@/components/health/HealthPreferences";
import ConnectedHealthPanel from "@/components/health/ConnectedHealthPanel";

const sdk = vi.hoisted(() => {
  const names = [
    "HealthPreference",
    "HealthImport",
    "HealthConnection",
    "HealthMetric",
    "DailyCheckIn",
    "WeightEntry",
    "BodyMeasurement",
    "WorkoutSession",
    "FoodEntry",
    "UserProfile",
  ];
  return {
    me: vi.fn(),
    entities: Object.fromEntries(
      names.map((name) => [
        name,
        { list: vi.fn(), filter: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      ])
    ),
  };
});
vi.mock("@/api/base44Client", () => ({ base44: { auth: { me: sdk.me }, entities: sdk.entities } }));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }) => (open ? <div role="dialog">{children}</div> : null),
  DrawerContent: ({ children }) => <div>{children}</div>,
  DrawerTitle: ({ children }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }) => <p>{children}</p>,
}));
let rows: Record<string, any[]>;
beforeEach(() => {
  vi.resetAllMocks();
  resetHealthDataSession();
  window.history.replaceState({}, "", "/");
  delete window.limitHealthBridge;
  rows = Object.fromEntries(Object.keys(sdk.entities).map((name) => [name, []]));
  sdk.me.mockResolvedValue({ id: "member-a" });
  for (const [name, api] of Object.entries(sdk.entities)) {
    api.list.mockImplementation(async (_sort, limit = 500, skip = 0) =>
      rows[name].slice(skip, skip + limit)
    );
    api.filter.mockImplementation(async (_query, _sort, limit = 500, skip = 0) =>
      rows[name].slice(skip, skip + limit)
    );
    api.create.mockImplementation(async (value) => {
      const record = { ...value, id: `${name}-new` };
      rows[name].push(record);
      return record;
    });
    api.update.mockImplementation(async (id, value) => {
      const record = { ...value, id };
      rows[name] = rows[name].map((row) => (row.id === id ? record : row));
      return record;
    });
    api.delete.mockImplementation(async (id) => {
      rows[name] = rows[name].filter((row) => row.id !== id);
      return { success: true };
    });
  }
});
afterEach(cleanup);
function show(
  component = (
    <HealthPreferences
      connections={[]}
      canDisconnect={false}
      onDisconnect={vi.fn()}
      onChanged={vi.fn()}
    />
  )
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
  return client;
}

describe("account-specific health preferences", () => {
  it("defaults to all visible and automatic without creating records", async () => {
    expect(await readHealthPreferences()).toEqual({ hiddenMetrics: [], preferredSources: {} });
    expect(sdk.entities.HealthPreference.create).not.toHaveBeenCalled();
  });
  it("validates metric/source names and strips ownership or unrelated fields", () => {
    expect(
      validateHealthPreferences({
        hiddenMetrics: ["steps", "steps"],
        preferredSources: { sleep_duration: "oura" },
        created_by_id: "other",
      })
    ).toEqual({ hiddenMetrics: ["steps"], preferredSources: { sleep_duration: "oura" } });
    expect(() => validateHealthPreferences({ hiddenMetrics: ["unknown"] })).toThrow("supported");
    expect(() => validateHealthPreferences({ preferredSources: { steps: "unknown" } })).toThrow(
      "supported"
    );
    expect(() => validateHealthPreferences({ preferredSources: [] })).toThrow("supported");
  });
  it("updates the existing preference record and rejects duplicates or unconfirmed saves", async () => {
    rows.HealthPreference = [{ id: "prefs", hiddenMetrics: [], preferredSources: {} }];
    await saveHealthPreferences({ hiddenMetrics: ["steps"], preferredSources: {} });
    expect(sdk.entities.HealthPreference.update).toHaveBeenCalledWith("prefs", {
      hiddenMetrics: ["steps"],
      preferredSources: {},
    });
    expect(sdk.entities.HealthPreference.create).not.toHaveBeenCalled();
    rows.HealthPreference.push({ id: "duplicate" });
    await expect(saveHealthPreferences({})).rejects.toThrow("safely matched");
    rows.HealthPreference = [];
    sdk.entities.HealthPreference.create.mockResolvedValueOnce({
      id: "saved",
      hiddenMetrics: ["weight"],
      preferredSources: {},
    });
    await expect(saveHealthPreferences({})).rejects.toThrow("could not be confirmed");
  });
  it("retains form choices after a failed save and retries without duplicate clicks", async () => {
    sdk.entities.HealthPreference.create.mockRejectedValueOnce({ status: 503 });
    const client = show();
    fireEvent.click(screen.getByRole("button", { name: "Health settings & data" }));
    await screen.findByRole("button", { name: "Save health preferences" });
    fireEvent.click(screen.getByLabelText("Show Steps"));
    fireEvent.change(screen.getByLabelText("Preferred source for Sleep"), {
      target: { value: "oura" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save health preferences" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your choices are still here");
    expect(screen.getByLabelText("Show Steps")).not.toBeChecked();
    expect(screen.getByLabelText("Preferred source for Sleep")).toHaveValue("oura");
    const button = screen.getByRole("button", { name: "Save health preferences" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() =>
      expect(client.getQueryData(["healthPreferences"])).toEqual({
        hiddenMetrics: ["steps"],
        preferredSources: { sleep_duration: "oura" },
      })
    );
    expect(sdk.entities.HealthPreference.create).toHaveBeenCalledTimes(2);
  });
  it("does not dismiss settings on hardware Back during a pending save", async () => {
    let done: (value: any) => void = () => {};
    sdk.entities.HealthPreference.create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve;
        })
    );
    show();
    fireEvent.click(screen.getByRole("button", { name: "Health settings & data" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save health preferences" }));
    await waitFor(() => expect(sdk.entities.HealthPreference.create).toHaveBeenCalledOnce());
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close health settings" })).toBeDisabled();
    await act(async () => done({ id: "prefs", hiddenMetrics: [], preferredSources: {} }));
  });
});

describe("health-only verified deletion", () => {
  it("requires explicit confirmation before reading or changing data", async () => {
    await expect(deleteHealthData(false)).rejects.toThrow("Confirm");
    expect(sdk.me).not.toHaveBeenCalled();
  });
  it("deletes all health pages and verifies each scope, preserving workouts/nutrition/profile/settings", async () => {
    rows.HealthMetric = Array.from({ length: 251 }, (_, i) => ({ id: `metric-${i}` }));
    for (const name of healthDataCollections.filter((name) => name !== "HealthMetric"))
      rows[name] = [{ id: `${name}-one` }];
    for (const name of ["HealthPreference", "WorkoutSession", "FoodEntry", "UserProfile"])
      rows[name] = [{ id: `${name}-keep` }];
    expect(await deleteHealthData(true)).toEqual({ deletedCount: 256 });
    for (const name of healthDataCollections) {
      expect(rows[name]).toHaveLength(0);
      expect(sdk.entities[name].filter).toHaveBeenLastCalledWith(
        { created_by_id: "member-a" },
        "created_date",
        1,
        0
      );
    }
    for (const name of ["HealthPreference", "WorkoutSession", "FoodEntry", "UserProfile"]) {
      expect(rows[name]).toHaveLength(1);
      expect(sdk.entities[name].delete).not.toHaveBeenCalled();
    }
    expect(sdk.entities.HealthMetric.filter.mock.calls.every((args) => args[3] === 0)).toBe(true);
  });
  it("supports retry after partial removal without claiming completion", async () => {
    rows.HealthMetric = [{ id: "one" }, { id: "two" }];
    sdk.entities.HealthMetric.delete
      .mockImplementationOnce(async (id) => {
        rows.HealthMetric = rows.HealthMetric.filter((row) => row.id !== id);
        return { success: true };
      })
      .mockRejectedValueOnce({ status: 503 });
    await expect(deleteHealthData(true)).rejects.toMatchObject({ status: 503 });
    expect(rows.HealthMetric).toEqual([{ id: "two" }]);
    expect(sdk.entities.WeightEntry.delete).not.toHaveBeenCalled();
    await expect(deleteHealthData(true)).resolves.toEqual({ deletedCount: 1 });
  });
  it("rejects false acknowledgements, foreign rows and stale repeated deletion pages", async () => {
    rows.HealthMetric = [{ id: "one" }];
    sdk.entities.HealthMetric.delete.mockResolvedValueOnce({ success: false });
    await expect(deleteHealthData(true)).rejects.toThrow("confirmed");
    rows.HealthMetric = [{ id: "foreign", created_by_id: "member-b" }];
    await expect(deleteHealthData(true)).rejects.toThrow("verified");
    expect(sdk.entities.HealthMetric.delete).toHaveBeenCalledTimes(1);
    rows.HealthMetric = [{ id: "one" }];
    sdk.entities.HealthMetric.delete.mockResolvedValueOnce({ success: true });
    await expect(deleteHealthData(true)).rejects.toThrow("verified");
  });
  it("fails final verification if another client adds records during deletion", async () => {
    sdk.entities.HealthMetric.filter
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "new-from-other-device" }]);
    await expect(deleteHealthData(true)).rejects.toThrow("remaining health data");
  });
  it("stops before deletion when the account changes or a delayed read belongs to a prior session", async () => {
    sdk.me.mockResolvedValueOnce({ id: "member-a" }).mockResolvedValueOnce({ id: "member-b" });
    await expect(deleteHealthData(true)).rejects.toThrow("account changed");
    rows.HealthMetric = [{ id: "one" }];
    sdk.entities.HealthMetric.filter.mockImplementationOnce(async () => {
      resetHealthDataSession();
      return rows.HealthMetric;
    });
    await expect(deleteHealthData(true)).rejects.toThrow("account changed");
    expect(sdk.entities.HealthMetric.delete).not.toHaveBeenCalled();
  });
  it("shows scope and requires the checkbox before deletion; failure is retryable", async () => {
    rows.HealthMetric = [{ id: "one" }];
    sdk.entities.HealthMetric.delete.mockRejectedValueOnce({ status: 500 });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Health settings & data" }));
    await screen.findByRole("button", { name: "Save health preferences" });
    fireEvent.click(screen.getByText("Remove health data"));
    fireEvent.click(screen.getByRole("button", { name: "Delete health data from LIMIT" }));
    expect(screen.getByRole("button", { name: "Confirm health data deletion" })).toBeDisabled();
    expect(sdk.entities.HealthMetric.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/I understand which records/));
    fireEvent.click(screen.getByRole("button", { name: "Confirm health data deletion" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some records may already be removed"
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm health data deletion" }));
    expect(await screen.findByText(/Health records removed from LIMIT/)).toHaveTextContent(
      "permissions are unchanged"
    );
  });
});

describe("honest health source management", () => {
  it("handles unknown/future sync timestamps and marks older syncs stale", () => {
    const now = Date.parse("2026-09-15T12:00:00Z");
    expect(connectionFreshness("not-a-date", now)).toMatchObject({
      stale: true,
      label: "No verified sync time",
    });
    expect(connectionFreshness("2026-09-17T12:00:00Z", now).stale).toBe(true);
    expect(connectionFreshness("2026-09-15T11:00:00Z", now).stale).toBe(false);
    expect(connectionFreshness("2026-09-13T12:00:00Z", now).label).toContain("out of date");
  });
  it("does not invent native access or offer fake browser disconnect", async () => {
    rows.HealthConnection = [
      { id: "connection", provider: "apple_health", status: "connected", lastSyncedAt: "invalid" },
    ];
    show(<ConnectedHealthPanel />);
    expect(await screen.findByText("Apple Health records")).toBeInTheDocument();
    expect(screen.getByText(/even if you install the website/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync now" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Health settings & data" }));
    fireEvent.click(screen.getByText("Connections & permissions"));
    expect(screen.getByText(/This browser cannot revoke/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Disconnect Apple Health" })
    ).not.toBeInTheDocument();
  });
  it("reads one extra import to detect older history without pretending it is complete", async () => {
    rows.HealthImport = Array.from({ length: 21 }, (_, i) => ({
      id: `import-${i}`,
      provider: "apple_health",
      startedAt: "2026-09-15T12:00:00Z",
      status: "succeeded",
    }));
    const result = await readHealthImports();
    expect(result.rows).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(sdk.entities.HealthImport.list).toHaveBeenCalledWith("-startedAt", 21, 0);
  });
});
