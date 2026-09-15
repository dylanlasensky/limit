import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, ShieldCheck, Smartphone, Watch } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { disconnectHealthBridge, sourceLabel, syncHealthBridge } from "@/lib/health/health-data";
import { connectionFreshness, healthDataQueryKeys } from "@/lib/health/health-preferences";
import HealthPreferences from "@/components/health/HealthPreferences";

const ecosystems = [
  {
    provider: "apple_health",
    name: "Apple Health",
    description: "For iPhone, Apple Watch, and apps that share into Apple Health.",
  },
  {
    provider: "health_connect",
    name: "Health Connect",
    description: "For Android and compatible watches, rings, scales, and apps.",
  },
] as const;

export default function ConnectedHealthPanel({ compact = false }: { compact?: boolean }) {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const pending = useRef(false);
  const candidate = typeof window !== "undefined" ? window.limitHealthBridge : undefined;
  const bridge =
    candidate &&
    [candidate.getStatus, candidate.connect, candidate.sync].every(
      (method) => typeof method === "function"
    )
      ? candidate
      : undefined;
  const query = useQuery({
    queryKey: ["healthConnections"],
    queryFn: () => base44.entities.HealthConnection.list("-lastSyncedAt", 20),
    staleTime: 30000,
  });
  const nativeStatus = useQuery({
    queryKey: ["healthBridgeStatus"],
    queryFn: () => bridge!.getStatus(),
    enabled: !!bridge,
    staleTime: 15000,
  });
  const refresh = () => {
    for (const key of [...healthDataQueryKeys, "healthBridgeStatus"])
      void client.invalidateQueries({ queryKey: [key] });
  };
  const mutation = useMutation({
    mutationFn: async (action: "sync" | "disconnect") => {
      if (!bridge)
        throw new Error(
          "This version has no native health bridge. Installing the website does not add Apple Health or Health Connect access."
        );
      if (action === "disconnect") return disconnectHealthBridge();
      return syncHealthBridge({ connectIfNeeded: true });
    },
    onSuccess: (connection) => {
      setMessage(
        [
          connection.lastSyncMessage ||
            (connection.status === "disconnected"
              ? "Native health access disconnected. Your saved LIMIT records remain. Check your device’s health permissions to confirm access is revoked."
              : "Health sync completed."),
          connection.auditWarning,
        ]
          .filter(Boolean)
          .join(" ")
      );
    },
    onError: (failure: any) =>
      setMessage(
        failure?.status || failure?.response
          ? "Connected health could not complete the request. Please retry."
          : failure.message || "Connected health could not sync. Please retry."
      ),
    onSettled: () => {
      pending.current = false;
      refresh();
    },
  });
  const run = (action: "sync" | "disconnect") => {
    if (pending.current || settingsBusy) return;
    pending.current = true;
    setMessage("");
    mutation.mutate(action);
  };
  const rows: any[] = query.data || [];
  const connected = rows.find((row) => row.status === "connected");
  const lastSync = connectionFreshness(connected?.lastSyncedAt);

  return (
    <section className={`limit-surface rounded-3xl ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {connected ? <CheckCircle2 className="h-5 w-5" /> : <Watch className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="limit-kicker text-muted-foreground">Connected health</p>
          <h2 className="mt-1 font-semibold tracking-tight">
            {connected ? `${sourceLabel(connected.provider)} records` : "Bring your day into LIMIT"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {connected
              ? `${connected.deviceNames?.join(", ") || "Saved connection"} · ${lastSync.label}`
              : "Use your phone’s health hub so compatible watches, rings, and smart scales can contribute without separate dashboards."}
          </p>
        </div>
      </div>
      {!compact && !connected && (
        <div className="mt-4 space-y-2">
          {ecosystems.map((item) => (
            <div
              key={item.provider}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
            >
              <Smartphone className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <b className="block text-sm">{item.name}</b>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {bridge ? (
        <button
          onClick={() => run("sync")}
          disabled={mutation.isPending || settingsBusy || nativeStatus.isLoading}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`} />
          {mutation.isPending
            ? mutation.variables === "disconnect"
              ? "Disconnecting…"
              : "Syncing health data…"
            : connected
              ? "Sync now"
              : "Connect health data"}
        </button>
      ) : (
        <p className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
          Device sync is not available in this version. This browser cannot read Apple Health or
          Health Connect, even if you install the website. You can log activity, sleep, and body
          metrics manually.
        </p>
      )}
      {bridge && nativeStatus.error && (
        <p role="alert" className="mt-3 text-xs text-muted-foreground">
          Device permission status is unavailable. Sync now retries the permission check.
        </p>
      )}
      {connected && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Sync time describes the last import, not the date of every measurement. Older values keep
          their original dates. No background sync is promised.
        </p>
      )}
      {query.error && (
        <button
          onClick={() => query.refetch()}
          className="mt-3 min-h-11 w-full rounded-xl border border-border text-xs font-semibold"
        >
          Connection status unavailable · Retry
        </button>
      )}
      {message && (
        <p
          role={mutation.isError ? "alert" : "status"}
          className="mt-3 text-xs text-muted-foreground"
        >
          {message}
        </p>
      )}
      <HealthPreferences
        connections={rows}
        bridgeProvider={nativeStatus.data?.provider}
        canDisconnect={!!bridge && typeof bridge.disconnect === "function"}
        onDisconnect={() => run("disconnect")}
        busy={mutation.isPending}
        onBusyChange={setSettingsBusy}
        onChanged={refresh}
      />
      {!compact && (
        <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            You choose access in your phone’s permission screen. LIMIT stores normalized daily
            values with their source and never treats one provider’s score as another’s.
          </p>
        </div>
      )}
    </section>
  );
}
