import React, { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => void | Promise<unknown>;
  children?: React.ReactNode;
}
const THRESHOLD = 56;
const HOLD = 52;
const MAX_PULL = 112;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const root = useRef<HTMLDivElement>(null);
  const callback = useRef(onRefresh);
  callback.current = onRefresh;
  const busy = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);
  const pull = useMotionValue(0);
  const height = useTransform(pull, (value) => Math.max(0, value));
  const opacity = useTransform(pull, [0, 28], [0, 1]);
  const rotation = useTransform(pull, [0, MAX_PULL], [0, 240]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = root.current!;
    let mounted = true;
    let animation: { stop: () => void } | undefined;
    let gesture: { x: number; y: number; dragging: boolean; crossed: boolean; mouse: boolean } | null = null;
    const springTo = (target: number) => {
      const velocity = Math.max(-600, Math.min(600, pull.getVelocity()));
      animation?.stop();
      if (reducedMotion) pull.set(target);
      else animation = animate(pull, target, {
        type: "spring", stiffness: 280, damping: 28, mass: 0.8, velocity,
      });
    };
    const begin = (target: EventTarget | null, x: number, y: number, mouse: boolean) => {
      if (busy.current || gesture || window.scrollY > 0 || !(target instanceof Element)) return;
      if (target.closest('button, a, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"]')) return;
      // Leave nested scrollers and horizontal controls in charge of their own gestures.
      for (let node: Element | null = target; node && node !== element; node = node.parentElement) {
        const style = window.getComputedStyle(node);
        if ((node.scrollHeight > node.clientHeight && /auto|scroll/.test(style.overflowY)) ||
            (node.scrollWidth > node.clientWidth && /auto|scroll/.test(style.overflowX))) return;
      }
      gesture = { x, y, mouse, dragging: false, crossed: false };
    };
    const cancel = () => {
      gesture = null;
      setArmed(false);
      if (!busy.current) springTo(0);
    };
    const move = (event: TouchEvent | MouseEvent, x: number, y: number) => {
      if (!gesture || busy.current) return;
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      if (!gesture.dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) { cancel(); return; }
        gesture.dragging = true;
        animation?.stop();
      }
      // A non-passive touch listener prevents competing browser refresh only while pulling.
      if (!event.cancelable) { cancel(); return; }
      event.preventDefault();
      const distance = Math.max(0, dy) * 0.65;
      const next = MAX_PULL * distance / (MAX_PULL + distance);
      pull.set(next);
      const crossed = next >= THRESHOLD;
      if (crossed !== gesture.crossed) {
        gesture.crossed = crossed;
        setArmed(crossed);
        if (crossed && typeof navigator.vibrate === "function") navigator.vibrate(10);
      }
    };
    const end = async () => {
      if (!gesture) return;
      const shouldRefresh = gesture.dragging && pull.get() >= THRESHOLD;
      gesture = null;
      setArmed(false);
      if (!shouldRefresh || busy.current) { if (!busy.current) springTo(0); return; }
      busy.current = true;
      setRefreshing(true);
      springTo(HOLD);
      try {
        await callback.current();
      } finally {
        busy.current = false;
        if (mounted) { setRefreshing(false); springTo(0); }
      }
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) { cancel(); return; }
      begin(event.target, event.touches[0].clientX, event.touches[0].clientY, false);
    };
    const touchMove = (event: TouchEvent) => {
      if (gesture?.mouse) return;
      if (event.touches.length !== 1) { cancel(); return; }
      move(event, event.touches[0].clientX, event.touches[0].clientY);
    };
    const touchEnd = () => { if (gesture && !gesture.mouse) void end(); };
    const mouseStart = (event: MouseEvent) => {
      if (event.button === 0) begin(event.target, event.clientX, event.clientY, true);
    };
    const mouseMove = (event: MouseEvent) => {
      if (!gesture?.mouse) return;
      if (event.buttons !== 1) { cancel(); return; }
      move(event, event.clientX, event.clientY);
    };
    const mouseEnd = () => { if (gesture?.mouse) void end(); };
    element.addEventListener("touchstart", touchStart, { passive: true });
    element.addEventListener("touchmove", touchMove, { passive: false });
    element.addEventListener("touchend", touchEnd);
    element.addEventListener("touchcancel", cancel);
    element.addEventListener("mousedown", mouseStart);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseEnd);
    window.addEventListener("blur", cancel);
    return () => {
      mounted = false;
      animation?.stop();
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchmove", touchMove);
      element.removeEventListener("touchend", touchEnd);
      element.removeEventListener("touchcancel", cancel);
      element.removeEventListener("mousedown", mouseStart);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseEnd);
      window.removeEventListener("blur", cancel);
    };
  }, [pull, reducedMotion]);

  return (
    <div ref={root} className="relative">
      <motion.div
        className="pointer-events-none flex items-center justify-center overflow-hidden text-primary"
        style={{ height }}
        aria-hidden="true"
      >
        <motion.div style={{ opacity, rotate: reducedMotion ? 0 : rotation }}>
          <motion.div
            animate={{ rotate: refreshing ? 360 : 0 }}
            transition={refreshing ? { duration: 0.9, ease: "linear", repeat: Infinity } : { duration: 0 }}
          >
            <RefreshCw className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </motion.div>
      <span role="status" aria-live="polite" className="sr-only">
        {refreshing ? "Refreshing…" : armed ? "Release to refresh" : ""}
      </span>
      {children}
    </div>
  );
}