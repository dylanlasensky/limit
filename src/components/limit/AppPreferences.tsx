import React, { useState } from "react";
import NativeSelect from "@/components/limit/NativeSelect";
import { storageGet, storageSet } from "@/lib/storage";
export default function AppPreferences() {
  const [appearance, setAppearance] = useState(
      () => storageGet("localStorage", "limit-appearance") || "dark"
    ),
    [reminders, setReminders] = useState(
      () => storageGet("localStorage", "limit-reminders") === "on"
    );
  const theme = (value: string) => {
    setAppearance(value);
    storageSet("localStorage", "limit-appearance", value);
    window.dispatchEvent(new Event("limit-theme"));
  };
  const reminder = (value: boolean) => {
    setReminders(value);
    storageSet("localStorage", "limit-reminders", value ? "on" : "off");
  };
  return (
    <section className="limit-surface mt-4 rounded-3xl p-5">
      <p className="limit-kicker text-muted-foreground">App preferences</p>
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
