import React, { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import SegmentedTabs from "@/components/limit/SegmentedTabs";
import {
  saveManualHealthMetrics,
  preferredDailyMetrics,
  type HealthMetricName,
  type HealthMetricRecord,
} from "@/lib/health/health-data";

const fields = [
  ["steps", "Steps", "steps", "Activity"],
  ["active_calories", "Active calories", "kcal", "Activity"],
  ["exercise_minutes", "Active minutes", "min", "Activity"],
  ["distance", "Distance", "mi", "Activity"],
  ["sleep_hours", "Sleep", "hours", "Sleep"],
  ["sleep_score", "Sleep score", "%", "Sleep"],
  ["resting_heart_rate", "Resting heart rate", "bpm", "Heart"],
  ["heart_rate_variability", "HRV", "ms", "Heart"],
] as const;
type Section = "Activity" | "Sleep" | "Heart";

export default function HealthQuickLog({
  date,
  rows = [],
  initialSection = "Activity",
  onSaved,
}: {
  date: string;
  rows?: HealthMetricRecord[];
  initialSection?: Section;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>(initialSection);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const start = () => {
    const manual = preferredDailyMetrics(
      rows.filter((row) => row.source === "manual"),
      date
    );
    const next: Record<string, string> = {};
    for (const [key] of fields) {
      const row = manual[key === "sleep_hours" ? "sleep_duration" : key];
      if (row)
        next[key] = String(
          key === "sleep_hours" ? Math.round((row.value / 60) * 100) / 100 : row.value
        );
    }
    setDraft(next);
    setTouched([]);
    setSection(initialSection);
    setError("");
    setOpen(true);
  };
  const save = async () => {
    if (saving) return;
    const entered = Object.entries(draft).filter(
      ([key, value]) => touched.includes(key) && value.trim() !== ""
    );
    if (!entered.length) {
      setError("Enter a value to save. Existing entries stay unchanged when a field is blank.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const values = Object.fromEntries(
        entered.map(([metric, raw]) => {
          const field = fields.find(([key]) => key === metric)!;
          return metric === "sleep_hours"
            ? ["sleep_duration", { value: Number(raw) * 60, unit: "min" }]
            : [metric, { value: Number(raw), unit: field[2] }];
        })
      ) as Partial<Record<HealthMetricName, { value: number; unit: string }>>;
      await saveManualHealthMetrics(date, values);
      onSaved();
      setOpen(false);
      setDraft({});
      setTouched([]);
    } catch (failure: any) {
      setError(
        failure?.status || failure?.response
          ? "Couldn’t save every entry. Your values are still here; please retry."
          : failure.message || "Couldn’t save these entries. Please retry."
      );
    } finally {
      for (const key of ["healthData", "todayHealth", "healthSourceOptions"])
        void client.invalidateQueries({ queryKey: [key] });
      setSaving(false);
    }
  };
  return (
    <>
      <button
        ref={opener}
        onClick={start}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary font-semibold text-primary"
      >
        <Plus className="h-4 w-4" />
        Add activity or sleep
      </button>
      <Drawer
        autoFocus
        open={open}
        dismissible={!saving}
        onOpenChange={(next) => !saving && setOpen(next)}
      >
        <DrawerContent
          className="bg-card text-foreground"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus({ preventScroll: true });
          }}
        >
          <section className="no-scrollbar mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => setOpen(false)}
              disabled={saving}
              aria-label="Close health metrics"
              className="float-right grid h-11 w-11 place-items-center rounded-xl bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="limit-kicker">{format(parseISO(date), "MMM d")} · Health entry</p>
            <DrawerTitle className="mt-2 text-2xl font-semibold tracking-tight">
              Add what you know
            </DrawerTitle>
            <DrawerDescription className="mt-2 leading-relaxed">
              Log one thing or a few. Your manual entries can be edited here.
            </DrawerDescription>
            <fieldset disabled={saving} className="min-w-0">
              <SegmentedTabs
                options={["Activity", "Sleep", "Heart"] as Section[]}
                value={section}
                onChange={setSection}
                label="Health entry type"
              />
              <div className="grid grid-cols-2 gap-3">
                {fields
                  .filter((field) => field[3] === section)
                  .map(([key, label, unit]) => (
                    <label key={key} className="text-xs font-semibold text-muted-foreground">
                      {label} ({unit})
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={draft[key] || ""}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, [key]: event.target.value }));
                          setTouched((current) => [...new Set([...current, key])]);
                        }}
                        className="mt-1 h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base font-normal text-foreground"
                      />
                    </label>
                  ))}
              </div>
            </fieldset>
            {section === "Heart" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Use a reading from your device. Leave unfamiliar measurements blank.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="mt-5 min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving metrics…" : "Save health metrics"}
            </button>
          </section>
        </DrawerContent>
      </Drawer>
    </>
  );
}
