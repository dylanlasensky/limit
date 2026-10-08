import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import { ownerOpsSchema, type OwnerOps } from "../../packages/contracts/ownerOps";
import ScreenState from "@/components/limit/ScreenState";

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-secondary"
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function OwnerOperations() {
  const [data, setData] = useState<OwnerOps | null>(null);
  const [error, setError] = useState("");
  const refresh = () => {
    setError("");
    apiRequest("/owner-ops", ownerOpsSchema)
      .then(setData)
      .catch(() => setError("Owner operations are unavailable for this account or environment."));
  };
  useEffect(refresh, []);
  if (error)
    return (
      <ScreenState title="Owner operations unavailable" description={error} onAction={refresh} />
    );
  if (!data) return <ScreenState loading />;
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div>
        <p className="limit-kicker">LIMIT · owner only</p>
        <h1 className="font-heading text-3xl font-bold">Operations</h1>
        <p className="mt-2 text-sm text-muted-foreground">{data.scope}</p>
      </div>
      <section className="limit-surface space-y-2 rounded-2xl p-5" aria-label="Release">
        <h2 className="font-heading text-xl font-semibold">Release</h2>
        <p>
          Environment: <strong>{data.environment}</strong>
        </p>
        <p className="break-all text-sm">Source: {data.sourceRevision}</p>
        <p className="break-all text-sm">Worker version: {data.workerVersion}</p>
      </section>
      <section className="limit-surface space-y-4 rounded-2xl p-5" aria-label="Application usage">
        <h2 className="font-heading text-xl font-semibold">Application headroom</h2>
        <Meter label="Storage requests this month" {...data.storage.requestsThisMonth} />
        <Meter
          label="Uploaded bytes reserved for this environment"
          {...data.storage.uploadedBytesLifetime}
        />
        <Meter
          label="Uploaded objects reserved for this environment"
          {...data.storage.uploadedObjectsLifetime}
        />
        <Meter label="AI requests today" {...data.ai.requestsToday} />
      </section>
      <section className="limit-surface space-y-3 rounded-2xl p-5" aria-label="Email readiness">
        <h2 className="font-heading text-xl font-semibold">Email</h2>
        <p>{data.email.ready ? "Ready for transactional delivery" : "Delivery not configured"}</p>
        {!data.email.ready && (
          <p className="text-sm text-muted-foreground">
            {[
              !data.email.enabled && "enablement",
              !data.email.senderConfigured && "verified sender",
              !data.email.keyConfigured && "restricted sending key",
            ]
              .filter(Boolean)
              .join(", ") || "Provider check needed"}{" "}
            remains.
          </p>
        )}
        <Meter label="Email sends today" {...data.email.daily} />
        <Meter label="Email sends this month" {...data.email.monthly} />
      </section>
      <section className="limit-surface rounded-2xl p-5" aria-label="Operational errors">
        <h2 className="font-heading text-xl font-semibold">Worker errors · last 7 days</h2>
        {data.errors.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {data.errors.map((row) => (
              <li key={`${row.day}:${row.stage}`} className="flex justify-between gap-3">
                <span>
                  {row.day} · {row.stage}
                </span>
                <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No recorded server errors in this window.
          </p>
        )}
      </section>
      <button
        type="button"
        onClick={refresh}
        className="min-h-11 rounded-xl bg-secondary px-5 font-semibold"
      >
        Refresh status
      </button>
    </main>
  );
}
