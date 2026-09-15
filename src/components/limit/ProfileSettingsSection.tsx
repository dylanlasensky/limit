import React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface Props {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function ProfileSettingsSection({
  id,
  title,
  description,
  icon: Icon,
  open,
  onToggle,
  children,
}: Props) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2>
        <button
          type="button"
          aria-label={`${title} settings`}
          aria-expanded={open}
          aria-controls={`${id}-settings-panel`}
          onClick={onToggle}
          className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${open ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:bg-secondary/50"}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{title}</span>
            <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
              {description}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </h2>
      <div id={`${id}-settings-panel`} hidden={!open} className="pb-2">
        {children}
      </div>
    </section>
  );
}
