import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import BottomNav from "@/components/limit/BottomNav";
import CoachButton from "@/components/limit/CoachButton";
import useSystemTheme from "@/hooks/use-system-theme";
import ThemeToggle from "@/components/limit/ThemeToggle";
export default function LimitShell() {
  const dark = useSystemTheme(),
    location = useLocation();
  const reducedMotion = useReducedMotion();
  return (
    <div className="limit-app-shell min-h-screen text-foreground">
      <a href="#main-content" className="limit-skip-link">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-7 sm:pt-6">
        <Link
          to="/home"
          aria-label="LIMIT home"
          className="flex min-h-11 items-center gap-2.5 rounded-lg"
        >
          <span className="limit-brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="font-heading text-base font-extrabold tracking-[.18em]">LIMIT</span>
        </Link>
        <ThemeToggle dark={dark} />
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-[calc(100dvh-6rem)] max-w-xl overflow-x-clip px-4 pb-32 outline-none sm:px-6"
      >
        <motion.div
          key={location.pathname}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>
      <CoachButton />
      <BottomNav />
    </div>
  );
}
