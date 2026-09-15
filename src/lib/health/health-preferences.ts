import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  healthMetricDefinitions,
  type HealthMetricName,
  type HealthSource,
  withHealthDataMutation,
} from "@/lib/health/health-data";

export interface HealthPreferencesValue {
  hiddenMetrics: HealthMetricName[];
  preferredSources: Partial<Record<HealthMetricName, HealthSource>>;
}
export const defaultHealthPreferences: HealthPreferencesValue = {
  hiddenMetrics: [],
  preferredSources: {},
};
export const healthPreferenceQueryKey = ["healthPreferences"];
export const healthSources: HealthSource[] = [
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
];

export function validateHealthPreferences(input: unknown): HealthPreferencesValue {
  if (!input || typeof input !== "object")
    throw new Error("Your health settings could not be read.");
  const value = input as Record<string, unknown>;
  const hidden = value.hiddenMetrics ?? [];
  const preferred = value.preferredSources ?? {};
  if (
    !Array.isArray(hidden) ||
    hidden.some(
      (metric) => typeof metric !== "string" || !Object.hasOwn(healthMetricDefinitions, metric)
    )
  )
    throw new Error("Choose supported health metrics.");
  if (!preferred || typeof preferred !== "object" || Array.isArray(preferred))
    throw new Error("Choose supported health sources.");
  for (const [metric, source] of Object.entries(preferred)) {
    if (
      !Object.hasOwn(healthMetricDefinitions, metric) ||
      !healthSources.includes(source as HealthSource)
    )
      throw new Error("Choose supported health sources.");
  }
  return {
    hiddenMetrics: [...new Set(hidden)] as HealthMetricName[],
    preferredSources: { ...preferred },
  };
}

async function preferenceRecord() {
  const rows = await base44.entities.HealthPreference.list("-updated_date", 2);
  if (!Array.isArray(rows) || rows.length > 1 || (rows[0] && !rows[0].id))
    throw new Error("Your health settings could not be safely matched. Please retry.");
  return rows[0];
}
export async function readHealthPreferences(): Promise<HealthPreferencesValue> {
  const row = await preferenceRecord();
  return row ? validateHealthPreferences(row) : { hiddenMetrics: [], preferredSources: {} };
}
export function useHealthPreferences() {
  const query = useQuery({
    queryKey: healthPreferenceQueryKey,
    queryFn: readHealthPreferences,
    staleTime: 30000,
  });
  const preferences = query.data ?? defaultHealthPreferences;
  return {
    ...query,
    preferences,
    isMetricVisible: (metric: HealthMetricName) => !preferences.hiddenMetrics.includes(metric),
  };
}
export async function saveHealthPreferences(input: unknown) {
  const payload = validateHealthPreferences(input);
  const user = await base44.auth.me();
  if (!user?.id) throw new Error("Sign in again before saving health preferences.");
  return withHealthDataMutation(async (assertCurrent) => {
    if ((await base44.auth.me())?.id !== user.id)
      throw new Error("Your signed-in account changed. Please retry.");
    const existing = await preferenceRecord();
    if ((await base44.auth.me())?.id !== user.id)
      throw new Error("Your signed-in account changed. Please retry.");
    assertCurrent();
    const saved = existing
      ? await base44.entities.HealthPreference.update(existing.id, payload)
      : await base44.entities.HealthPreference.create(payload);
    if (!saved?.id || (existing && saved.id !== existing.id))
      throw new Error("The saved health settings could not be confirmed. Please retry.");
    const verified = validateHealthPreferences(saved);
    if (JSON.stringify(verified) !== JSON.stringify(payload))
      throw new Error("The saved health settings could not be confirmed. Please retry.");
    return verified;
  });
}

export function connectionFreshness(timestamp?: string, now = Date.now()) {
  const time = Date.parse(timestamp || "");
  if (!Number.isFinite(time) || time > now + 300000)
    return { label: "No verified sync time", stale: true };
  const hours = Math.max(0, (now - time) / 3600000);
  const date = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(time));
  return {
    label: `${hours >= 24 ? "Sync may be out of date" : "Last sync"} · ${date}`,
    stale: hours >= 24,
  };
}

export const healthDataCollections = [
  "HealthMetric",
  "DailyCheckIn",
  "HealthConnection",
  "HealthImport",
  "WeightEntry",
  "BodyMeasurement",
] as const;
export const healthDataQueryKeys = [
  "healthData",
  "todayHealth",
  "healthConnections",
  "healthImports",
  "dailyCheckIn",
  "dailyCheckIns",
  "progressData",
  "healthBodyHistory",
  "weightEntries",
  "homeData",
  "healthSourceOptions",
];

export async function deleteHealthData(confirmed: boolean) {
  if (confirmed !== true) throw new Error("Confirm the health data deletion first.");
  const user = await base44.auth.me();
  if (!user?.id) throw new Error("Sign in again before deleting health data.");
  return withHealthDataMutation(async (assertCurrent) => {
    const scope = { created_by_id: user.id };
    let deletedCount = 0;
    for (const name of healthDataCollections) {
      const entity = base44.entities[name];
      const seen = new Set<string>();
      let finished = false;
      // Always remove the first page: offset pagination skips rows while deleting.
      for (let batch = 0; batch < 200; batch += 1) {
        if ((await base44.auth.me())?.id !== user.id)
          throw new Error("Your signed-in account changed. Deletion stopped.");
        const rows = await entity.filter(scope, "created_date", 250, 0);
        assertCurrent();
        if (
          !Array.isArray(rows) ||
          rows.some(
            (row) =>
              !row.id || seen.has(row.id) || (row.created_by_id && row.created_by_id !== user.id)
          )
        )
          throw new Error("The health data list could not be verified. Deletion stopped.");
        if (!rows.length) {
          finished = true;
          break;
        }
        for (const row of rows) {
          assertCurrent();
          seen.add(row.id);
          try {
            const result = await entity.delete(row.id);
            if (result?.success !== true) throw new Error("Deletion could not be confirmed.");
          } catch (error: any) {
            if ((error?.status || error?.response?.status) !== 404) throw error;
          }
          deletedCount += 1;
        }
      }
      if (!finished) throw new Error("Some health data may remain. Please retry deletion.");
    }
    if ((await base44.auth.me())?.id !== user.id)
      throw new Error("Your signed-in account changed. Deletion stopped.");
    // A second pass detects concurrent device imports or other-client writes.
    for (const name of healthDataCollections) {
      assertCurrent();
      const remaining = await base44.entities[name].filter(scope, "created_date", 1, 0);
      if (!Array.isArray(remaining) || remaining.length)
        throw new Error(
          "New or remaining health data was found. Stop syncing other devices and retry."
        );
    }
    assertCurrent();
    return { deletedCount };
  });
}

export async function readHealthImports(limit = 20) {
  const rows = await base44.entities.HealthImport.list("-startedAt", limit + 1, 0);
  if (!Array.isArray(rows)) throw new Error("Import history could not be loaded.");
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}
