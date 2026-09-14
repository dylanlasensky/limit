import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { House, Dumbbell, Apple, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
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
      sessionStorage.setItem(
        `limit-tab-route:${item[1]}`,
        `${location.pathname}${location.search}${location.hash}`
      );
  }, [location]);
  const select = (root: string) => {
    if (isWithin(location.pathname, root)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate(root, { replace: true });
      sessionStorage.setItem(`limit-tab-route:${root}`, root);
      return;
    }
    navigate(sessionStorage.getItem(`limit-tab-route:${root}`) || root);
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(.55rem,env(safe-area-inset-bottom))]">
      <div className="limit-surface flex justify-around rounded-[1.4rem] bg-background/85 p-1.5 backdrop-blur-2xl">
        {items.map(([label, root, Icon]) => {
          const active = isWithin(location.pathname, root);
          return (
            <button
              key={root}
              onClick={() => select(root)}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-bold transition-all ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              {active && (
                <span className="absolute inset-0 rounded-2xl bg-primary/10 shadow-[inset_0_0_18px_hsl(var(--primary)/.06)]" />
              )}
              <Icon
                className={`relative h-5 w-5 ${active ? "drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`}
              />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
