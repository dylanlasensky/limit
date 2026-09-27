import React from "react";
export default function WorkoutHelp() {
  return (
    <details className="mt-4 rounded-2xl border border-border bg-card px-4">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold">
        New to workout logging?
      </summary>
      <dl className="grid gap-3 pb-4 text-sm">
        <div>
          <dt className="font-semibold">Rep · one repetition</dt>
          <dd className="text-muted-foreground">
            One complete movement. Ten squats means ten reps.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Set · a group of reps</dt>
          <dd className="text-muted-foreground">Do the reps, mark the set complete, then rest.</dd>
        </div>
        <div>
          <dt className="font-semibold">Warm-up</dt>
          <dd className="text-muted-foreground">
            A lighter practice set before your working sets. It does not count toward your strength
            records.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Reps left · optional effort rating</dt>
          <dd className="text-muted-foreground">
            How many more reps you could do with good form. This is sometimes called RIR. Start with
            two or three left.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Rest and tempo</dt>
          <dd className="text-muted-foreground">
            Rest between sets until you are ready. Tempo means movement speed: keep it controlled.
          </dd>
        </div>
      </dl>
    </details>
  );
}
