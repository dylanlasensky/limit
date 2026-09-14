import React from "react";
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
}
export default function ExerciseDetails({ exercise, open, onOpenChange }: ExerciseDetailsProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border bg-card text-foreground">
        <div className="mx-auto w-full max-w-md px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0">
            <DrawerDescription className="text-xs font-bold uppercase tracking-widest text-primary">
              Exercise reference
            </DrawerDescription>
            <DrawerTitle className="text-2xl font-black tracking-tight">
              {exercise?.name}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-wrap gap-2">
            {[exercise?.primaryMuscle, exercise?.category, exercise?.equipment]
              .filter(Boolean)
              .map((x: string) => (
                <span key={x} className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">
                  {x}
                </span>
              ))}
          </div>
          {exercise?.secondaryMuscles?.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Also trains {exercise!.secondaryMuscles.join(", ")}.
            </p>
          )}
          <h3 className="mb-3 mt-6 font-bold">Before your working sets</h3>
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
