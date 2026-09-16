import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
export interface NativeSelectOption<V extends string | number = string> {
  value: V;
  label: React.ReactNode;
}
interface NativeSelectProps<V extends string | number> {
  value: V;
  onChange: (value: V) => void;
  /** Plain strings are used as both value and label. */
  options: Array<string | NativeSelectOption<V>>;
  label?: string;
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
}
export default function NativeSelect<V extends string | number = string>({
  value,
  onChange,
  options,
  label = "Choose an option",
  "aria-label": ariaLabel,
  disabled = false,
  className,
}: NativeSelectProps<V>) {
  const [open, setOpen] = useState(false),
    items: NativeSelectOption<V>[] = options.map((x) =>
      typeof x === "string" ? ({ value: x, label: x } as NativeSelectOption<V>) : x
    ),
    selected = items.find((x) => x.value === value);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-description={label}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "limit-surface flex h-12 w-full items-center justify-between rounded-xl px-3 text-left transition-colors active:border-primary/40",
          className
        )}
      >
        <span>{selected?.label || label}</span>
        <ChevronDown className="h-4 w-4 text-zinc-500" />
      </button>
      <Drawer open={open && !disabled} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerHeader>
              <DrawerTitle>{label}</DrawerTitle>
              <DrawerDescription>Select one option</DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[65dvh] overflow-y-auto overscroll-contain px-4">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  aria-pressed={item.value === value}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="flex min-h-14 w-full items-center justify-between border-b border-border text-left font-medium"
                >
                  <span>{item.label}</span>
                  {item.value === value && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}