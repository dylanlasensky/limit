import { useCallback, useEffect } from "react";
export default function useModalHistory(open: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("modal") !== "open") {
      url.searchParams.set("modal", "open");
      window.history.pushState({ limitModal: true }, "", url);
    }
    const pop = () => onDismiss();
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [open, onDismiss]);
  return useCallback(() => {
    const url = new URL(window.location.href);
    if (open && url.searchParams.get("modal") === "open") window.history.back();
    else onDismiss();
  }, [open, onDismiss]);
}
