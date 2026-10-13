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
    localStorage.setItem("limit-exercise-favorites:a", "private");
    localStorage.setItem("limit-exercise-favorites:b", "keep");
    sessionStorage.setItem("limit-tab-route:/workout", "/workout/history/a");
    clearPrivateState("a");
    expect(localStorage.getItem("limit-workout-v2:a:day")).toBeNull();
    expect(localStorage.getItem("limit-workout-v2:b:day")).toBe("b");
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(localStorage.getItem("limit-exercise-favorites:a")).toBeNull();
    expect(localStorage.getItem("limit-exercise-favorites:b")).toBe("keep");
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
  it("removes the departing account's private meal drafts without touching another account", () => {
    sessionStorage.setItem("limit:pending-meal-log:a:meal:date:Breakfast", "private foods");
    sessionStorage.setItem("limit:pending-meal-shortcut:a", "private shortcut");
    sessionStorage.setItem("limit:pending-meal-log:b:meal:date:Breakfast", "other foods");
    clearPrivateState("a");
    expect(sessionStorage.getItem("limit:pending-meal-log:a:meal:date:Breakfast")).toBeNull();
    expect(sessionStorage.getItem("limit:pending-meal-shortcut:a")).toBeNull();
    expect(sessionStorage.getItem("limit:pending-meal-log:b:meal:date:Breakfast")).toBe(
      "other foods"
    );
  });
});
