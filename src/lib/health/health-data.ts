import { base44 } from "@/api/base44Client";
import { isDiaryDate } from "@/lib/food-diary";
import { localDay } from "@/components/workout/workoutDraft";

export const healthMetricDefinitions = {
  steps: { label: "Steps", unit: "steps", min: 0, max: 250000 },
  active_calories: { label: "Active calories", unit: "kcal", min: 0, max: 20000 },
  distance: { label: "Distance", unit: "mi", min: 0, max: 1000 },
  exercise_minutes: { label: "Active minutes", unit: "min", min: 0, max: 1440 },
  sleep_duration: { label: "Sleep", unit: "min", min: 0, max: 1440 },
  sleep_score: { label: "Sleep score", unit: "%", min: 0, max: 100 },
  resting_heart_rate: { label: "Resting heart rate", unit: "bpm", min: 20, max: 250 },
  heart_rate_variability: { label: "HRV", unit: "ms", min: 0, max: 500 },
  respiratory_rate: { label: "Respiratory rate", unit: "brpm", min: 4, max: 80 },
  oxygen_saturation: { label: "Blood oxygen", unit: "%", min: 0, max: 100 },
  readiness_score: { label: "Readiness", unit: "%", min: 0, max: 100 },
  stress_score: { label: "Stress", unit: "%", min: 0, max: 100 },
  weight: { label: "Weight", unit: "lb", min: 1, max: 1500 },
  body_fat: { label: "Body fat", unit: "%", min: 0, max: 80 },
  fat_mass: { label: "Fat mass", unit: "lb", min: 0, max: 1000 },
  lean_body_mass: { label: "Lean mass", unit: "lb", min: 0, max: 1000 },
  skeletal_muscle_mass: { label: "Muscle mass", unit: "lb", min: 0, max: 1000 },
  body_water: { label: "Body water", unit: "%", min: 0, max: 100 },
  bone_mass: { label: "Bone mass", unit: "lb", min: 0, max: 100 },
  visceral_fat: { label: "Visceral fat", unit: "rating", min: 0, max: 100 },
  waist_circumference: { label: "Waist", unit: "in", min: 5, max: 150 },
  hip_circumference: { label: "Hips", unit: "in", min: 5, max: 150 },
} as const;

export type HealthMetricName = keyof typeof healthMetricDefinitions;
export type HealthSource =
  | "manual"
  | "limit"
  | "apple_health"
  | "health_connect"
  | "oura"
  | "whoop"
  | "garmin"
  | "fitbit"
  | "withings"
  | "other";

export interface HealthMetricRecord {
  id?: string;
  date: string;
  recordedAt?: string;
  metric: HealthMetricName;
  value: number;
  unit: string;
  source: HealthSource;
  sourceRecordId?: string;
  sourceDevice?: string;
  aggregation?: "daily" | "sample";
  importedAt?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface HealthBridgeStatus {
  platform: "ios" | "android";
  provider: "apple_health" | "health_connect";
  status: "connected" | "disconnected" | "needs_attention";
  permissionStatus?: string;
  deviceNames?: string[];
  capabilities?: string[];
  lastSyncedAt?: string;
}

export interface HealthBridgeSyncResult {
  connection: HealthBridgeStatus;
  metrics: HealthMetricRecord[];
}

export interface LimitHealthBridge {
  getStatus(): Promise<HealthBridgeStatus>;
  connect(metrics: HealthMetricName[]): Promise<HealthBridgeStatus>;
  sync(): Promise<HealthBridgeSyncResult>;
  disconnect?(): Promise<HealthBridgeStatus>;
}

declare global {
  interface Window {
    limitHealthBridge?: LimitHealthBridge;
  }
}

const validSources = new Set<HealthSource>([
  "manual",
  "limit",
  "apple_health",
  "health_connect",
  "oura",
  "whoop",
  "garmin",
  "fitbit",
  "withings",
  "other",
]);

const allowedUnits: Partial<Record<HealthMetricName, Set<string>>> = {
  steps: new Set(["steps"]),
  active_calories: new Set(["kcal"]),
  distance: new Set(["mi", "km", "m"]),
  exercise_minutes: new Set(["min"]),
  sleep_duration: new Set(["min"]),
  sleep_score: new Set(["%"]),
  resting_heart_rate: new Set(["bpm"]),
  heart_rate_variability: new Set(["ms"]),
  respiratory_rate: new Set(["brpm"]),
  oxygen_saturation: new Set(["%"]),
  readiness_score: new Set(["%"]),
  stress_score: new Set(["%"]),
  weight: new Set(["lb", "kg"]),
  body_fat: new Set(["%"]),
  fat_mass: new Set(["lb", "kg"]),
  lean_body_mass: new Set(["lb", "kg"]),
  skeletal_muscle_mass: new Set(["lb", "kg"]),
  body_water: new Set(["%"]),
  bone_mass: new Set(["lb", "kg"]),
  visceral_fat: new Set(["rating"]),
  waist_circumference: new Set(["in", "cm"]),
  hip_circumference: new Set(["in", "cm"]),
};

const sourcePriority: Record<HealthSource, number> = {
  // A deliberate manual entry is an explicit correction and wins for that day.
  manual: 120,
  apple_health: 100,
  health_connect: 100,
  oura: 80,
  whoop: 80,
  garmin: 80,
  fitbit: 80,
  withings: 80,
  limit: 60,
  other: 20,
};

export const sourceLabel = (source?: string) =>
  ({
    apple_health: "Apple Health",
    health_connect: "Health Connect",
    oura: "Oura",
    whoop: "WHOOP",
    garmin: "Garmin",
    fitbit: "Fitbit",
    withings: "Withings",
    limit: "LIMIT",
    manual: "Manual",
    other: "Other",
  })[source || ""] || "Unknown source";

export type PreferredHealthSources = Partial<Record<HealthMetricName, HealthSource>>;

const decimalNumber = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const hasOwn = (value: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

function numericValue(input: unknown) {
  if (typeof input === "number") return input;
  if (typeof input === "string" && decimalNumber.test(input.trim())) return Number(input);
  return NaN;
}

function timestamp(input: unknown, label: string) {
  if (input == null || input === "") return undefined;
  if (typeof input !== "string" || !/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(input))
    throw new Error(`The ${label} time is invalid.`);
  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`The ${label} time is invalid.`);
  return parsed.toISOString();
}

/** The stored units match LIMIT's existing weight and training history. */
function canonicalValue(value: number, unit: string) {
  if (unit === "kg") return value * 2.2046226218487757;
  if (unit === "cm") return value / 2.54;
  if (unit === "km") return value / 1.609344;
  if (unit === "m") return value / 1609.344;
  return value;
}

export function validateHealthMetric(input: Record<string, unknown>): HealthMetricRecord {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("The health metric is incomplete.");
  if (!isDiaryDate(input.date)) throw new Error("Choose today or an earlier health date.");
  const metric = input.metric as HealthMetricName;
  if (!hasOwn(healthMetricDefinitions, metric))
    throw new Error("Choose a supported health metric.");
  const definition = healthMetricDefinitions[metric];
  const unit = typeof input.unit === "string" ? input.unit : "";
  if (!allowedUnits[metric]?.has(unit))
    throw new Error(`Choose a valid unit for ${definition.label}.`);
  const value = canonicalValue(numericValue(input.value), unit);
  if (!Number.isFinite(value) || value < definition.min || value > definition.max)
    throw new Error(`${definition.label} is outside the supported range.`);
  const source = input.source as HealthSource;
  if (!validSources.has(source)) throw new Error("Choose a supported health data source.");
  const recordedAt = timestamp(input.recordedAt, "health metric");
  const importedAt = timestamp(input.importedAt, "health import");
  if (
    input.sourceRecordId != null &&
    (typeof input.sourceRecordId !== "string" ||
      !input.sourceRecordId.trim() ||
      input.sourceRecordId.length > 240)
  )
    throw new Error("The source record identifier is invalid.");
  if (input.sourceDevice != null && typeof input.sourceDevice !== "string")
    throw new Error("The source device name is invalid.");
  if (input.aggregation != null && !["daily", "sample"].includes(String(input.aggregation)))
    throw new Error("The health metric aggregation is invalid.");
  if (
    input.metadata != null &&
    (typeof input.metadata !== "object" || Array.isArray(input.metadata))
  )
    throw new Error("The health metric details are invalid.");
  return {
    date: String(input.date),
    metric,
    value,
    unit: definition.unit,
    source,
    ...(recordedAt ? { recordedAt } : {}),
    ...(input.sourceRecordId ? { sourceRecordId: String(input.sourceRecordId) } : {}),
    ...(input.sourceDevice ? { sourceDevice: String(input.sourceDevice).slice(0, 120) } : {}),
    aggregation: input.aggregation === "sample" ? "sample" : "daily",
    ...(importedAt ? { importedAt } : {}),
    ...(input.metadata && typeof input.metadata === "object"
      ? { metadata: input.metadata as Record<string, unknown> }
      : {}),
  };
}

export async function readHealthMetrics({ from, through }: { from: string; through: string }) {
  if (!isDiaryDate(through) || !isDiaryDate(from) || from > through)
    throw new Error("Choose a valid health history range.");
  const rows = new Map<string, HealthMetricRecord>();
  for (let skip = 0; skip < 20000; skip += 500) {
    const page = await base44.entities.HealthMetric.filter(
      { date: { $gte: from, $lte: through } },
      "-date",
      500,
      skip
    );
    if (!Array.isArray(page))
      throw new Error("Your health history could not be loaded completely.");
    for (const row of page) {
      if (!row || typeof row.id !== "string" || !row.id || rows.has(row.id))
        throw new Error("Your health history changed while loading. Please retry.");
      const normalized = validateHealthMetric(row);
      if (normalized.date < from || normalized.date > through)
        throw new Error("Your health history returned an unexpected date. Please retry.");
      rows.set(row.id, { ...row, ...normalized });
    }
    if (page.length < 500) return [...rows.values()];
  }
  throw new Error("This health history is too large to load completely.");
}

function metricRecency(row: HealthMetricRecord) {
  // An old observation reimported today must not displace a newer observation.
  return Date.parse(row.recordedAt || row.importedAt || "") || 0;
}

function compareDailyMetric(
  a: HealthMetricRecord,
  b: HealthMetricRecord,
  preferred?: HealthSource
) {
  const priority = (row: HealthMetricRecord) =>
    row.source === preferred ? 200 : sourcePriority[row.source];
  const score = priority(a) - priority(b);
  if (score) return score;
  const recency = metricRecency(a) - metricRecency(b);
  if (recency) return recency;
  // Stable ties make the result independent of API pagination/order.
  return JSON.stringify([
    a.source,
    a.sourceRecordId || "",
    a.id || "",
    a.value,
    a.unit,
  ]).localeCompare(JSON.stringify([b.source, b.sourceRecordId || "", b.id || "", b.value, b.unit]));
}

export function preferredDailyMetrics(
  rows: HealthMetricRecord[],
  date: string,
  preferredSources: PreferredHealthSources = {}
) {
  const selected = new Map<HealthMetricName, HealthMetricRecord>();
  for (const row of rows) {
    if (row.date !== date || row.aggregation === "sample") continue;
    const current = selected.get(row.metric);
    if (!current || compareDailyMetric(row, current, preferredSources[row.metric]) > 0)
      selected.set(row.metric, row);
  }
  return Object.fromEntries(selected) as Partial<Record<HealthMetricName, HealthMetricRecord>>;
}

export function latestDailyMetrics(
  rows: HealthMetricRecord[],
  throughDate: string,
  preferredSources: PreferredHealthSources = {}
) {
  const latest: Partial<Record<HealthMetricName, HealthMetricRecord>> = {};
  const dates = [...new Set(rows.filter((row) => row.date <= throughDate).map((row) => row.date))]
    .sort()
    .reverse();
  for (const date of dates) {
    for (const [metric, row] of Object.entries(
      preferredDailyMetrics(rows, date, preferredSources)
    )) {
      if (!latest[metric as HealthMetricName]) latest[metric as HealthMetricName] = row;
    }
  }
  return latest;
}

export function healthMetricContext(
  row?: HealthMetricRecord,
  today = localDay(),
  now = new Date()
) {
  if (!row) return { dateLabel: "No reading", freshness: "missing" as const, updatedLabel: null };
  const daysOld = Math.floor(
    (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${row.date}T12:00:00Z`)) / 86400000
  );
  const dateLabel =
    daysOld === 0
      ? "Today"
      : daysOld === 1
        ? "Yesterday"
        : new Date(`${row.date}T12:00:00Z`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: row.date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
          });
  const observedAt = row.recordedAt || row.importedAt;
  const hoursOld = observedAt ? (now.getTime() - Date.parse(observedAt)) / 3600000 : null;
  const freshness =
    daysOld > 1 || (hoursOld != null && hoursOld >= 36) ? ("stale" as const) : ("recent" as const);
  const updatedLabel = row.importedAt
    ? `Synced ${new Date(row.importedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : null;
  return { dateLabel, freshness, updatedLabel };
}

export function formatHealthValue(row?: HealthMetricRecord) {
  if (!row) return null;
  if (row.metric === "sleep_duration") {
    const totalMinutes = Math.round(row.value);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  if (row.metric === "steps") return Math.round(row.value).toLocaleString();
  if (["sleep_score", "readiness_score", "stress_score"].includes(row.metric))
    return `${Math.round(row.value)}`;
  return `${Math.round(row.value * 10) / 10} ${row.unit}`;
}

export function healthDayInsight(
  metrics: Partial<Record<HealthMetricName, HealthMetricRecord>>,
  checkIn?: Record<string, unknown> | null
) {
  const sleep = metrics.sleep_duration?.value;
  const readiness = metrics.readiness_score?.value;
  const energy = Number(checkIn?.energy || 0);
  const soreness = Number(checkIn?.soreness || 0);
  if ((sleep != null && sleep < 360) || energy === 1 || soreness >= 5)
    return {
      tone: "recover" as const,
      title: "Give recovery more room",
      body: "Keep today flexible and use how you feel to guide training intensity.",
    };
  if ((readiness != null && readiness >= 75) || energy >= 4)
    return {
      tone: "ready" as const,
      title: "You’re showing positive signals",
      body: "If that matches how you feel, today can be a good day to build momentum.",
    };
  if (!Object.keys(metrics).length && !checkIn)
    return {
      tone: "empty" as const,
      title: "Start with what matters to you",
      body: "Add activity, sleep, or a quick check-in. Everything here is optional.",
    };
  return {
    tone: "steady" as const,
    title: "Keep the day steady",
    body: "Your data is context, not a command. Choose the next action that fits your day.",
  };
}

const checkInRatings = ["energy", "soreness", "mood", "stress", "sleepQuality"] as const;

function hasCheckInContent(payload: Record<string, unknown>) {
  return (
    checkInRatings.some((key) => typeof payload[key] === "number") ||
    (typeof payload.note === "string" && Boolean(payload.note.trim())) ||
    (Array.isArray(payload.tags) && payload.tags.length > 0)
  );
}

export function validateCheckIn(input: Record<string, unknown>, { allowEmpty = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("The check-in is incomplete.");
  if (!isDiaryDate(input.date)) throw new Error("Choose today or an earlier check-in date.");
  const payload: Record<string, unknown> = { date: input.date };
  for (const key of checkInRatings) {
    if (!hasOwn(input, key) || input[key] === undefined) continue;
    if (input[key] === null || (typeof input[key] === "string" && !input[key].trim())) {
      payload[key] = null;
      continue;
    }
    const value = numericValue(input[key]);
    if (!Number.isInteger(value) || value < 1 || value > 5)
      throw new Error("Check-in ratings must be between 1 and 5.");
    payload[key] = value;
  }
  if (hasOwn(input, "note") && input.note !== undefined) {
    if (input.note !== null && typeof input.note !== "string")
      throw new Error("Enter a text note.");
    payload.note = typeof input.note === "string" ? input.note.trim().slice(0, 1000) : "";
  }
  if (hasOwn(input, "tags") && input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((tag) => typeof tag !== "string"))
      throw new Error("Choose valid check-in tags.");
    payload.tags = [
      ...new Set(input.tags.map((tag) => tag.trim().slice(0, 80)).filter(Boolean)),
    ].slice(0, 20);
  }
  if (!allowEmpty && !hasCheckInContent(payload))
    throw new Error("Add one rating or a note to save your check-in.");
  return payload;
}

function matchedRecord(rows: unknown, message: string): Record<string, any> | null {
  if (
    !Array.isArray(rows) ||
    rows.length > 1 ||
    (rows.length === 1 && (!rows[0] || typeof rows[0].id !== "string" || !rows[0].id))
  )
    throw new Error(message);
  return rows[0] || null;
}

async function findDailyCheckIn(date: string) {
  if (!isDiaryDate(date)) throw new Error("Choose today or an earlier check-in date.");
  const existing = await base44.entities.DailyCheckIn.filter({ date }, "-updated_date", 2);
  return matchedRecord(existing, "Your check-in could not be safely matched. Please retry.");
}

export async function readDailyCheckIn(date: string) {
  const existing = await findDailyCheckIn(date);
  if (!existing) return null;
  const normalized = validateCheckIn(existing, { allowEmpty: true });
  if (normalized.date !== date)
    throw new Error("Your check-in returned an unexpected date. Please retry.");
  return { ...existing, ...normalized };
}

// Serializes mutations in this running app, including optional health-data removal.
// The SDK has no transaction/unique-key API; another device can still race a create.
let pendingHealthMutation: Promise<unknown> = Promise.resolve();
let healthSessionGeneration = 0;
export function resetHealthDataSession() {
  healthSessionGeneration += 1;
  // A stalled device bridge from the old account must not block the new account.
  pendingHealthMutation = Promise.resolve();
}

export function withHealthDataMutation<T>(
  operation: (assertCurrent: () => void) => Promise<T>
): Promise<T> {
  const generation = healthSessionGeneration;
  const assertCurrent = () => {
    if (generation !== healthSessionGeneration)
      throw new Error("Your account changed. Please retry in the current account.");
  };
  const run = async () => {
    assertCurrent();
    const value = await operation(assertCurrent);
    assertCurrent();
    return value;
  };
  const result = pendingHealthMutation.then(run, run);
  pendingHealthMutation = result.catch(() => undefined);
  return result;
}

export function saveDailyCheckIn(input: Record<string, unknown>) {
  return withHealthDataMutation(async (assertCurrent) => {
    const payload = validateCheckIn(input, { allowEmpty: true });
    const existing = await findDailyCheckIn(String(payload.date));
    assertCurrent();
    if (!existing && !hasCheckInContent(payload))
      throw new Error("Add one rating or a note to save your check-in.");
    return existing
      ? base44.entities.DailyCheckIn.update(existing.id, payload)
      : base44.entities.DailyCheckIn.create(payload);
  });
}

export function saveDailyWeight(input: { date: string; weight: unknown; unit?: string }) {
  return withHealthDataMutation(async (assertCurrent) => {
    const valid = validateHealthMetric({
      date: input.date,
      metric: "weight",
      value: input.weight,
      unit: input.unit || "lb",
      source: "manual",
    });
    const existing = matchedRecord(
      await base44.entities.WeightEntry.filter({ date: valid.date }, "-updated_date", 2),
      "This day’s weight could not be safely matched. Please retry."
    );
    assertCurrent();
    const payload = { date: valid.date, weight: valid.value, unit: valid.unit };
    return existing
      ? base44.entities.WeightEntry.update(existing.id, payload)
      : base44.entities.WeightEntry.create(payload);
  });
}

async function prepareMetricWrites(payloads: HealthMetricRecord[], assertCurrent = () => {}) {
  const prepared: Array<{ payload: HealthMetricRecord; existing: Record<string, any> | null }> = [];
  for (const payload of payloads) {
    assertCurrent();
    const rows = await base44.entities.HealthMetric.filter(
      { source: payload.source, sourceRecordId: payload.sourceRecordId, metric: payload.metric },
      "-updated_date",
      2
    );
    assertCurrent();
    prepared.push({
      payload,
      existing: matchedRecord(
        rows,
        "This health metric could not be safely matched. Please retry."
      ),
    });
  }
  return prepared;
}

async function writeMetrics(
  prepared: Awaited<ReturnType<typeof prepareMetricWrites>>,
  assertCurrent = () => {},
  onSaved?: (kind: "created" | "updated" | "unchanged") => void
) {
  const saved: HealthMetricRecord[] = [];
  for (const { payload, existing } of prepared) {
    assertCurrent();
    if (existing && equivalentMetric(existing, payload)) {
      saved.push(existing as HealthMetricRecord);
      onSaved?.("unchanged");
      continue;
    }
    saved.push(
      existing
        ? await base44.entities.HealthMetric.update(existing.id, payload)
        : await base44.entities.HealthMetric.create(payload)
    );
    onSaved?.(existing ? "updated" : "created");
  }
  return saved;
}

function equivalentMetric(existing: Record<string, unknown>, payload: HealthMetricRecord) {
  try {
    const current = validateHealthMetric(existing);
    return [
      "date",
      "metric",
      "value",
      "unit",
      "source",
      "sourceRecordId",
      "sourceDevice",
      "aggregation",
      "recordedAt",
      "metadata",
    ].every((key) => JSON.stringify(current[key]) === JSON.stringify(payload[key]));
  } catch {
    return false;
  }
}

export function saveManualHealthMetrics(
  date: string,
  values: Partial<Record<HealthMetricName, { value: number; unit: string }>>
) {
  return withHealthDataMutation(async (assertCurrent) => {
    const payloads = Object.entries(values).map(([metric, value]) =>
      validateHealthMetric({
        date,
        metric,
        value: value?.value,
        unit: value?.unit,
        source: "manual",
        sourceRecordId: `manual:${date}:${metric}`,
        aggregation: "daily",
        importedAt: new Date().toISOString(),
      })
    );
    return writeMetrics(await prepareMetricWrites(payloads, assertCurrent), assertCurrent);
  });
}

export const connectedHealthMetrics = Object.keys(healthMetricDefinitions) as HealthMetricName[];

export function validateHealthBridgeStatus(input: HealthBridgeStatus): HealthBridgeStatus {
  if (!input || !["apple_health", "health_connect"].includes(input.provider))
    throw new Error("The connected health provider is not supported.");
  if (
    (input.provider === "apple_health" && input.platform !== "ios") ||
    (input.provider === "health_connect" && input.platform !== "android")
  )
    throw new Error("The connected health platform is not supported.");
  if (!["connected", "disconnected", "needs_attention"].includes(input.status))
    throw new Error("The connected health status is not supported.");
  if (input.permissionStatus != null && typeof input.permissionStatus !== "string")
    throw new Error("The connected health permission status is invalid.");
  if (input.capabilities != null && !Array.isArray(input.capabilities))
    throw new Error("The connected health permissions are incomplete.");
  if (
    input.deviceNames != null &&
    (!Array.isArray(input.deviceNames) ||
      input.deviceNames.some((name) => typeof name !== "string"))
  )
    throw new Error("The connected health device list is incomplete.");
  const capabilities = Array.isArray(input.capabilities)
    ? [
        ...new Set(
          input.capabilities.filter((value): value is string =>
            connectedHealthMetrics.includes(value as HealthMetricName)
          )
        ),
      ].slice(0, connectedHealthMetrics.length)
    : [];
  const deviceNames = Array.isArray(input.deviceNames)
    ? [...new Set(input.deviceNames.map((value) => value.trim()).filter(Boolean))]
        .slice(0, 20)
        .map((value) => value.slice(0, 120))
    : [];
  const lastSyncedAt = timestamp(input.lastSyncedAt, "health sync");
  return {
    platform: input.platform,
    provider: input.provider,
    status: input.status,
    permissionStatus: (input.permissionStatus || "unknown").slice(0, 120),
    capabilities,
    deviceNames,
    ...(lastSyncedAt ? { lastSyncedAt } : {}),
  };
}

async function findHealthConnection(provider: HealthBridgeStatus["provider"]) {
  return matchedRecord(
    await base44.entities.HealthConnection.filter({ provider }, "-updated_date", 2),
    "The health connection could not be safely matched. Please retry."
  );
}

async function writeHealthConnection(
  status: HealthBridgeStatus,
  existing: Record<string, any> | null,
  message: string
) {
  const { platform: _platform, ...connection } = status;
  const payload = { ...connection, lastSyncMessage: message };
  return existing
    ? base44.entities.HealthConnection.update(existing.id, payload)
    : base44.entities.HealthConnection.create(payload);
}

export function syncHealthBridge({ connectIfNeeded = false } = {}) {
  return withHealthDataMutation(async (assertCurrent) => {
    const bridge = window.limitHealthBridge;
    if (!bridge) throw new Error("Connected health sync is available in the installed mobile app.");
    // Permission prompts can remain open while the signed-in account changes.
    // Keep status, permission, and import in one guarded operation so the old
    // account's continuation cannot start a fresh import in the new session.
    if (connectIfNeeded) {
      const currentStatus = await bridge.getStatus();
      assertCurrent();
      const current = validateHealthBridgeStatus(currentStatus);
      if (current.status !== "connected") {
        const permissionStatus = await bridge.connect(connectedHealthMetrics);
        assertCurrent();
        const permission = validateHealthBridgeStatus(permissionStatus);
        if (permission.status !== "connected")
          throw new Error(
            "Health access was not granted. Your existing records are unchanged; you can keep using manual logging."
          );
        if (permission.provider !== current.provider)
          throw new Error("The connected health provider changed. Please retry.");
      }
    }
    assertCurrent();
    const startedAt = new Date().toISOString();
    let status: HealthBridgeStatus | undefined;
    let auditId: string | undefined;
    let auditAttempted = false;
    let auditWarning: string | undefined;
    const counts = { createdCount: 0, updatedCount: 0, unchangedCount: 0 };
    const audit = async (state: "running" | "succeeded" | "failed", message: string) => {
      assertCurrent();
      if (!status || (auditAttempted && !auditId)) return;
      const payload = {
        provider: status.provider,
        startedAt,
        status: state,
        ...counts,
        ...(state !== "running" ? { completedAt: new Date().toISOString() } : {}),
        message,
      };
      try {
        if (auditId) await base44.entities.HealthImport.update(auditId, payload);
        else {
          auditAttempted = true;
          const saved = await base44.entities.HealthImport.create(payload);
          if (!saved || typeof saved.id !== "string" || !saved.id)
            throw new Error("Missing audit identifier");
          auditId = saved.id;
        }
      } catch {
        auditWarning = "Sync finished, but recent import history could not be saved.";
      }
    };
    try {
      const result = await bridge.sync();
      assertCurrent();
      if (!result || !Array.isArray(result.metrics) || result.metrics.length > 20000)
        throw new Error("The connected health response was incomplete.");
      status = validateHealthBridgeStatus(result.connection);
      if (result.metrics.length && status.status !== "connected")
        throw new Error("Health records cannot import from a disconnected provider.");
      const importedAt = new Date().toISOString();
      const uniqueMetrics = new Map<string, HealthMetricRecord>();
      // Validate every record and all identifiers before the first metric write.
      for (const metric of result.metrics) {
        const payload = validateHealthMetric({ ...metric, importedAt });
        if (payload.source !== status.provider)
          throw new Error("A connected record has the wrong provider source.");
        if (!payload.sourceRecordId)
          throw new Error("A connected health record is missing its source identifier.");
        const key = JSON.stringify([payload.source, payload.sourceRecordId, payload.metric]);
        const duplicate = uniqueMetrics.get(key);
        if (duplicate && JSON.stringify(duplicate) !== JSON.stringify(payload))
          throw new Error("A connected health record has conflicting values. Please retry.");
        uniqueMetrics.set(key, payload);
      }
      const existingConnection = await findHealthConnection(status.provider);
      const prepared = await prepareMetricWrites([...uniqueMetrics.values()], assertCurrent);
      assertCurrent();
      await audit("running", "Importing health records");
      // A network error can interrupt these writes. Retrying updates saved identities.
      const saved = await writeMetrics(prepared, assertCurrent, (kind) => {
        counts[`${kind}Count`] += 1;
      });
      assertCurrent();
      const connection = await writeHealthConnection(
        { ...status, ...(status.status === "connected" ? { lastSyncedAt: importedAt } : {}) },
        existingConnection,
        status.status === "connected"
          ? `${saved.length} health records synced`
          : "Health connection needs attention"
      );
      await audit(
        "succeeded",
        `${counts.createdCount} added, ${counts.updatedCount} updated, ${counts.unchangedCount} unchanged`
      );
      assertCurrent();
      return { ...connection, ...(auditWarning ? { auditWarning } : {}) };
    } catch (error) {
      assertCurrent();
      const savedCount = counts.createdCount + counts.updatedCount;
      await audit(
        "failed",
        savedCount
          ? `Import stopped with ${savedCount} saved records confirmed. Retry safely to finish.`
          : "No writes were confirmed. Retry safely to finish."
      );
      throw error;
    }
  });
}

export function disconnectHealthBridge() {
  return withHealthDataMutation(async (assertCurrent) => {
    const bridge = window.limitHealthBridge;
    if (!bridge?.disconnect)
      throw new Error("Manage health permissions in your device’s health settings.");
    const status = validateHealthBridgeStatus(await bridge.disconnect());
    assertCurrent();
    if (status.status !== "disconnected")
      throw new Error("Your device did not confirm disconnection. Please retry.");
    const existing = await findHealthConnection(status.provider);
    assertCurrent();
    return writeHealthConnection(
      status,
      existing,
      "Disconnected; saved health history is unchanged"
    );
  });
}
