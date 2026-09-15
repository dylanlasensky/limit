import React from "react";
import { Activity, ArrowUp, Database, Dumbbell, Target, type LucideIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import type { MuscleGroup, MuscleScore } from "@/components/limit/muscleRating";
const next: Record<string, number> = { Beginner: 40, Intermediate: 65, Advanced: 85 };
const advice: Record<string, string> = {
  Chest: "Prioritize stable presses and controlled stretch work.",
  Back: "Build across vertical pulls and heavy rows.",
  Shoulders: "Progress pressing while keeping lateral work consistent.",
  Biceps: "Use full-range curls and earn load increases.",
  Triceps: "Pair strong presses with overhead extension work.",
  Core: "Progress loaded bracing and anti-extension patterns.",
  Quads: "Own depth, then build load across squats and presses.",
  Hamstrings: "Combine hip hinges with controlled knee flexion.",
  Glutes: "Progress deep squats, hinges, and hip extension.",
  Calves: "Pause every rep through a full range.",
};
interface MuscleDetailSheetProps {
  muscle?: MuscleGroup;
  data?: MuscleScore;
  bodyWeight?: number;
  trend?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export default function MuscleDetailSheet({
  muscle,
  data,
  bodyWeight,
  trend,
  open,
  onOpenChange,
}: MuscleDetailSheetProps) {
  if (!data) return null;
  const target = next[data.level],
    progress = target ? Math.min(100, Math.round((data.score / target) * 100)) : 100;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border bg-card text-foreground">
        <div className="mx-auto w-full max-w-md pb-8">
          <DrawerHeader>
            <DrawerDescription className="limit-kicker">Your strength, in detail</DrawerDescription>
            <DrawerTitle className="text-3xl font-semibold tracking-[-.035em]">
              {muscle}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-5 px-4">
            <div className="limit-hero rounded-3xl p-5">
              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Current level
                  </p>
                  <b className="mt-1 block text-2xl text-primary">{data.level}</b>
                </div>
                <span className="text-4xl font-black tabular-nums">{data.score}</span>
              </div>
              <div className="relative z-10 mt-5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary))] transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="relative z-10 mt-2 text-xs text-muted-foreground">
                {data.level === "Elite"
                  ? "Your logged performance has reached the elite range"
                  : data.confidence < 45
                    ? "More sessions will sharpen this score"
                    : `${progress}% toward ${Object.keys(next)[Object.keys(next).indexOf(data.level) + 1] || "Elite"}`}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  [Database, "Confidence", `${data.confidence}%`],
                  [
                    Activity,
                    "Trend",
                    trend == null ? "Building" : `${trend > 0 ? "+" : ""}${trend}`,
                  ],
                  [Dumbbell, "Sessions", data.sessions || 0],
                ] as Array<[LucideIcon, string, React.ReactNode]>
              ).map(([Icon, label, value]) => (
                <div key={label} className="limit-surface rounded-2xl p-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                  <b className="mt-1 block text-sm tabular-nums">{value}</b>
                </div>
              ))}
            </div>
            <div className="limit-surface rounded-3xl p-5">
              <p className="limit-kicker flex items-center gap-2">
                <Target className="h-3.5 w-3.5" />
                Next move
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {advice[muscle as MuscleGroup] ||
                  "Keep adding clean, repeatable working sets and progress load only when reps are controlled."}
              </p>
            </div>
            <div>
              <h3 className="limit-kicker">Performance signals</h3>
              {data.best?.length ? (
                data.best.map((item, i) => (
                  <div
                    key={i}
                    className="mt-2 flex items-center justify-between border-b border-border/60 py-3 text-sm"
                  >
                    <div>
                      <b>{item.exercise}</b>
                      <p className="text-xs text-muted-foreground">
                        {item.load} lb × {item.reps}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 font-bold tabular-nums text-primary">
                      <ArrowUp className="h-3 w-3" />
                      {item.kind === "isolation" ? `${item.load} lb` : `${item.e1rm} e1RM`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Log relevant working sets to establish your first signal.
                </p>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Based on logged strength performance—not appearance, muscle size, or health. Body
              weight reference: {bodyWeight || "—"} lb.
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
