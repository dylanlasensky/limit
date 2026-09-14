import React, { useEffect, useState } from "react";
interface ElapsedProps {
  startedAt: string | number | Date;
}
export default function Elapsed({ startedAt }: ElapsedProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)) || 0;
  return (
    <span className="font-mono tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
