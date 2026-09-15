import React, { useState } from "react";
import { LockKeyhole, MoreHorizontal } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { suitableReplacement } from "@/lib/training/exerciseSelection";
import { exerciseSearch } from "@/lib/training/exerciseLibrary";
interface ExerciseOptionsProps {
  exercise?: Record<string, any> | null;
  workoutExercise: Record<string, any>;
  allExercises: any[];
  profile?: Record<string, any> | null;
  canReplace: boolean;
  locked?: boolean;
  onReplace: (exercise: any) => void;
  onSkip: () => void;
  onDetails: () => void;
}
export default function ExerciseOptions({
  exercise,
  workoutExercise,
  allExercises,
  profile,
  canReplace,
  locked,
  onReplace,
  onSkip,
  onDetails,
}: ExerciseOptionsProps) {
  const [open, setOpen] = useState(false),
    [replacing, setReplacing] = useState(false),
    [search, setSearch] = useState(""),
    alternatives = allExercises.filter(
      (item) => suitableReplacement(exercise, item, profile) && exerciseSearch(item, search)
    ),
    close = () => {
      setOpen(false);
      setReplacing(false);
      setSearch("");
    };
  return (
    <>
      <button
        aria-label={`Options for ${workoutExercise.exerciseName}`}
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <Drawer open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
        <DrawerContent className="bg-card text-foreground">
          <div className="mx-auto w-full max-w-md px-5 pb-8">
            <DrawerHeader className="px-0">
              <DrawerTitle>
                {replacing ? "Replace exercise" : workoutExercise.exerciseName}
              </DrawerTitle>
              <DrawerDescription>
                {locked
                  ? "This exercise is protected by your imported program."
                  : replacing
                    ? "Similar movement and muscle target, using your equipment."
                    : "Changes affect this workout, not your program."}
              </DrawerDescription>
            </DrawerHeader>
            {replacing ? (
              <div className="max-h-[50dvh] space-y-2 overflow-y-auto">
                <input
                  aria-label="Search replacements"
                  placeholder="Search replacements"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-secondary px-3"
                />
                {alternatives.length ? (
                  alternatives.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onReplace(item);
                        close();
                      }}
                      className="limit-surface w-full rounded-xl p-4 text-left"
                    >
                      <b className="text-sm">{item.name}</b>
                      <p className="mt-1 text-xs text-muted-foreground">{item.equipment}</p>
                    </button>
                  ))
                ) : (
                  <p className="py-5 text-sm text-muted-foreground">
                    No suitable replacements in your library for this equipment.
                  </p>
                )}
                <button
                  onClick={() => setReplacing(false)}
                  className="h-12 w-full text-sm font-bold"
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    close();
                    onDetails();
                  }}
                  className="h-12 w-full rounded-xl bg-secondary font-semibold"
                >
                  Exercise details
                </button>
                {locked ? (
                  <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[.06] p-4">
                    <LockKeyhole className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Coach-required or Track Only work can be logged exactly as prescribed, but not
                      replaced or skipped.
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      disabled={!canReplace}
                      onClick={() => setReplacing(true)}
                      className="h-12 w-full rounded-xl bg-secondary font-semibold disabled:opacity-40"
                    >
                      Replace exercise
                    </button>
                    {!canReplace && (
                      <p className="text-xs text-muted-foreground">
                        Replacement is available before any sets are saved.
                      </p>
                    )}
                    <button
                      onClick={() => {
                        onSkip();
                        close();
                      }}
                      className="h-12 w-full rounded-xl bg-secondary font-semibold"
                    >
                      {workoutExercise.skipped ? "Restore exercise" : "Skip remaining sets"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
