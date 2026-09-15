import React from "react";
import { Star } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
interface ExerciseDetailsProps {
  exercise?: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorite?: boolean;
  onFavorite?: () => void;
  referenceMessage?: string;
}
export default function ExerciseDetails({
  exercise,
  open,
  onOpenChange,
  favorite,
  onFavorite,
  referenceMessage,
}: ExerciseDetailsProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border bg-card text-foreground">
        <div className="mx-auto max-h-[82dvh] w-full max-w-md overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0">
            <DrawerDescription className="text-xs font-bold uppercase tracking-widest text-primary">
              Exercise reference
            </DrawerDescription>
            <DrawerTitle className="text-2xl font-black tracking-tight">
              {exercise?.name}
            </DrawerTitle>
          </DrawerHeader>
          {onFavorite && (
            <button
              onClick={onFavorite}
              aria-pressed={favorite}
              className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-primary"
            >
              <Star aria-hidden className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
              {favorite ? "Saved to favorites" : "Save to favorites"}
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            {[exercise?.primaryMuscle, exercise?.difficulty, exercise?.equipment]
              .filter(Boolean)
              .map((x: string) => (
                <span key={x} className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">
                  {x}
                </span>
              ))}
          </div>
          {exercise?.movementPattern && (
            <p className="mt-4 text-sm font-medium">
              {exercise.movementPattern} · {exercise.trainingFocus}
            </p>
          )}
          {exercise?.aliases?.some((name: string) => name !== exercise?.name) && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Also called{" "}
              {exercise?.aliases.filter((name: string) => name !== exercise?.name).join(", ")}.
            </p>
          )}
          {exercise?.secondaryMuscles?.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Also trains {exercise!.secondaryMuscles.join(", ")}.
            </p>
          )}
          {exercise?.coachingRecommended && (
            <p className="mt-4 rounded-xl border border-primary/25 bg-primary/[.06] p-3 text-sm leading-relaxed">
              Coaching recommended. Learn the setup and progression before loading this movement.
              Power drills are not programmed like bodybuilding sets.
            </p>
          )}
          <h3 className="mb-3 mt-6 font-bold">Movement notes</h3>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
            {(exercise?.instructions?.length
              ? exercise.instructions
              : [
                  "Start with a light warm-up to check your setup and comfortable range of motion.",
                  "Use a controlled tempo and a stable position; stop the set when you can no longer maintain your technique.",
                  "Stop if you feel sharp or unusual pain. Ask a qualified coach for movement-specific setup.",
                ]
            ).map((text: string, i: number) => (
              <li key={i}>{text}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            These are brief reference cues, not a complete tutorial or an injury-treatment plan.
            Stop for sharp or unusual pain and seek qualified guidance. For unilateral exercises,
            record reps per side consistently.
          </p>
          {exercise?.referenceOnly && (
            <p className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              {referenceMessage ||
                "Reference preview. This movement’s saved database record is not connected yet; it will be available to select in programs after the library sync finishes."}
            </p>
          )}
          {!exercise?.instructions?.length && (
            <p className="mt-4 text-xs text-muted-foreground">
              General lifting guidance, not an exercise-specific tutorial.
            </p>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="mt-6 h-12 w-full rounded-xl bg-secondary font-bold"
          >
            Done
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
