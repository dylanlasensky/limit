import React from "react";
import { Moon, Sun } from "lucide-react";
import { setAppearance } from "@/hooks/use-system-theme";

export default function ThemeToggle({ dark }: { dark: boolean }) {
  return (
    <div className="limit-theme-switch" role="group" aria-label="Color theme">
      {(
        [
          ["light", "Light", Sun],
          ["dark", "Dark", Moon],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-label={`${label} mode`}
          aria-pressed={dark === (value === "dark")}
          onClick={() => setAppearance(value)}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors"
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
