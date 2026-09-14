import React from "react";
import { motion } from "framer-motion";
interface SegmentedTabsProps<T extends string> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}
export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label = "View",
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="my-6 flex rounded-2xl border border-border/60 bg-secondary/45 p-1.5 shadow-inner"
    >
      {options.map((option) => (
        <button
          key={option}
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={`relative min-h-10 min-w-0 flex-1 rounded-xl px-2 text-[11px] font-bold transition-colors ${value === option ? "text-foreground" : "text-muted-foreground"}`}
        >
          {value === option && (
            <motion.span
              layoutId={`tab-${label}`}
              className="absolute inset-0 rounded-xl border border-border/60 bg-card shadow-lg"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10">{option}</span>
        </button>
      ))}
    </div>
  );
}
