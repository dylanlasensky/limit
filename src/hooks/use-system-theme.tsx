import { useEffect, useState } from "react";
import { storageGet } from "@/lib/storage";
export default function useSystemTheme(): boolean {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const preference = storageGet("localStorage", "limit-appearance") || "dark";
      const value = preference === "system" ? media.matches : preference === "dark";
      setDark(value);
      document.documentElement.classList.toggle("dark", value);
      document.documentElement.classList.toggle("light", !value);
    };
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("limit-theme", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("limit-theme", apply);
    };
  }, []);
  return dark;
}
