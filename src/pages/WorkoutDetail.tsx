import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ScreenState from "@/components/limit/ScreenState";

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const query = useQuery({
    queryKey: ["workoutDetail", id],
    queryFn: async () => {
      let session: any = await base44.entities.WorkoutSession.get(id as string);
      if (session.status !== "completed") throw new Error("This workout is not complete.");
      if (session.analyticsStatus === "pending") {
        const { data } = await base44.functions.invoke("workoutCommand", {
          action: "finish",
          sessionId: id,
          expectedSets: [],
        });
        session = {
          ...session,
          completionSummary: data.summary,
          analyticsStatus: data.summary.analyticsPending ? "pending" : "complete",
        };
      }
      const [sets, prs] = await Promise.all([
        base44.entities.ExerciseSet.filter(
          { workoutSessionId: id, completed: true },
          "setNumber",
          500
        ),
        base44.entities.PersonalRecord.filter({ workoutSessionId: id }, "-value", 100),
      ]);
      return { session, sets, prs };
    },
  });
  if (query.isLoading) return <ScreenState loading />;
  if (query.error)
    return (
      <ScreenState
        title="Couldn’t load this workout"
        description="The summary is unavailable right now."
        onAction={() => query.refetch()}
      />
    );
  const { session, sets, prs } = query.data!;
  const groups = sets.reduce<Record<string, any[]>>((all, row: any) => {
    (all[row.exerciseName] ||= []).push(row);
    return all;
  }, {});
  return (
    <div>
      <button
        onClick={() => nav("/workout?tab=history")}
        className="mb-5 flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        History
      </button>
      <div className="lg:grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-6">
        <div className="min-w-0 lg:sticky lg:top-6">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">
            Completed workout
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{session.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.date} · {session.durationMinutes || 0} min
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 lg:grid-cols-1 xl:grid-cols-3">
            {[
              [session.setCount || sets.length, "Sets"],
              [Math.round(session.totalVolume || 0).toLocaleString(), "Lb volume"],
              [session.prCount || prs.length, "PRs"],
            ].map(([value, label]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-border bg-card p-3 text-center"
              >
                <b className="text-xl tabular-nums">{value}</b>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
          {prs.length > 0 && (
            <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <Trophy className="h-4 w-4" />
                Personal records
              </p>
              {prs.map((pr: any) => (
                <p key={pr.id} className="mt-3 text-sm">
                  <b>{pr.exerciseName}</b> ·{" "}
                  {pr.type === "e1rm" ? `${pr.value} lb e1RM` : `${pr.value} lb`}
                </p>
              ))}
            </section>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 mt-7 lg:mt-0 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Exercise performance
          </h2>
          {Object.entries(groups).map(([name, rows]) => (
            <section key={name} className="mb-3 rounded-2xl border border-border bg-card p-4">
              <h3 className="font-bold">{name}</h3>
              <div className="mt-3 space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {row.setType === "warmup"
                        ? "Warm-up"
                        : row.setType === "drop"
                          ? "Drop set"
                          : "Set"}{" "}
                      {row.setNumber}
                    </span>
                    <b className="tabular-nums">
                      {row.weight} lb × {row.reps}
                      {row.rir != null ? ` · ${row.rir} RIR` : ""}
                    </b>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
