import React from "react";
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAppearance, useAppearance } from "@/hooks/use-system-theme";
import ThemeToggle from "@/components/limit/ThemeToggle";
import AppTheme from "@/components/limit/AppTheme";
const themeCss = readFileSync("src/index.css", "utf8");

let matches = true;
let mediaEvents: EventTarget;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  matches = true;
  mediaEvents = new EventTarget();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
      removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents),
    }))
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("appearance preferences", () => {
  it("initializes standalone routes and keeps device mode reactive outside the shell", () => {
    localStorage.setItem("limit-appearance", "system");
    render(<AppTheme />);
    expect(document.documentElement).toHaveClass("dark");
    act(() => {
      matches = false;
      mediaEvents.dispatchEvent(new Event("change"));
    });
    expect(document.documentElement).toHaveClass("light");
  });

  it("restores a saved light theme on the first render", () => {
    localStorage.setItem("limit-appearance", "light");
    const { result } = renderHook(useAppearance);
    expect(result.current).toMatchObject({ appearance: "light", dark: false });
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("keeps the header toggle and other preference consumers in sync", () => {
    function Controls() {
      const { dark, appearance } = useAppearance();
      return (
        <>
          <ThemeToggle dark={dark} />
          <output>{appearance}</output>
        </>
      );
    }
    render(<Controls />);
    const other = renderHook(useAppearance);
    fireEvent.click(screen.getByRole("button", { name: "Light mode" }));
    expect(screen.getByRole("button", { name: "Light mode" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(other.result.current).toMatchObject({ appearance: "light", dark: false });
    expect(localStorage.getItem("limit-appearance")).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: "Dark mode" }));
    expect(other.result.current.dark).toBe(true);
    expect(document.documentElement).toHaveClass("dark");
  });

  it("follows device changes only while Match device is selected", () => {
    localStorage.setItem("limit-appearance", "system");
    const { result } = renderHook(useAppearance);
    act(() => {
      matches = false;
      mediaEvents.dispatchEvent(new Event("change"));
    });
    expect(result.current).toMatchObject({ appearance: "system", dark: false });
    act(() => setAppearance("dark"));
    act(() => mediaEvents.dispatchEvent(new Event("change")));
    expect(result.current).toMatchObject({ appearance: "dark", dark: true });
  });

  it("reflects appearance changes from another tab", () => {
    const { result } = renderHook(useAppearance);
    act(() => {
      localStorage.setItem("limit-appearance", "light");
      window.dispatchEvent(
        new StorageEvent("storage", { key: "limit-appearance", newValue: "light" })
      );
    });
    expect(result.current.dark).toBe(false);
  });

  it("still changes theme when storage cannot be written", () => {
    const { result } = renderHook(useAppearance);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    act(() => setAppearance("light"));
    expect(result.current.dark).toBe(false);
    expect(document.documentElement).toHaveClass("light");
  });

  it("handles missing media-query support and invalid stored preferences", () => {
    vi.stubGlobal("matchMedia", undefined);
    localStorage.setItem("limit-appearance", "unknown");
    const { result } = renderHook(useAppearance);
    expect(result.current).toMatchObject({ appearance: "dark", dark: true });
  });
});

function luminance(hsl: string) {
  const [hue, saturation, lightness] = hsl.match(/[\d.]+/g)!.map(Number);
  const s = saturation / 100,
    l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}

describe("theme text contrast", () => {
  for (const [theme, selector] of [
    ["dark", ".dark"],
    ["light", "html.light"],
  ]) {
    it(`${theme} gives primary, secondary and muted text readable contrast`, () => {
      const block = themeCss.slice(themeCss.indexOf(selector)).split("}")[0];
      const tokens = Object.fromEntries(
        [...block.matchAll(/--([\w-]+):\s*([\d.]+ [\d.]+% [\d.]+%);/g)].map((m) => [m[1], m[2]])
      );
      for (const [foreground, background] of [
        ["foreground", "background"],
        ["card-foreground", "card"],
        ["muted-foreground", "background"],
        ["muted-foreground", "card"],
        ["primary", "background"],
        ["primary", "card"],
        ["primary-foreground", "primary"],
        ["secondary-foreground", "secondary"],
        ["accent", "card"],
        ["destructive", "card"],
      ]) {
        const values = [luminance(tokens[foreground]), luminance(tokens[background])].sort(
          (a, b) => b - a
        );
        expect(
          (values[0] + 0.05) / (values[1] + 0.05),
          `${foreground} on ${background}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
