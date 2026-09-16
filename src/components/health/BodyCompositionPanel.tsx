import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Scale, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import {
  formatHealthValue,
  latestDailyMetrics,
  preferredDailyMetrics,
  saveManualHealthMetrics,
  saveDailyWeight,
  validateHealthMetric,
  sourceLabel,
  healthMetricDefinitions,
  type HealthMetricName,
  type HealthMetricRecord,
} from "@/lib/health/health-data";
import { useHealthPreferences } from "@/lib/health/health-preferences";

const mainMetrics: HealthMetricName[] = ["weight", "body_fat", "waist_circumference"];
const moreMetrics: HealthMetricName[] = [
  "lean_body_mass",
  "skeletal_muscle_mass",
  "body_water",
  "fat_mass",
  "bone_mass",
  "visceral_fat",
  "hip_circumference",
];
type BodyMetricCard = {
  metric: HealthMetricName;
  label: string;
  value: string | null;
  date: string;
  source: string;
};
export default function BodyCompositionPanel({
  date,
  rows,
  latestWeight,
  onSaved,
}: {
  date: string;
  rows: HealthMetricRecord[];
  latestWeight?: { weight: number; unit: string; date: string; source?: string } | null;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const { preferences, isMetricVisible } = useHealthPreferences();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<string[]>([]);
  const [optimisticCards, setOptimisticCards] = useState<
    Partial<Record<HealthMetricName, BodyMetricCard>>
  >({});
  useEffect(() => setOptimisticCards({}), [date]);
  const latest = latestDailyMetrics(rows, date, preferences.preferredSources);
  const cards = [...mainMetrics, ...moreMetrics]
    .filter(isMetricVisible)
    .flatMap<BodyMetricCard>((metric) => {
    if (optimisticCards[metric]) return [optimisticCards[metric]!];
    if (metric === "weight" && latestWeight)
      return [
        {
          metric,
          label: "Weight",
          value: latestWeight.weight + " " + latestWeight.unit,
          date: latestWeight.date,
          source: sourceLabel(latestWeight.source || "manual"),
        },
      ];
    const row = latest[metric];
    return row
      ? [
          {
            metric,
            label: healthMetricDefinitions[metric].label,
            value: formatHealthValue(row),
            date: row.date,
            source: sourceLabel(row.source),
          },
        ]
      : [];
  });
  const start = () => {
    const manual = preferredDailyMetrics(
      rows.filter((row) => row.source === "manual"),
      date
    );
    const next: Record<string, string> = {};
    for (const metric of [...mainMetrics, ...moreMetrics])
      if (manual[metric]) next[metric] = String(manual[metric]!.value);
    if (latestWeight?.date === date && (!latestWeight.source || latestWeight.source === "manual"))
      next.weight = String(latestWeight.weight);
    setDraft(next);
    setTouched([]);
    setError("");
    setOpen(true);
  };
  const save = async () => {
    if (saving) return;
    const entered = Object.entries(draft).filter(
      ([metric, value]) => touched.includes(metric) && value.trim() !== ""
    );
    if (!entered.length) {
      setError("Enter a measurement to save. Blank fields leave existing entries unchanged.");
      return;
    }
    setSaving(true);
    setError("");
    const previousCards = optimisticCards;
    try {
      // Validate the whole form before saving any field.
      const payloads = entered.map(([metric, value]) =>
        validateHealthMetric({
          date,
          metric,
          value,
          unit: healthMetricDefinitions[metric as HealthMetricName].unit,
          source: "manual",
        })
      );
      const optimisticUpdates = payloads.reduce<
        Partial<Record<HealthMetricName, BodyMetricCard>>
      >((updates, row) => {
        const metric = row.metric as HealthMetricName;
        updates[metric] = {
          metric,
          label: healthMetricDefinitions[metric].label,
          value: formatHealthValue(row),
          date,
          source: sourceLabel("manual"),
        };
        return updates;
      }, {});
      setOptimisticCards((current) => ({ ...current, ...optimisticUpdates }));
      const weight = payloads.find((row) => row.metric === "weight");
      if (weight) await saveDailyWeight({ date, weight: weight.value, unit: "lb" });
      const values = Object.fromEntries(
        payloads
          .filter((row) => row.metric !== "weight")
          .map((row) => [row.metric, { value: row.value, unit: row.unit }])
      );
      if (Object.keys(values).length) await saveManualHealthMetrics(date, values);
      onSaved();
      setOpen(false);
      setDraft({});
      setTouched([]);
    } catch (failure: any) {
      setOptimisticCards(previousCards);
      setError(
        failure?.status || failure?.response
          ? "Couldn’t save every measurement. Your entries are still here; please retry."
          : failure.message || "Couldn’t save your measurements. Please retry."
      );
    } finally {
      // A server may save some fields before a later request fails. Refresh
      // confirmed records while retaining the draft for a safe retry.
      for (const key of [
        "healthData",
        "todayHealth",
        "healthBodyHistory",
        "progressData",
        "weightEntries",
        "healthSourceOptions",
      ])
        void client.invalidateQueries({ queryKey: [key] });
      setSaving(false);
    }
  };
  const renderFields = (metrics: HealthMetricName[]) => (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((metric) => {
        const definition = healthMetricDefinitions[metric];
        return (
          <label key={metric} className="text-xs font-semibold text-muted-foreground">
            {definition.label} ({definition.unit})
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={draft[metric] || ""}
              onChange={(event) => {
                setDraft((current) => ({ ...current, [metric]: event.target.value }));
                setTouched((current) => [...new Set([...current, metric])]);
              }}
              className="mt-1 h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base font-normal text-foreground"
            />
          </label>
        );
      })}
    </div>
  );
  const renderCards = (items: typeof cards) => (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {items.map((card) => (
        <div key={card.metric} className="rounded-2xl bg-secondary p-3">
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <b className="mt-1 block break-words text-lg tabular-nums">{card.value}</b>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {card.source} · {format(parseISO(card.date), "MMM d, yyyy")}
          </p>
        </div>
      ))}
    </div>
  );
  return (
    <>
      <section className="limit-surface rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="limit-kicker text-muted-foreground">Body measurements</p>
            <h2 className="mt-1 font-semibold tracking-tight">Your body, over time</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Track what helps you. Every measurement is optional.
            </p>
          </div>
          <Scale className="h-5 w-5 shrink-0 text-primary" />
        </div>
        {cards.length ? (
          <>
            {renderCards(cards.slice(0, 4))}
            {cards.length > 4 && (
              <details className="mt-4">
                <summary className="min-h-8 cursor-pointer text-sm font-semibold">
                  More measurements
                </summary>
                {renderCards(cards.slice(4))}
              </details>
            )}
          </>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Your measurements will appear here when you choose to add them.
          </p>
        )}
        <button
          ref={opener}
          onClick={start}
          className="mt-4 min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
        >
          Add body metrics
        </button>
      </section>
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
              aria-label="Close body metrics"
              className="float-right grid h-11 w-11 place-items-center rounded-xl bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="limit-kicker">{format(parseISO(date), "MMM d")} · Body metrics</p>
            <DrawerTitle className="mt-2 text-2xl font-semibold tracking-tight">
              Add your measurements
            </DrawerTitle>
            <DrawerDescription className="mb-5 mt-2 leading-relaxed">
              Start with one measurement. Leave anything you don’t track blank.
            </DrawerDescription>
            <fieldset disabled={saving} className="min-w-0 space-y-5">
              {renderFields(mainMetrics)}
              <details>
                <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                  More measurements
                </summary>
                {renderFields(moreMetrics)}
              </details>
            </fieldset>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Smart-scale body estimates can vary with hydration. Compare readings taken under
              similar conditions.
            </p>
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
              {saving ? "Saving metrics…" : "Save body metrics"}
            </button>
          </section>
        </DrawerContent>
      </Drawer>
    </>
  );
}