import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ageFromBirthDate, bodyInputErrors } from "@/lib/profile-inputs";
import ProfileBasics from "@/components/limit/ProfileBasics";
import OnboardingPersonal from "@/components/limit/OnboardingPersonal";
import OnboardingDiet from "@/components/limit/OnboardingDiet";

afterEach(cleanup);

const profile = {
  name: "Jordan",
  currentWeight: 180,
  heightFeet: 5,
  heightInches: 11,
  trainingDays: ["Monday", "Wednesday", "Friday"],
  availableDays: ["Monday", "Wednesday", "Friday"],
};

describe("profile input validation", () => {
  it("calculates age on the birthday without promoting minors to adults", () => {
    const now = new Date(2026, 8, 14, 1);
    expect(ageFromBirthDate("2008-09-14", now)).toBe(18);
    expect(ageFromBirthDate("2008-09-15", now)).toBe(17);
    expect(ageFromBirthDate("2010-09-14", now)).toBe(16);
  });

  it.each(["", "invalid", "2025-02-29", "2026-02-31", "2027-01-01", "1990-13-01"])(
    "does not accept or normalize an invalid/future birth date: %s",
    (value) => expect(ageFromBirthDate(value, new Date(2026, 8, 14))).toBeNull()
  );

  it("accepts a leap-day birthday and optional birth date", () => {
    expect(ageFromBirthDate("2000-02-29", new Date(2026, 8, 14))).toBe(26);
    expect(bodyInputErrors(profile)).toEqual({});
  });

  it.each([
    { name: " " },
    { currentWeight: -180 },
    { currentWeight: Infinity },
    { currentWeight: "" },
    { heightFeet: 5.5 },
    { heightInches: 12 },
    { goalWeight: -100 },
    { birthDate: "2099-12-31" },
  ])("rejects values formerly accepted by onboarding truthiness: %j", (patch) => {
    expect(Object.keys(bodyInputErrors({ ...profile, ...patch })).length).toBeGreaterThan(0);
  });
});

describe("profile controls", () => {
  it("updates both schedule fields when exact weekdays change", () => {
    const change = vi.fn();
    render(<ProfileBasics profile={profile} onChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
    expect(change).toHaveBeenCalledWith({
      ...profile,
      availableDays: ["Monday", "Friday"],
      trainingDays: ["Monday", "Friday"],
    });
    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");
  });

  it("prevents a seventh day from being selected", () => {
    render(
      <ProfileBasics
        profile={{
          ...profile,
          availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Sunday" })).toBeDisabled();
  });

  it("associates onboarding labels and inline validation with their inputs", () => {
    render(<OnboardingPersonal data={{ name: " ", weightLb: -10 }} set={vi.fn()} />);
    fireEvent.blur(screen.getByLabelText("Name"));
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(
      "Enter a name between 1 and 100 characters."
    );
    expect(screen.getByLabelText(/Date of birth/)).toHaveAttribute("type", "date");
    fireEvent.blur(screen.getByLabelText("Weight (lb)"));
    expect(screen.getByLabelText("Weight (lb)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Goal weight (lb)")).toHaveAttribute("inputmode", "decimal");
  });

  it("exposes selected allergies and food preferences to assistive technology", () => {
    render(
      <OnboardingDiet
        data={{ allergies: ["Peanuts"], dietaryPreferences: ["Vegan"] }}
        set={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Peanuts" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vegan" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Fish" })).toHaveAttribute("aria-pressed", "false");
  });
});
