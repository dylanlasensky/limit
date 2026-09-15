import React from "react";
interface RatingHistoryProps {
  snapshots: Array<{ overallLevel?: string; [key: string]: any }>;
}
export default function RatingHistory({ snapshots }: RatingHistoryProps) {
  if (snapshots.length < 2) return null;
  const ordered = [...snapshots].reverse();
  const levels = ordered
    .map((x) => x.overallLevel as string)
    .filter((x, i, a) => i === 0 || x !== a[i - 1]);
  return (
    <div className="relative z-10 mt-5 border-t border-border/60 pt-4">
      <p className="limit-kicker text-muted-foreground">Rating history</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
        {levels.map((x, i) => (
          <React.Fragment key={`${x}-${i}`}>
            <span className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
              {x}
            </span>
            {i < levels.length - 1 && <span className="text-primary">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
