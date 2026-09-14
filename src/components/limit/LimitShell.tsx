import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import BottomNav from "@/components/limit/BottomNav";
import CoachButton from "@/components/limit/CoachButton";
import useSystemTheme from "@/hooks/use-system-theme";
export default function LimitShell() {
  const dark = useSystemTheme(),
    location = useLocation();
  const reducedMotion = useReducedMotion();
  return (
    <div className={`${dark ? "dark" : ""} min-h-screen bg-background text-foreground`}>
      <main className="mx-auto min-h-screen max-w-md overflow-x-hidden px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
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
