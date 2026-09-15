import React, { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EquipmentPicker from "@/components/limit/EquipmentPicker";
import TrainingPreferences from "@/components/limit/TrainingPreferences";
import ProfileBasics from "@/components/limit/ProfileBasics";
import OnboardingReveal from "@/components/onboarding/OnboardingReveal";
import {
  normalizeEquipmentPreferences,
  toggleEquipmentPreference,
} from "@/lib/training/equipmentPreferences";
import { scoreProgramStructures } from "@/lib/training/programEngine";

afterEach(cleanup);

function EquipmentHarness({ initial = ["Full commercial gym"] }: { initial?: string[] }) {
  const [equipment, setEquipment] = useState(initial);
  return <EquipmentPicker value={equipment} onChange={setEquipment} />;
}

describe("equipment preferences", () => {
  it("replaces the default full gym when a user picks limited equipment", () => {
    render(<EquipmentHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Dumbbells" }));
    expect(screen.getByRole("button", { name: "Dumbbells" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Full commercial gym" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    fireEvent.click(screen.getByRole("button", { name: "Cables" }));
    expect(screen.getByRole("button", { name: "Dumbbells" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Cables" })).toHaveAttribute("aria-pressed", "true");
  });

  it("makes bodyweight-only and full-gym choices mutually exclusive with specific gear", () => {
    render(<EquipmentHarness initial={["Dumbbells", "Cables"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Bodyweight only" }));
    expect(screen.getByRole("button", { name: "Dumbbells" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Cables" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Full commercial gym" }));
    expect(screen.getByRole("button", { name: "Bodyweight only" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Full commercial gym" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("keeps a safe bodyweight choice when the last equipment item is removed", () => {
    expect(toggleEquipmentPreference(["Dumbbells"], "Dumbbells")).toEqual(["Bodyweight only"]);
    expect(toggleEquipmentPreference(["Full commercial gym"], "Full commercial gym")).toEqual([
      "Bodyweight only",
    ]);
  });

  it("supports legacy labels without inventing a rack or keeping a stale full-gym default", () => {
    expect(normalizeEquipmentPreferences(["Full gym", "Dumbbells"])).toEqual(["Dumbbells"]);
    expect(normalizeEquipmentPreferences(["Commercial gym"])).toEqual(["Full commercial gym"]);
    expect(
      normalizeEquipmentPreferences([
        "Full commercial gym",
        "Cable machine",
        "Barbell",
        "Bodyweight",
      ])
    ).toEqual(["Cables", "Barbell"]);
    const change = vi.fn();
    render(<EquipmentPicker value={["Cable machine", "Barbell"]} onChange={change} />);
    expect(screen.getByRole("button", { name: "Cables" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Barbell + rack" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(
      screen.getByRole("button", { name: "Barbell without rack", hidden: true })
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Dumbbells" }));
    expect(change).toHaveBeenCalledWith(["Cables", "Barbell", "Dumbbells"]);
  });

  it("offers optional supporting gear without crowding the main choices", () => {
    const change = vi.fn();
    render(<EquipmentPicker value={["Dumbbells"]} onChange={change} />);
    const more = screen.getByText("More equipment").closest("details");
    expect(more).not.toHaveAttribute("open");
    for (const gear of ["Bench", "Pull-up bar", "Resistance band"]) {
      fireEvent.click(screen.getByRole("button", { name: gear, hidden: true }));
      expect(change).toHaveBeenLastCalledWith(["Dumbbells", gear]);
    }
  });
});

describe("personalized training controls", () => {
  it.each([
    ["get stronger", "Get stronger"],
    ["increase strength", "Get stronger"],
    ["muscle and strength", "Muscle + strength"],
    ["lose fat", "Lose fat"],
    ["lose weight", "Lose fat"],
  ])("shows the saved %s goal instead of a blank selector", (fitnessGoal, label) => {
    render(<ProfileBasics profile={{ fitnessGoal }} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Goal" })).toHaveTextContent(label);
  });

  it("lets profile users edit up to three priorities and remove existing choices", () => {
    const change = vi.fn();
    const profile = { equipment: ["Dumbbells"], priorityMuscles: ["Chest", "Back", "Arms"] };
    render(<TrainingPreferences profile={profile} onChange={change} />);
    expect(screen.getByRole("button", { name: "Glutes", hidden: true })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Arms", hidden: true }));
    expect(change).toHaveBeenCalledWith({ ...profile, priorityMuscles: ["Chest", "Back"] });
    expect(screen.getByText(/within your time and equipment/)).toBeInTheDocument();
  });

  it("previews workouts in weekday order even when incoming availability is unsorted", () => {
    const data = {
      availableDays: ["Friday", "Monday", "Wednesday", "Monday"],
      days: 3,
      experienceLevel: "beginner",
      fitnessGoal: "gain muscle",
      sessionLength: 60,
    };
    const rec = scoreProgramStructures(data).best;
    render(<OnboardingReveal data={data} />);
    for (const [index, day] of ["MON", "WED", "FRI"].entries()) {
      const row = screen.getByText(day).parentElement!;
      expect(within(row).getByText(rec.dayNames[index])).toBeInTheDocument();
    }
    expect(within(screen.getByText("TUE").parentElement!).getByText("Rest")).toBeInTheDocument();
  });
});
