import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { House, Dumbbell, Apple, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import { storageGet, storageSet } from "@/lib/storage";
const items: Array<[string, string, LucideIcon]> = [
  ["Home", "/home", House],
  ["Workout", "/workout", Dumbbell],
  ["Nutrition", "/nutrition", Apple],
  ["Progress", "/progress", TrendingUp],
  ["Profile", "/profile", UserRound],
];
const isWithin = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
export default function BottomNav() {
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    const item = items.find(([, root]) => isWithin(location.pathname, root));
    if (item)
      storageSet(
        "sessionStorage",
        `limit-tab-route:${item[1]}`,
        `${location.pathname}${location.search}${location.hash}`
      );
  }, [location]);
  const select = (root: string) => {
    if (isWithin(location.pathname, root)) {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      navigate(root, { replace: true });
      storageSet("sessionStorage", `limit-tab-route:${root}`, root);
      return;
    }
    const saved = storageGet("sessionStorage", `limit-tab-route:${root}`);
    navigate(saved && isWithin(saved.split(/[?#]/)[0], root) ? saved : root);
  };
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] sm:px-5"
    >
      <div className="limit-navigation grid grid-cols-5 gap-1 rounded-[1.5rem] p-1.5 backdrop-blur-xl">
        {items.map(([label, root, Icon]) => {
          const active = isWithin(location.pathname, root);
          return (
            <button
              key={root}
              type="button"
              onClick={() => select(root)}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[10px] font-semibold transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <Icon
                className="relative h-5 w-5"
                strokeWidth={active ? 2.3 : 1.8}
                aria-hidden="true"
              />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
