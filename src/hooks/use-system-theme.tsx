import { useEffect, useLayoutEffect, useState } from "react";
import { storageGet, storageSet } from "@/lib/storage";

export type Appearance = "dark" | "light" | "system";
const APPEARANCE_KEY = "limit-appearance";
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function isAppearance(value: unknown): value is Appearance {
  return value === "dark" || value === "light" || value === "system";
}

function readAppearance(): Appearance {
  const value = storageGet("localStorage", APPEARANCE_KEY);
  return isAppearance(value) ? value : "dark";
}

function deviceTheme(): MediaQueryList | undefined {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : undefined;
}

function isDark(appearance: Appearance, media = deviceTheme()): boolean {
  return appearance === "system" ? (media?.matches ?? true) : appearance === "dark";
}

export function setAppearance(appearance: Appearance) {
  storageSet("localStorage", APPEARANCE_KEY, appearance);
  if (typeof window !== "undefined") {
    // Include the choice so switching still works when browser storage is unavailable.
    window.dispatchEvent(new CustomEvent("limit-theme", { detail: appearance }));
  }
}

export function useAppearance() {
  const [theme, setTheme] = useState(() => {
    const appearance = readAppearance();
    return { appearance, dark: isDark(appearance) };
  });

  useBrowserLayoutEffect(() => {
    const media = deviceTheme();
    let preference = readAppearance();
    const apply = () => {
      const dark = isDark(preference, media);
      setTheme({ appearance: preference, dark });
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("light", !dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#080b12" : "#f6f8fc");
    };
    const onPreference = (event: Event) => {
      const value = (event as CustomEvent<unknown>).detail;
      preference = isAppearance(value) ? value : readAppearance();
      apply();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== APPEARANCE_KEY && event.key !== null) return;
      preference = readAppearance();
      apply();
    };
    apply();
    media?.addEventListener?.("change", apply);
    window.addEventListener("limit-theme", onPreference);
    window.addEventListener("storage", onStorage);
    return () => {
      media?.removeEventListener?.("change", apply);
      window.removeEventListener("limit-theme", onPreference);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { ...theme, setAppearance };
}

export default function useSystemTheme(): boolean {
  return useAppearance().dark;
}
