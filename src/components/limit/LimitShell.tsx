import LimitLogo from "@/components/limit/LimitLogo";
import React from "react";
import { Link, Outlet, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import BottomNav from "@/components/limit/BottomNav";
import CoachButton from "@/components/limit/CoachButton";
import useSystemTheme from "@/hooks/use-system-theme";
import ThemeToggle from "@/components/limit/ThemeToggle";
export default function LimitShell() {
  const dark = useSystemTheme(),
    location = useLocation(),
    navigationType = useNavigationType();
  const reducedMotion = useReducedMotion();
  const direction = navigationType === "PUSH" ? 1 : navigationType === "POP" ? -1 : 0;
  return (
    <div className="limit-app-shell min-h-screen text-foreground lg:pl-60">
      <a href="#main-content" className="limit-skip-link">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-7 sm:pt-6 md:max-w-3xl lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:h-36 lg:w-60 lg:flex-col lg:items-start lg:justify-start lg:gap-4 lg:border-r lg:bg-card lg:px-6">
        <Link
          to="/home"
          aria-label="LIMIT home"
          className="flex min-h-11 items-center gap-2.5 rounded-lg"
        >
          <LimitLogo />
        </Link>
        <ThemeToggle dark={dark} />
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-[calc(100dvh-6rem)] max-w-xl overflow-x-clip px-4 pb-32 outline-none sm:px-6 md:max-w-3xl lg:max-w-7xl lg:px-8 lg:pb-24 lg:pt-6"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={reducedMotion ? false : { x: `${direction * 100}%`, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { x: `${direction * -100}%`, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <CoachButton />
      <BottomNav />
    </div>
  );
}