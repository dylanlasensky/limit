import React, { useState } from "react";
import NativeSelect from "@/components/limit/NativeSelect";
import { useAppearance, type Appearance } from "@/hooks/use-system-theme";
import { storageGet, storageSet } from "@/lib/storage";
export default function AppPreferences() {
  const { appearance, setAppearance } = useAppearance();
  const [reminders, setReminders] = useState(
    () => storageGet("localStorage", "limit-reminders") === "on"
  );
  const theme = (value: string) => {
    setAppearance(value as Appearance);
  };
  const reminder = (value: boolean) => {
    setReminders(value);
    storageSet("localStorage", "limit-reminders", value ? "on" : "off");
  };
  return (
    <section className="limit-surface mt-4 rounded-3xl p-5">
      <p className="font-heading text-lg font-bold tracking-tight">Make it yours</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Your view, your rhythm. Preferences are saved on this device.
      </p>
      <label className="mt-4 block text-xs text-muted-foreground">
        Appearance
        <NativeSelect
          className="mt-1"
          value={appearance}
          onChange={theme}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "Match device" },
          ]}
          label="Appearance"
        />
      </label>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Choose crisp light or rich dark. Match device follows your system automatically.
      </p>
      <label className="mt-5 flex min-h-12 items-center justify-between gap-4">
        <span>
          <b className="text-sm">Workout reminder preference</b>
          <p className="text-xs text-muted-foreground">
            Used when native notifications are enabled
          </p>
        </span>
        <input
          type="checkbox"
          checked={reminders}
          onChange={(e) => reminder(e.target.checked)}
          className="h-5 w-5 accent-blue-600"
        />
      </label>
    </section>
  );
}
