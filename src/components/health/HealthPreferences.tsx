import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Trash2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import useModalHistory from "@/hooks/use-modal-history";
import {
  healthMetricDefinitions,
  sourceLabel,
  type HealthMetricName,
  type HealthSource,
} from "@/lib/health/health-data";
import {
  connectionFreshness,
  deleteHealthData,
  healthDataQueryKeys,
  healthPreferenceQueryKey,
  healthSources,
  readHealthImports,
  saveHealthPreferences,
  useHealthPreferences,
  type HealthPreferencesValue,
} from "@/lib/health/health-preferences";

interface Props {
  connections: any[];
  bridgeProvider?: string;
  canDisconnect: boolean;
  onDisconnect: () => void;
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onChanged: () => void;
}
const metrics = Object.keys(healthMetricDefinitions) as HealthMetricName[];

function PreferenceControls({
  initial,
  blocked,
  onSave,
}: {
  initial: HealthPreferencesValue;
  blocked: boolean;
  onSave: (value: HealthPreferencesValue) => void;
}) {
  const [draft, setDraft] = useState<HealthPreferencesValue>(() => ({
    hiddenMetrics: [...initial.hiddenMetrics],
    preferredSources: { ...initial.preferredSources },
  }));
  return (
    <fieldset disabled={blocked} className="space-y-3">
      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer py-1 text-sm font-semibold">Metric visibility</summary>
        <p className="my-3 text-xs leading-relaxed text-muted-foreground">
          Choose what appears in your health summaries. Hiding a metric does not delete it or change
          device permissions.
        </p>
        <div className="divide-y divide-border">
          {metrics.map((metric) => (
            <label
              key={metric}
              className="flex min-h-11 items-center justify-between gap-3 text-sm"
            >
              {healthMetricDefinitions[metric].label}
              <input
                type="checkbox"
                aria-label={`Show ${healthMetricDefinitions[metric].label}`}
                checked={!draft.hiddenMetrics.includes(metric)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    hiddenMetrics: event.target.checked
                      ? current.hiddenMetrics.filter((value) => value !== metric)
                      : [...current.hiddenMetrics, metric],
                  }))
                }
                className="h-5 w-5 accent-primary"
              />
            </label>
          ))}
        </div>
      </details>
      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer py-1 text-sm font-semibold">
          Preferred sources · optional
        </summary>
        <p className="my-3 text-xs leading-relaxed text-muted-foreground">
          Automatic works well for most people. If a preferred source has no daily value, LIMIT
          falls back to automatic selection. In Automatic, your manual corrections take priority.
          Selecting a source gives its readings priority instead.
        </p>
        <div className="space-y-3">
          {metrics
            .filter((metric) => !draft.hiddenMetrics.includes(metric))
            .map((metric) => (
              <label key={metric} className="block text-xs font-medium text-muted-foreground">
                {healthMetricDefinitions[metric].label}
                <select
                  aria-label={`Preferred source for ${healthMetricDefinitions[metric].label}`}
                  value={draft.preferredSources[metric] || "automatic"}
                  onChange={(event) =>
                    setDraft((current) => {
                      const preferredSources = { ...current.preferredSources };
                      if (event.target.value === "automatic") delete preferredSources[metric];
                      else preferredSources[metric] = event.target.value as HealthSource;
                      return { ...current, preferredSources };
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                >
                  <option value="automatic">Automatic</option>
                  {healthSources.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabel(source)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </div>
      </details>
      <button
        onClick={() => onSave(draft)}
        className="min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
      >
        Save health preferences
      </button>
    </fieldset>
  );
}

export default function HealthPreferences({
  connections,
  bridgeProvider,
  canDisconnect,
  onDisconnect,
  busy = false,
  onBusyChange,
  onChanged,
}: Props) {
  const query = useHealthPreferences();
  const client = useQueryClient();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLimit, setAuditLimit] = useState(20);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const isOpen = useRef(false);
  const blocked = working || busy;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const dismiss = useCallback(() => {
    if (!inFlight.current && !blockedRef.current) {
      isOpen.current = false;
      setOpen(false);
    }
  }, []);
  const close = useModalHistory(open, dismiss);
  const audit = useQuery({
    queryKey: ["healthImports", auditLimit],
    queryFn: () => readHealthImports(auditLimit),
    enabled: open && auditOpen,
    staleTime: 30000,
  });
  const perform = async (operation: "save" | "delete", value?: HealthPreferencesValue) => {
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setWorking(true);
    onBusyChange?.(true);
    setError("");
    setMessage("");
    try {
      if (operation === "save") {
        const saved = await saveHealthPreferences(value);
        if (!mounted.current) return;
        client.setQueryData(healthPreferenceQueryKey, saved);
        setMessage("Health preferences saved.");
      } else {
        if (!confirmDelete || !understood)
          throw new Error("Review and confirm the deletion scope first.");
        for (const key of healthDataQueryKeys) await client.cancelQueries({ queryKey: [key] });
        await deleteHealthData(true);
        if (!mounted.current) return;
        // Keep loaded views mounted so their confirmation dialog survives.
        // Resetting active queries puts the parent back into its loading state.
        for (const key of healthDataQueryKeys) {
          client.setQueriesData({ queryKey: [key] }, (current: any) => {
            if (current === undefined) return current;
            if (key === "dailyCheckIn") return null;
            if (key === "healthImports") return { rows: [], hasMore: false };
            if (key === "progressData" || key === "healthBodyHistory")
              return { ...current, weights: [] };
            if (Array.isArray(current)) return [];
            return current;
          });
          void client.invalidateQueries({ queryKey: [key] });
        }
        if (!mounted.current) return;
        setConfirmDelete(false);
        setUnderstood(false);
        setMessage(
          "Health records removed from LIMIT. Your workouts, nutrition, profile, and health preferences are unchanged. Device records and permissions are unchanged; syncing again can reimport data."
        );
      }
    } catch {
      if (!mounted.current) return;
      setError(
        operation === "save"
          ? "Couldn’t save your health preferences. Your choices are still here; please retry."
          : "Couldn’t verify complete health deletion. Some records may already be removed. Stop syncing other devices and retry; your workouts and nutrition are not part of this action."
      );
    } finally {
      if (mounted.current) {
        inFlight.current = false;
        setWorking(false);
        onBusyChange?.(false);
        onChanged();
      }
    }
  };
  return (
    <>
      <button
        ref={opener}
        onClick={() => {
          isOpen.current = true;
          setOpen(true);
          setError("");
          setMessage("");
          setConfirmDelete(false);
          setUnderstood(false);
        }}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium"
      >
        <Settings2 className="h-4 w-4" /> Health settings & data
      </button>
      <Drawer
        autoFocus
        open={open}
        dismissible={!blocked}
        onOpenChange={(value) => !value && close()}
      >
        <DrawerContent
          className="bg-card text-foreground"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (mounted.current && !isOpen.current && opener.current?.isConnected)
              opener.current.focus({ preventScroll: true });
          }}
        >
          <div className="mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="limit-kicker">Your data, your view</p>
                <DrawerTitle className="mt-2 text-2xl font-semibold">Health settings</DrawerTitle>
              </div>
              <button
                aria-label="Close health settings"
                onClick={close}
                disabled={blocked}
                className="grid h-11 w-11 place-items-center rounded-xl bg-secondary disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DrawerDescription className="mb-5 mt-2 text-sm">
              Everything here is optional. Automatic source choices and available metrics are the
              default.
            </DrawerDescription>
            {open &&
              (query.isLoading ? (
                <p role="status" className="py-4 text-sm text-muted-foreground">
                  Loading your health preferences…
                </p>
              ) : query.error ? (
                <div role="alert" className="mb-4 text-sm">
                  <p>Couldn’t load your saved preferences. Reload before changing them.</p>
                  <button
                    onClick={() => query.refetch()}
                    className="mt-2 min-h-11 rounded-xl border border-border px-4"
                  >
                    Retry health preferences
                  </button>
                </div>
              ) : (
                <PreferenceControls
                  initial={query.preferences}
                  blocked={blocked}
                  onSave={(value) => void perform("save", value)}
                />
              ))}
            <details className="mt-4 rounded-2xl border border-border p-4">
              <summary className="cursor-pointer py-1 text-sm font-semibold">
                Connections & permissions
              </summary>
              <p className="my-3 text-xs leading-relaxed text-muted-foreground">
                Disconnect stops access through the available native bridge; it does not remove
                saved LIMIT records or device records. Revoking permission may also require your
                phone’s health settings.
              </p>
              {connections.length ? (
                connections.map((row) => (
                  <div key={row.id || row.provider} className="mt-3 rounded-xl bg-secondary/60 p-3">
                    <p className="text-sm font-medium">
                      {sourceLabel(row.provider)} ·{" "}
                      {row.status === "connected"
                        ? "Saved connection"
                        : row.status === "disconnected"
                          ? "Disconnected"
                          : "Needs attention"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {connectionFreshness(row.lastSyncedAt).label}
                    </p>
                    {bridgeProvider === row.provider &&
                    canDisconnect &&
                    row.status !== "disconnected" ? (
                      <button
                        disabled={blocked}
                        onClick={onDisconnect}
                        className="mt-2 min-h-11 w-full rounded-xl border border-border text-sm disabled:opacity-50"
                      >
                        Disconnect {sourceLabel(row.provider)}
                      </button>
                    ) : (
                      row.status !== "disconnected" && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          This browser cannot revoke that device’s access. Manage LIMIT in Apple
                          Health or Health Connect permissions on the device that connected.
                        </p>
                      )
                    )}
                  </div>
                ))
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No saved device connections.</p>
              )}
            </details>
            <details
              onToggle={(event) => setAuditOpen(event.currentTarget.open)}
              className="mt-3 rounded-2xl border border-border p-4"
            >
              <summary className="cursor-pointer py-1 text-sm font-semibold">
                Import history
              </summary>
              <p className="my-3 text-xs text-muted-foreground">
                Recorded sync attempts, not a live device feed. Older imports made before history
                was introduced may not have an audit entry.
              </p>
              {audit.isLoading ? (
                <p className="text-sm">Loading import history…</p>
              ) : audit.error ? (
                <button onClick={() => audit.refetch()} className="min-h-11 text-sm text-primary">
                  Import history unavailable · Retry
                </button>
              ) : (
                <>
                  {!audit.data?.rows.length && (
                    <p className="text-sm text-muted-foreground">No recorded imports yet.</p>
                  )}
                  <ol className="divide-y divide-border">
                    {audit.data?.rows.map((row) => (
                      <li key={row.id} className="py-3 text-xs">
                        <p className="font-semibold">
                          {sourceLabel(row.provider)} ·{" "}
                          {row.status === "succeeded"
                            ? "Completed"
                            : row.status === "failed"
                              ? "Incomplete · retry sync"
                              : "Completion not yet confirmed"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {Number.isFinite(Date.parse(row.startedAt))
                            ? new Date(row.startedAt).toLocaleString()
                            : "Import time unavailable"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {row.createdCount || 0} new · {row.updatedCount || 0} updated ·{" "}
                          {row.unchangedCount || 0} unchanged
                        </p>
                      </li>
                    ))}
                  </ol>
                  {audit.data?.hasMore && (
                    <button
                      onClick={() => setAuditLimit((value) => value + 20)}
                      className="min-h-11 w-full text-sm text-primary"
                    >
                      Load older imports
                    </button>
                  )}
                </>
              )}
            </details>
            <details className="mt-3 rounded-2xl border border-destructive/25 p-4">
              <summary className="cursor-pointer py-1 text-sm font-semibold">
                Remove health data
              </summary>
              <p className="my-3 text-xs leading-relaxed text-muted-foreground">
                Removes all imported and manually logged health measurements, weight history, daily
                check-ins, connection records, and import history from this LIMIT account. Keeps
                workouts, nutrition, profile starting weight and goals, and health preferences.
              </p>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                This cannot be undone. Device records and device permissions are not deleted. Revoke
                LIMIT’s health access on every connected device to prevent future reimports. Avoid
                syncing or editing health data on other devices while deletion runs.
              </p>
              {confirmDelete ? (
                <>
                  <label className="flex items-start gap-3 text-xs leading-relaxed">
                    <input
                      type="checkbox"
                      checked={understood}
                      disabled={blocked}
                      onChange={(event) => setUnderstood(event.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                    />
                    I understand which records will be removed and that device permissions are
                    unchanged.
                  </label>
                  <button
                    disabled={blocked || !understood}
                    onClick={() => void perform("delete")}
                    className="mt-3 min-h-12 w-full rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-40"
                  >
                    {working ? "Removing health data…" : "Confirm health data deletion"}
                  </button>
                  <button
                    disabled={blocked}
                    onClick={() => {
                      setConfirmDelete(false);
                      setUnderstood(false);
                    }}
                    className="mt-2 min-h-11 w-full text-sm"
                  >
                    Keep my health data
                  </button>
                </>
              ) : (
                <button
                  disabled={blocked}
                  onClick={() => {
                    setConfirmDelete(true);
                    setError("");
                    setMessage("");
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 text-sm text-destructive disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete health data from LIMIT
                </button>
              )}
            </details>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="mt-4 rounded-xl bg-primary/10 p-3 text-sm">
                {message}
              </p>
            )}
            {blocked && (
              <p role="status" className="mt-3 text-xs text-muted-foreground">
                Please keep this screen open while your request completes.
              </p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
