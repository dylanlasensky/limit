import React, { useMemo, useState } from "react";
import { Check, Calculator } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { calculatePlates, standardPlates, type PlateUnit } from "@/lib/training/plateCalculator";

export default function PlateCalculator({
  initialWeight = "",
  onClose,
}: {
  initialWeight?: string;
  onClose: () => void;
}) {
  const [unit, setUnit] = useState<PlateUnit>("lb");
  const [target, setTarget] = useState(initialWeight);
  const [bar, setBar] = useState("45");
  const [plates, setPlates] = useState(standardPlates.lb);
  const result = useMemo(
    () =>
      target.trim() && bar.trim() ? calculatePlates(Number(target), Number(bar), plates) : null,
    [target, bar, plates]
  );
  const changeUnit = (next: PlateUnit) => {
    if (next === unit) return;
    setUnit(next);
    setTarget("");
    setBar(next === "lb" ? "45" : "20");
    setPlates(standardPlates[next]);
  };

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="border-border bg-card text-foreground">
        <div className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 text-left">
            <div className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Calculator aria-hidden className="h-5 w-5" />
            </div>
            <DrawerTitle className="text-2xl font-bold tracking-tight">
              Plate calculator
            </DrawerTitle>
            <DrawerDescription>
              Work out the plates for each side of your bar. This tool does not change your logged
              weights, which are in pounds.
            </DrawerDescription>
          </DrawerHeader>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-muted-foreground">
              Plate units
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["lb", "kg"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={unit === value}
                  onClick={() => changeUnit(value)}
                  className={`min-h-12 rounded-xl border text-sm font-semibold ${unit === value ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary/30 text-muted-foreground"}`}
                >
                  {value === "lb" ? "Pounds (lb)" : "Kilograms (kg)"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Changing units starts a fresh calculation.
            </p>
          </fieldset>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Total loaded weight", target, setTarget],
              ["Bar weight", bar, setBar],
            ].map(([label, value, setter]: any) => (
              <label key={label} className="text-xs font-semibold text-muted-foreground">
                {label} ({unit})
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="2500"
                  step="any"
                  value={value}
                  onChange={(event) => setter(event.target.value)}
                  className="mt-2 h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base font-semibold tabular-nums text-foreground"
                />
              </label>
            ))}
          </div>
          <fieldset className="mt-5">
            <legend className="text-xs font-semibold text-muted-foreground">
              Plate sizes in your gym
            </legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap a size to include or exclude it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {standardPlates[unit].map((weight) => {
                const selected = plates.includes(weight);
                return (
                  <button
                    key={weight}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${weight} ${unit} plates`}
                    onClick={() =>
                      setPlates((current) =>
                        selected
                          ? current.filter((value) => value !== weight)
                          : [...current, weight]
                      )
                    }
                    className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${selected ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary/30 text-muted-foreground"}`}
                  >
                    {selected && <Check aria-hidden className="h-3.5 w-3.5" />}
                    {weight}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div
            role="status"
            aria-live="polite"
            className="mt-5 rounded-2xl border border-border bg-background p-4"
          >
            {!result ? (
              <p className="text-sm text-muted-foreground">
                Enter a total and bar weight to see your setup.
              </p>
            ) : "error" in result ? (
              <p className="text-sm text-destructive">{result.error}</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-muted-foreground">
                  {result.exact ? "Your loaded bar" : "Closest achievable load below your target"}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                  {result.total} <span className="text-lg text-muted-foreground">{unit}</span>
                </p>
                {!result.exact && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {target} {unit} cannot be made with these plates. This setup is{" "}
                    {result.difference} {unit} lighter; the target has not been changed.
                  </p>
                )}
                <p className="mb-2 mt-4 text-sm font-semibold">
                  {result.perSide.length ? "Add to each side" : "Bar only — no plates"}
                </p>
                {result.perSide.length > 0 && (
                  <ul className="flex flex-wrap gap-2" aria-label="Plates on each side">
                    {result.perSide.map((plate) => (
                      <li
                        key={plate.weight}
                        className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold tabular-nums text-primary"
                      >
                        {plate.weight} {unit} × {plate.count}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Assumes enough matching plate pairs and equal weight on both sides. Include collars in
            the bar weight if you count them. Check your bar’s actual weight before loading.
          </p>
          <button
            onClick={onClose}
            className="mt-5 min-h-12 w-full rounded-xl bg-secondary text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
