import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  healthDayInsight,
  healthMetricContext,
  formatHealthValue,
  latestDailyMetrics,
  preferredDailyMetrics,
  readDailyCheckIn,
  readHealthMetrics,
  resetHealthDataSession,
  saveDailyCheckIn,
  saveDailyWeight,
  saveManualHealthMetrics,
  syncHealthBridge,
  validateCheckIn,
  validateHealthMetric,
  type HealthMetricRecord,
} from "@/lib/health/health-data";

const healthMetric = vi.hoisted(() => ({
  filter: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
const dailyCheckIn = vi.hoisted(() => ({
  filter: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
const healthConnection = vi.hoisted(() => ({
  filter: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
const healthImport = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
const weightEntry = vi.hoisted(() => ({ filter: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      HealthMetric: healthMetric,
      DailyCheckIn: dailyCheckIn,
      HealthConnection: healthConnection,
      HealthImport: healthImport,
      WeightEntry: weightEntry,
    },
  },
}));

const row = (overrides: Partial<HealthMetricRecord> = {}): HealthMetricRecord => ({
  id: "metric-1",
  date: "2020-06-01",
  metric: "steps",
  value: 8000,
  unit: "steps",
  source: "health_connect",
  aggregation: "daily",
  importedAt: "2020-06-01T18:00:00Z",
  ...overrides,
});

const installBridge = (metrics: HealthMetricRecord[]) => {
  window.limitHealthBridge = {
    getStatus: vi.fn(),
    connect: vi.fn(),
    sync: vi.fn().mockResolvedValue({
      connection: { platform: "android", provider: "health_connect", status: "connected" },
      metrics,
    }),
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  healthMetric.filter.mockResolvedValue([]);
  healthMetric.create.mockImplementation(async (value) => ({ id: "new-metric", ...value }));
  healthMetric.update.mockImplementation(async (id, value) => ({ id, ...value }));
  dailyCheckIn.filter.mockResolvedValue([]);
  dailyCheckIn.create.mockImplementation(async (value) => ({ id: "new-check-in", ...value }));
  dailyCheckIn.update.mockImplementation(async (id, value) => ({ id, ...value }));
  healthConnection.filter.mockResolvedValue([]);
  healthConnection.create.mockImplementation(async (value) => ({ id: "connection", ...value }));
  healthConnection.update.mockImplementation(async (id, value) => ({ id, ...value }));
  healthImport.create.mockImplementation(async (value) => ({ id: "audit", ...value }));
  healthImport.update.mockImplementation(async (id, value) => ({ id, ...value }));
  weightEntry.filter.mockResolvedValue([]);
  weightEntry.create.mockImplementation(async (value) => ({ id: "weight", ...value }));
  weightEntry.update.mockImplementation(async (id, value) => ({ id, ...value }));
  delete window.limitHealthBridge;
});

describe("health data boundaries", () => {
  it("validates metric, unit, source, date, and plausible values", () => {
    expect(validateHealthMetric(row())).toMatchObject({ metric: "steps", value: 8000 });
    expect(() => validateHealthMetric(row({ unit: "miles" }))).toThrow("valid unit");
    expect(() => validateHealthMetric(row({ value: 999999 }))).toThrow("supported range");
    expect(() => validateHealthMetric(row({ date: "2999-01-01" }))).toThrow("earlier health date");
  });

  it("avoids double counting and lets an explicit manual correction win", () => {
    const selected = preferredDailyMetrics(
      [
        row({ id: "watch", source: "health_connect", value: 9000 }),
        row({ id: "manual", source: "manual", value: 8400 }),
        row({ id: "sample", aggregation: "sample", value: 200 }),
      ],
      "2020-06-01"
    );
    expect(selected.steps?.value).toBe(8400);
  });

  it("updates the existing manual identity when an operation is retried", async () => {
    healthMetric.filter.mockResolvedValue([{ id: "existing" }]);
    await saveManualHealthMetrics("2020-06-01", { steps: { value: 7000, unit: "steps" } });
    expect(healthMetric.update).toHaveBeenCalledWith(
      "existing",
      expect.objectContaining({ sourceRecordId: "manual:2020-06-01:steps" })
    );
    expect(healthMetric.create).not.toHaveBeenCalled();
  });

  it.each([null, undefined, "", "   ", true, false, [], {}, "0x10"])(
    "rejects a nonnumeric health value %j",
    (value) => {
      expect(() => validateHealthMetric({ ...row(), value })).toThrow("supported range");
    }
  );

  it("normalizes mass, circumference, and distance before validating their ranges", () => {
    expect(validateHealthMetric(row({ metric: "weight", value: 80, unit: "kg" }))).toMatchObject({
      unit: "lb",
    });
    expect(
      validateHealthMetric(row({ metric: "weight", value: 80, unit: "kg" })).value
    ).toBeCloseTo(176.3698);
    expect(
      validateHealthMetric(row({ metric: "waist_circumference", value: 76.2, unit: "cm" })).value
    ).toBeCloseTo(30);
    expect(
      validateHealthMetric(row({ metric: "distance", value: 5, unit: "km" })).value
    ).toBeCloseTo(3.106856);
    expect(
      validateHealthMetric(row({ metric: "distance", value: 1609.344, unit: "m" }))
    ).toMatchObject({ value: 1, unit: "mi" });
    expect(() => validateHealthMetric(row({ metric: "weight", value: 700, unit: "kg" }))).toThrow(
      "supported range"
    );
    expect(() => validateHealthMetric({ ...row(), metric: "__proto__" })).toThrow(
      "supported health metric"
    );
  });

  it("keeps source selection deterministic and honors a preferred source without summing totals", () => {
    const records = [
      row({ id: "apple", source: "apple_health", value: 6000 }),
      row({ id: "android", source: "health_connect", value: 9000 }),
    ];
    expect(preferredDailyMetrics(records, "2020-06-01")).toEqual(
      preferredDailyMetrics([...records].reverse(), "2020-06-01")
    );
    expect(
      preferredDailyMetrics([...records, row({ source: "manual", value: 20 })], "2020-06-01", {
        steps: "apple_health",
      }).steps?.value
    ).toBe(6000);
    expect(preferredDailyMetrics(records, "2020-06-01", { steps: "oura" }).steps?.value).not.toBe(
      15000
    );
  });

  it("selects the newest observation instead of an older record reimported later", () => {
    const recent = row({
      id: "recent",
      recordedAt: "2020-06-01T19:00:00Z",
      importedAt: "2020-06-01T19:01:00Z",
      value: 9000,
    });
    const replay = row({
      id: "replay",
      recordedAt: "2020-06-01T12:00:00Z",
      importedAt: "2020-06-02T10:00:00Z",
      value: 6000,
    });
    expect(preferredDailyMetrics([recent, replay], "2020-06-01").steps?.value).toBe(9000);
    expect(
      latestDailyMetrics(
        [recent, row({ date: "2020-05-30", metric: "body_fat", value: 20, unit: "%" })],
        "2020-06-01"
      ).body_fat?.date
    ).toBe("2020-05-30");
  });

  it("shows old measurement context even after a recent import and rounds sleep without 60-minute remainders", () => {
    const context = healthMetricContext(
      row({ recordedAt: "2020-06-01T18:00:00Z", importedAt: "2020-06-10T18:00:00Z" }),
      "2020-06-10",
      new Date("2020-06-10T19:00:00Z")
    );
    expect(context.freshness).toBe("stale");
    expect(context.dateLabel).not.toBe("Today");
    expect(formatHealthValue(row({ metric: "sleep_duration", value: 359.8, unit: "min" }))).toBe(
      "6h 00m"
    );
  });

  it("validates and normalizes paginated history while preserving original import times", async () => {
    const firstPage = Array.from({ length: 500 }, (_, i) => row({ id: `r-${i}` }));
    healthMetric.filter
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([row({ id: "kg", metric: "weight", value: 80, unit: "kg" })]);
    const history = await readHealthMetrics({ from: "2020-06-01", through: "2020-06-01" });
    expect(history).toHaveLength(501);
    expect(history[500].value).toBeCloseTo(176.3698);
    expect(history[500].importedAt).toBe("2020-06-01T18:00:00.000Z");
    expect(healthMetric.filter).toHaveBeenNthCalledWith(2, expect.anything(), "-date", 500, 500);
  });

  it("rejects incomplete, invalid, or shifted history instead of returning misleading totals", async () => {
    healthMetric.filter.mockResolvedValue([row(), row()]);
    await expect(readHealthMetrics({ from: "2020-06-01", through: "2020-06-01" })).rejects.toThrow(
      "changed while loading"
    );
    healthMetric.filter.mockResolvedValue([row({ date: "2020-05-01" })]);
    await expect(readHealthMetrics({ from: "2020-06-01", through: "2020-06-01" })).rejects.toThrow(
      "unexpected date"
    );
    healthMetric.filter.mockResolvedValue([row({ value: NaN })]);
    await expect(readHealthMetrics({ from: "2020-06-01", through: "2020-06-01" })).rejects.toThrow(
      "supported range"
    );
    await expect(readHealthMetrics({ from: "2020-02-31", through: "2020-06-01" })).rejects.toThrow(
      "valid health history range"
    );
  });

  it("validates a manual batch before writing the first field", async () => {
    await expect(
      saveManualHealthMetrics("2020-06-01", {
        steps: { value: 7000, unit: "steps" },
        sleep_duration: { value: -1, unit: "min" },
      })
    ).rejects.toThrow("supported range");
    expect(healthMetric.create).not.toHaveBeenCalled();
    expect(healthMetric.filter).not.toHaveBeenCalled();
  });

  it("keeps check-ins optional but rejects empty or invalid ratings at the data boundary", () => {
    expect(validateCheckIn({ date: "2020-06-01", energy: 4 })).toEqual({
      date: "2020-06-01",
      energy: 4,
    });
    expect(() => validateCheckIn({ date: "2020-06-01", energy: 6 })).toThrow("between 1 and 5");
    expect(() => validateCheckIn({ date: "2020-06-01", note: "  " })).toThrow("one rating");
  });

  it("updates one daily check-in and uses recovery language without diagnosing", async () => {
    dailyCheckIn.filter.mockResolvedValue([{ id: "check-in" }]);
    await saveDailyCheckIn({ date: "2020-06-01", soreness: 5, note: "long week" });
    expect(dailyCheckIn.update).toHaveBeenCalledWith(
      "check-in",
      expect.objectContaining({ soreness: 5 })
    );
    expect(healthDayInsight({}, { soreness: 5 }).title).toMatch(/recovery/i);
  });

  it("clears existing ratings and notes explicitly without creating empty check-ins", async () => {
    dailyCheckIn.filter.mockResolvedValue([{ id: "check-in" }]);
    await saveDailyCheckIn({ date: "2020-06-01", soreness: null, note: "" });
    expect(dailyCheckIn.update).toHaveBeenCalledWith("check-in", {
      date: "2020-06-01",
      soreness: null,
      note: "",
    });
    dailyCheckIn.filter.mockResolvedValue([]);
    await expect(
      saveDailyCheckIn({ date: "2020-06-01", soreness: null, note: "" })
    ).rejects.toThrow("one rating");
    expect(() => validateCheckIn({ date: "2020-06-01", energy: true })).toThrow("between 1 and 5");
  });

  it("reads one validated daily check-in and refuses ambiguous rows", async () => {
    dailyCheckIn.filter.mockResolvedValue([{ id: "check-in", date: "2020-06-01", energy: 4 }]);
    await expect(readDailyCheckIn("2020-06-01")).resolves.toMatchObject({ energy: 4 });
    dailyCheckIn.filter.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    await expect(readDailyCheckIn("2020-06-01")).rejects.toThrow("safely matched");
  });

  it("updates a same-day weight in canonical units and refuses ambiguous history", async () => {
    weightEntry.filter.mockResolvedValue([{ id: "existing-weight" }]);
    await saveDailyWeight({ date: "2020-06-01", weight: 80, unit: "kg" });
    expect(weightEntry.update).toHaveBeenCalledWith("existing-weight", {
      date: "2020-06-01",
      weight: expect.closeTo(176.3698),
      unit: "lb",
    });
    weightEntry.filter.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    await expect(saveDailyWeight({ date: "2020-06-01", weight: 180 })).rejects.toThrow(
      "safely matched"
    );
    expect(weightEntry.create).not.toHaveBeenCalled();
  });

  it("rejects a native import whose row does not match the connected provider", async () => {
    window.limitHealthBridge = {
      getStatus: vi.fn(),
      connect: vi.fn(),
      sync: vi.fn().mockResolvedValue({
        connection: { platform: "ios", provider: "apple_health", status: "connected" },
        metrics: [
          row({ source: "health_connect", sourceRecordId: "source-row", date: "2020-06-01" }),
        ],
      }),
    };
    await expect(syncHealthBridge()).rejects.toThrow("wrong provider source");
    expect(healthMetric.create).not.toHaveBeenCalled();
  });

  it("prevalidates later provider errors and identifier collisions before writing metrics", async () => {
    installBridge([
      row({ sourceRecordId: "first" }),
      row({ source: "manual", sourceRecordId: "second" }),
    ]);
    await expect(syncHealthBridge()).rejects.toThrow("wrong provider source");
    expect(healthMetric.create).not.toHaveBeenCalled();
    installBridge([
      row({ sourceRecordId: "same", value: 5000 }),
      row({ sourceRecordId: "same", value: 8000 }),
    ]);
    await expect(syncHealthBridge()).rejects.toThrow("conflicting values");
    expect(healthMetric.create).not.toHaveBeenCalled();
    expect(healthImport.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", createdCount: 0 })
    );
  });

  it("checks all remote matches before any metric write", async () => {
    installBridge([row({ sourceRecordId: "first" }), row({ sourceRecordId: "second" })]);
    healthMetric.filter.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    await expect(syncHealthBridge()).rejects.toThrow("safely matched");
    expect(healthMetric.create).not.toHaveBeenCalled();
  });

  it("keeps metrics from the same device record distinct and treats a repeated import as unchanged", async () => {
    const persisted: HealthMetricRecord[] = [];
    healthMetric.filter.mockImplementation(async (query) =>
      persisted.filter(
        (item) =>
          item.source === query.source &&
          item.sourceRecordId === query.sourceRecordId &&
          item.metric === query.metric
      )
    );
    healthMetric.create.mockImplementation(async (value) => {
      const saved = { ...value, id: `saved-${persisted.length}` };
      persisted.push(saved);
      return saved;
    });
    installBridge([
      row({ sourceRecordId: "daily-1" }),
      row({ sourceRecordId: "daily-1", metric: "active_calories", value: 400, unit: "kcal" }),
    ]);
    await syncHealthBridge();
    await syncHealthBridge();
    expect(persisted).toHaveLength(2);
    expect(healthMetric.update).not.toHaveBeenCalled();
    expect(healthImport.update).toHaveBeenLastCalledWith(
      "audit",
      expect.objectContaining({
        status: "succeeded",
        createdCount: 0,
        updatedCount: 0,
        unchangedCount: 2,
      })
    );
  });

  it("reports partial writes accurately and preserves the original failure", async () => {
    installBridge([row({ sourceRecordId: "first" }), row({ sourceRecordId: "second" })]);
    healthMetric.create.mockResolvedValueOnce(row()).mockRejectedValueOnce(new Error("offline"));
    await expect(syncHealthBridge()).rejects.toThrow("offline");
    expect(healthConnection.create).not.toHaveBeenCalled();
    expect(healthImport.update).toHaveBeenLastCalledWith(
      "audit",
      expect.objectContaining({ status: "failed", createdCount: 1, updatedCount: 0 })
    );
  });

  it("returns an audit warning without hiding a successful health import", async () => {
    installBridge([row({ sourceRecordId: "first" })]);
    healthImport.create.mockRejectedValue(new Error("history unavailable"));
    const result = await syncHealthBridge();
    expect(result.auditWarning).toMatch(/history could not be saved/);
    expect(healthMetric.create).toHaveBeenCalledOnce();
    expect(healthConnection.create).toHaveBeenCalledOnce();
  });

  it("stops a delayed device result after the signed-in account changes", async () => {
    let resolve!: (result: any) => void;
    const pending = new Promise((done) => {
      resolve = done;
    });
    window.limitHealthBridge = {
      getStatus: vi.fn(),
      connect: vi.fn(),
      sync: vi.fn().mockReturnValue(pending),
    };
    const syncing = syncHealthBridge();
    await Promise.resolve();
    resetHealthDataSession();
    resolve({
      connection: { platform: "android", provider: "health_connect", status: "connected" },
      metrics: [row({ sourceRecordId: "first" })],
    });
    await expect(syncing).rejects.toThrow("account changed");
    expect(healthMetric.create).not.toHaveBeenCalled();
    expect(healthImport.create).not.toHaveBeenCalled();
  });

  it.each(["status", "permission"])(
    "stops a delayed %s result before starting an import in a different account",
    async (phase) => {
      let resolve!: (result: any) => void;
      const pending = new Promise((done) => {
        resolve = done;
      });
      const disconnected = {
        platform: "android" as const,
        provider: "health_connect" as const,
        status: "disconnected" as const,
      };
      installBridge([row({ sourceRecordId: "first" })]);
      const bridge = window.limitHealthBridge!;
      vi.mocked(bridge.getStatus).mockResolvedValue(disconnected);
      if (phase === "status") vi.mocked(bridge.getStatus).mockReturnValue(pending as any);
      else vi.mocked(bridge.connect).mockReturnValue(pending as any);
      const syncing = syncHealthBridge({ connectIfNeeded: true });
      await vi.waitFor(() =>
        expect(phase === "status" ? bridge.getStatus : bridge.connect).toHaveBeenCalledOnce()
      );
      resetHealthDataSession();
      resolve({ ...disconnected, status: "connected" });
      await expect(syncing).rejects.toThrow("account changed");
      expect(bridge.sync).not.toHaveBeenCalled();
      expect(healthMetric.filter).not.toHaveBeenCalled();
      expect(healthMetric.create).not.toHaveBeenCalled();
      expect(healthImport.create).not.toHaveBeenCalled();
    }
  );

  it("connects and imports in one guarded operation without blocking the mutation queue", async () => {
    installBridge([row({ sourceRecordId: "first" })]);
    const bridge = window.limitHealthBridge!;
    const status = {
      platform: "android" as const,
      provider: "health_connect" as const,
      status: "connected" as const,
    };
    vi.mocked(bridge.getStatus).mockResolvedValue({ ...status, status: "disconnected" });
    vi.mocked(bridge.connect).mockResolvedValue(status);
    await syncHealthBridge({ connectIfNeeded: true });
    await saveDailyWeight({ date: "2020-06-01", weight: 180 });
    expect(bridge.connect).toHaveBeenCalledOnce();
    expect(bridge.sync).toHaveBeenCalledOnce();
    expect(healthMetric.create).toHaveBeenCalledOnce();
    expect(weightEntry.create).toHaveBeenCalledOnce();
  });

  it("does not import when permission is declined", async () => {
    installBridge([row({ sourceRecordId: "first" })]);
    const bridge = window.limitHealthBridge!;
    const status = {
      platform: "android" as const,
      provider: "health_connect" as const,
      status: "disconnected" as const,
    };
    vi.mocked(bridge.getStatus).mockResolvedValue(status);
    vi.mocked(bridge.connect).mockResolvedValue(status);
    await expect(syncHealthBridge({ connectIfNeeded: true })).rejects.toThrow("not granted");
    expect(bridge.sync).not.toHaveBeenCalled();
    expect(healthMetric.create).not.toHaveBeenCalled();
  });
});
