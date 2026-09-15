import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppPreferences from "@/components/limit/AppPreferences";
import { mobileCapabilities, syncHealthKit } from "@/components/limit/mobileIntegrations";

vi.mock("@/components/limit/foodImageAnalysis", () => ({ analyzeFoodImage: vi.fn() }));
afterEach(cleanup);

describe("honest mobile capabilities", () => {
  it("does not offer a switch that cannot schedule notifications", () => {
    render(<AppPreferences />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Workout reminders are not available/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Appearance" })).toBeInTheDocument();
  });

  it("does not promise native integrations merely because the website is packaged", async () => {
    expect(mobileCapabilities).toMatchObject({
      healthKit: false,
      pushNotifications: false,
      fullOfflineMode: false,
      nativePurchases: false,
    });
    await expect(syncHealthKit()).rejects.toThrow("not available in this version");
  });
});
