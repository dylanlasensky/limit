import React from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImportSource from "@/components/import/ImportSource";
import FoodPhotoScanner from "@/components/limit/FoodPhotoScanner";
import useRegimenImport from "@/hooks/use-regimen-import";
import { AI_CONSENT_VERSION } from "../../base44/shared/aiConsent.js";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), invoke: vi.fn() }));
vi.mock("@/api/base44Client", () => ({
  base44: {
    integrations: { Core: { UploadPrivateFile: mocks.upload } },
    functions: { invoke: mocks.invoke },
  },
}));
vi.mock("@/lib/training/exerciseLibrary", () => ({ listExercises: vi.fn().mockResolvedValue([]) }));
const meta = {
  sport: "",
  seasonPhase: "not_applicable",
  coachProvided: false,
  athleteMode: "smart_progression",
  structureLocked: false,
};
const file = new File(["selected file"], "program.jpg", { type: "image/jpeg" });
const createUrl = vi.fn(() => "blob:private-preview"),
  revokeUrl = vi.fn();
const originalCreate = URL.createObjectURL,
  originalRevoke = URL.revokeObjectURL;
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = revokeUrl;
  mocks.upload.mockResolvedValue({ file_uri: "private/selected" });
  mocks.invoke.mockResolvedValue({ data: { name: "Program", days: [] } });
});
afterEach(() => {
  cleanup();
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );
}

describe("AI requests stay inside the visible feature and selected source", () => {
  it("never includes retained hidden fields in the source UI payload", () => {
    const onBegin = vi.fn();
    const { container } = render(<ImportSource meta={meta} setMeta={() => {}} onBegin={onBegin} />);
    fireEvent.change(screen.getByLabelText("Workout program text"), {
      target: { value: "Private pasted text" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upload file/ }));
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Allow this AI data sharing" }));
    fireEvent.click(screen.getByRole("button", { name: "PARSE REGIMEN" }));
    expect(onBegin).toHaveBeenLastCalledWith({
      type: "uploaded_file",
      file,
      aiConsent: AI_CONSENT_VERSION,
    });
    fireEvent.click(screen.getByRole("button", { name: /Paste text/ }));
    fireEvent.click(screen.getByRole("button", { name: "PARSE REGIMEN" }));
    expect(onBegin).toHaveBeenLastCalledWith({
      type: "pasted_text",
      text: "Private pasted text",
      aiConsent: AI_CONSENT_VERSION,
    });
    fireEvent.click(screen.getByRole("button", { name: /Build manually/ }));
    fireEvent.click(screen.getByRole("button", { name: "BUILD MY SPLIT" }));
    expect(onBegin).toHaveBeenLastCalledWith({ type: "manual" });
  });

  it("also constrains the hook boundary when a caller supplies both sources", async () => {
    const { result } = renderHook(() => useRegimenImport(), { wrapper });
    await act(async () => {
      await result.current.begin({
        type: "pasted_text",
        text: "Squat",
        file,
        aiConsent: AI_CONSENT_VERSION,
      });
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenLastCalledWith("parseWorkoutRegimen", {
      text: "Squat",
      fileUri: undefined,
      aiConsent: AI_CONSENT_VERSION,
    });
    await act(async () => {
      await result.current.begin({
        type: "uploaded_file",
        text: "Hidden secret",
        file,
        aiConsent: AI_CONSENT_VERSION,
      });
    });
    expect(mocks.invoke).toHaveBeenLastCalledWith("parseWorkoutRegimen", {
      text: undefined,
      fileUri: "private/selected",
      aiConsent: AI_CONSENT_VERSION,
    });
    await act(async () => {
      await result.current.begin({ type: "manual", text: "Hidden secret", file });
    });
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it("does not start regimen AI after an upload resolves with the feature closed", async () => {
    let resolve!: (value: { file_uri: string }) => void;
    mocks.upload.mockReturnValue(
      new Promise((value) => {
        resolve = value;
      })
    );
    const { result, unmount } = renderHook(() => useRegimenImport(), { wrapper });
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.begin({
        type: "uploaded_file",
        file,
        aiConsent: AI_CONSENT_VERSION,
      });
    });
    expect(mocks.upload).toHaveBeenCalledOnce();
    unmount();
    await act(async () => {
      resolve({ file_uri: "private/late" });
      await pending;
    });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("does not start photo AI after close, and releases the late preview URL", async () => {
    let resolve!: (value: { file_uri: string }) => void;
    mocks.upload.mockReturnValue(
      new Promise((value) => {
        resolve = value;
      })
    );
    const { container, unmount } = render(
      <FoodPhotoScanner mode="food" onDone={() => {}} onManual={() => {}} />
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Allow this AI data sharing" }));
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(mocks.upload).toHaveBeenCalledOnce();
    unmount();
    await act(async () => {
      resolve({ file_uri: "private/late" });
    });
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith("blob:private-preview");
  });
});
