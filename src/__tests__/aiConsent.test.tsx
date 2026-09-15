import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AiConsent from "@/components/limit/AiConsent";
import { AI_CONSENT_VERSION, requireAiConsent } from "../../base44/shared/aiConsent.js";
import { uploadFoodImage, analyzeFoodImage } from "@/components/limit/foodImageAnalysis";
import { parseRegimen } from "@/lib/training/importRegimen";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), invoke: vi.fn() }));
vi.mock("@/api/base44Client", () => ({
  base44: {
    integrations: { Core: { UploadPrivateFile: mocks.upload } },
    functions: { invoke: mocks.invoke },
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("explicit optional AI consent", () => {
  it("is off by default and discloses recipients, data, purpose and manual alternative", () => {
    function Example() {
      const [checked, setChecked] = useState(false);
      return (
        <AiConsent
          checked={checked}
          onChange={setChecked}
          purpose="estimate nutrition"
          dataDescription="your selected photo"
        />
      );
    }
    render(<Example />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/Base44 and OpenAI/)).toHaveTextContent("your selected photo");
    expect(screen.getByText(/Manual tracking/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it("rejects missing, false and outdated permission", () => {
    for (const aiConsent of [undefined, false, true, "old"])
      expect(() => requireAiConsent({ aiConsent })).toThrow("Allow AI");
    expect(() => requireAiConsent({ aiConsent: AI_CONSENT_VERSION })).not.toThrow();
  });
  it("does not upload a photo or a regimen without permission", async () => {
    const file = new File(["photo"], "meal.jpg", { type: "image/jpeg" });
    await expect(uploadFoodImage(file)).rejects.toThrow("Allow AI");
    await expect(parseRegimen({ file })).rejects.toThrow("Allow AI");
    await expect(analyzeFoodImage({ fileUri: "private/photo", scanMode: "food" })).rejects.toThrow(
      "Allow AI"
    );
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("passes consent with each AI request and validates before any upload", async () => {
    mocks.invoke.mockResolvedValue({ data: { name: "Program", days: [] } });
    await parseRegimen({ text: "Squat 3 x 5", aiConsent: AI_CONSENT_VERSION });
    expect(mocks.invoke).toHaveBeenCalledWith("parseWorkoutRegimen", {
      text: "Squat 3 x 5",
      fileUri: undefined,
      aiConsent: AI_CONSENT_VERSION,
    });
    await expect(
      parseRegimen({ text: "a".repeat(50001), aiConsent: AI_CONSENT_VERSION })
    ).rejects.toThrow("50,000");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
