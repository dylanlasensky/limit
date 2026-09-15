import React, { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { readFavorites } from "@/hooks/use-exercise-favorites";

export default function AccountDataExport() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [file, setFile] = useState<File>(),
    [url, setUrl] = useState("");
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );
  const prepare = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    setUrl("");
    setFile(undefined);
    try {
      const { data } = await base44.functions.invoke("exportAccount", {});
      if (data?.schemaVersion !== 1 || data?.account?.id !== user.id || !data?.entities)
        throw new Error("The export could not be verified.");
      const result = new File(
        [
          JSON.stringify(
            { ...data, devicePreferences: { favoriteExerciseIds: readFavorites(user.id) } },
            null,
            2
          ),
        ],
        `limit-data-${new Date().toISOString().slice(0, 10)}.json`,
        { type: "application/json" }
      );
      setFile(result);
      setUrl(URL.createObjectURL(result));
    } catch {
      setError("Couldn’t prepare your complete export. Please try again. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "My LIMIT data" });
    } catch (error) {
      if ((error as Error)?.name !== "AbortError")
        setError("Couldn’t share the file. Try downloading it instead.");
    }
  };
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-semibold">Your data, in your hands</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Export saved workouts, nutrition, measurements, and profile as a readable JSON file.
        Includes favorites on this device, but not unsaved drafts or original uploads. Keep this
        sensitive file somewhere private.
      </p>
      <button
        disabled={busy}
        onClick={prepare}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold disabled:opacity-50"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {busy ? "Preparing export…" : "Export my data"}
      </button>
      {url && file && (
        <div className="mt-3 space-y-2">
          <p role="status" className="text-xs text-muted-foreground">
            Your export is ready. Choose where to save it.
          </p>
          <a
            href={url}
            download={file.name}
            className="flex min-h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Download data file
          </a>
          {typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }) && (
            <button
              onClick={share}
              className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-primary"
            >
              <Share2 className="h-4 w-4" />
              Share or save to Files
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
