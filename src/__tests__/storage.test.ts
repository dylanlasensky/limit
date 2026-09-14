import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearPrivateState, storageGet, storageSet } from "@/lib/storage";
describe("private state isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it("clears only the deleted user’s draft and LIMIT navigation", () => {
    localStorage.setItem("limit-workout-v2:a:day", "a");
    localStorage.setItem("limit-workout-v2:b:day", "b");
    localStorage.setItem("unrelated", "keep");
    sessionStorage.setItem("limit-tab-route:/workout", "/workout/history/a");
    clearPrivateState("a");
    expect(localStorage.getItem("limit-workout-v2:a:day")).toBeNull();
    expect(localStorage.getItem("limit-workout-v2:b:day")).toBe("b");
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(sessionStorage.length).toBe(0);
  });
  it("nonessential storage failures do not crash the app", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(storageGet("sessionStorage", "x")).toBeNull();
    expect(() => storageSet("sessionStorage", "x", "y")).not.toThrow();
  });
});
