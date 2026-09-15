import React from "react";
import NativeSelect from "@/components/limit/NativeSelect";
import { useAppearance, type Appearance } from "@/hooks/use-system-theme";
export default function AppPreferences() {
  const { appearance, setAppearance } = useAppearance();
  const theme = (value: string) => {
    setAppearance(value as Appearance);
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
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-semibold">Notifications</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Workout reminders are not available in this version. Your schedule is always in the
          Workout tab.
        </p>
      </div>
    </section>
  );
}
