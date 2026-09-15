import React from "react";
import {
  additionalEquipment,
  commonEquipment,
  normalizeEquipmentPreferences,
  toggleEquipmentPreference,
} from "@/lib/training/equipmentPreferences";

interface EquipmentPickerProps {
  value: unknown;
  onChange: (equipment: string[]) => void;
}

export default function EquipmentPicker({ value, onChange }: EquipmentPickerProps) {
  const selected = normalizeEquipmentPreferences(value);
  const extra = [
    ...additionalEquipment,
    ...selected.filter(
      (item) => !commonEquipment.includes(item) && !additionalEquipment.includes(item)
    ),
  ];
  const extraCount = extra.filter((item) => selected.includes(item)).length;
  const renderOption = (option: string) => (
    <button
      key={option}
      type="button"
      aria-pressed={selected.includes(option)}
      onClick={() => onChange(toggleEquipmentPreference(value, option))}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${selected.includes(option) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
    >
      {option === "Barbell" ? "Barbell without rack" : option}
    </button>
  );
  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-2">{commonEquipment.map(renderOption)}</div>
      <details className="mt-3 rounded-xl border border-border px-3">
        <summary className="cursor-pointer py-3 text-sm font-medium">
          More equipment{extraCount ? ` · ${extraCount} selected` : ""}
        </summary>
        <div className="flex flex-wrap gap-2 pb-3">{extra.map(renderOption)}</div>
      </details>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {selected.includes("Full commercial gym")
          ? "A full gym includes the usual gym equipment. Choose individual items if your access is limited."
          : "Select everything you have, including a bench or pull-up bar. Bodyweight moves are always included."}
      </p>
    </div>
  );
}
