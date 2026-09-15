import React from "react";
import { ShieldCheck } from "lucide-react";

export { AI_CONSENT_VERSION } from "../../../base44/shared/aiConsent.js";

export default function AiConsent({
  checked,
  onChange,
  purpose,
  dataDescription,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  purpose: string;
  dataDescription: string;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-secondary/50 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Optional AI assistance
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        To {purpose}, LIMIT sends {dataDescription} to Base44 and OpenAI for AI processing. Don’t
        include other people’s personal information. AI can make mistakes; review every result.
        Manual tracking and program building work without AI.
      </p>
      <a
        href="/privacy"
        className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-primary"
      >
        How your data is used
      </a>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 shrink-0 accent-primary"
        />
        Allow this AI data sharing
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        Applies while this feature is open. Uncheck to stop future requests.
      </p>
    </section>
  );
}
