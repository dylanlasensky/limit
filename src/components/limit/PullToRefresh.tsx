import React, { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
interface PullToRefreshProps {
  onRefresh: () => void | Promise<unknown>;
  children?: React.ReactNode;
}
export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const start = useRef<number | null>(null),
    [pull, setPull] = useState(0),
    [refreshing, setRefreshing] = useState(false);
  const begin = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY <= 0) start.current = e.touches[0].clientY;
  };
  const move = (e: React.TouchEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    setPull(Math.min(72, Math.max(0, (e.touches[0].clientY - start.current) * 0.35)));
  };
  const end = async () => {
    start.current = null;
    if (pull >= 48) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPull(0);
  };
  return (
    <div onTouchStart={begin} onTouchMove={move} onTouchEnd={end} className="relative">
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden text-primary drop-shadow-[0_0_10px_hsl(var(--primary))] transition-[height]"
        style={{ height: pull }}
      >
        <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
      </div>
      {children}
    </div>
  );
}
