import React, { useRef, useState } from "react";
import { BatteryMedium, Check, ChevronRight, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { saveDailyCheckIn } from "@/lib/health/health-data";
import { format, parseISO } from "date-fns";
import useLocalDate from "@/hooks/use-local-date";

const ratings = [
  ["energy", "Energy", "Drained", "Energized"],
  ["soreness", "Soreness", "None", "Very sore"],
  ["mood", "Mood", "Low", "Great"],
  ["stress", "Stress", "Calm", "Very high"],
  ["sleepQuality", "Sleep quality", "Poor", "Restful"],
] as const;

export default function DailyCheckIn({
  date,
  value,
  onSaved,
}: {
  date: string;
  value?: Record<string, any> | null;
  onSaved: (saved: Record<string, any>) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = useLocalDate();
  const [draft, setDraft] = useState<Record<string, any>>({ date });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const opener = useRef<HTMLButtonElement>(null);
  const start = () => {
    setDraft({ ...(value || {}), date });
    setError("");
    setOpen(true);
  };
  const close = () => !saving && setOpen(false);
  const save = async () => {
    if (saving) return;
    if (
      !value?.id &&
      !ratings.some(([key]) => draft[key] != null) &&
      !String(draft.note || "").trim()
    ) {
      setError("Add one rating or a note to save your check-in.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await saveDailyCheckIn(draft);
      onSaved(saved);
      setOpen(false);
    } catch (failure: any) {
      setError(
        failure?.status || failure?.response
          ? "Couldn’t save your check-in. Your answers are still here; please retry."
          : failure.message || "Couldn’t save your check-in. Please retry."
      );
    } finally {
      setSaving(false);
    }
  };
  const hasCheckIn = value && (ratings.some(([key]) => value[key] != null) || !!value.note);
  return (
    <>
      <button
        ref={opener}
        onClick={start}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {hasCheckIn ? <Check className="h-5 w-5" /> : <BatteryMedium className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-sm">
            {hasCheckIn
              ? date === today
                ? "Today’s check-in"
                : "Your check-in"
              : date === today
                ? "How do you feel?"
                : "How did you feel?"}
          </b>
          <span className="mt-1 block text-xs text-muted-foreground">
            {hasCheckIn
              ? ratings
                  .filter(([key]) => value[key] != null)
                  .slice(0, 2)
                  .map(([key, label]) => `${label} ${value[key]}/5`)
                  .join(" · ") || "Your note is saved"
              : "A private 30-second check-in—no device required."}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <Drawer autoFocus open={open} dismissible={!saving} onOpenChange={(next) => !next && close()}>
        <DrawerContent
          className="bg-card text-foreground"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus({ preventScroll: true });
          }}
        >
          <section className="no-scrollbar mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <button
              onClick={close}
              disabled={saving}
              aria-label="Close daily check-in"
              className="float-right grid h-11 w-11 place-items-center rounded-xl bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="limit-kicker">{format(parseISO(date), "MMM d")} · Check-in</p>
            <DrawerTitle className="mt-2 text-2xl font-semibold tracking-tight">
              Meet yourself where you are
            </DrawerTitle>
            <DrawerDescription className="mb-5 mt-2 leading-relaxed">
              Ratings are personal context—not a diagnosis or a command to train.
            </DrawerDescription>
            <fieldset disabled={saving} className="space-y-5">
              {ratings.map(([key, label, low, high]) => (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <label className="font-semibold" id={`${key}-label`}>
                      {label}
                    </label>
                    <span className="tabular-nums text-muted-foreground">
                      {draft[key] ? `${draft[key]} / 5` : "Optional"}
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-5 gap-2"
                    role="group"
                    aria-labelledby={`${key}-label`}
                  >
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            [key]: current[key] === score ? null : score,
                          }))
                        }
                        aria-pressed={draft[key] === score}
                        aria-label={`${label} ${score} of 5`}
                        className={`min-h-11 rounded-xl border text-sm font-semibold ${draft[key] === score ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>{low}</span>
                    <span>{high}</span>
                  </div>
                </div>
              ))}
              <label className="block text-xs font-semibold">
                Note <span className="font-normal text-muted-foreground">(optional)</span>
                <textarea
                  value={draft.note || ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.target.value }))
                  }
                  maxLength={1000}
                  placeholder="Anything that could add context to your day?"
                  className="mt-2 min-h-24 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm font-normal"
                />
              </label>
            </fieldset>
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
              {saving ? "Saving check-in…" : hasCheckIn ? "Update check-in" : "Save check-in"}
            </button>
          </section>
        </DrawerContent>
      </Drawer>
    </>
  );
}
