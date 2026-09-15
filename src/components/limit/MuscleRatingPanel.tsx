import React, { useState } from "react";
import { Activity, Database, Zap } from "lucide-react";
import BodyMap from "@/components/limit/BodyMap";
import MuscleDetailSheet from "@/components/limit/MuscleDetailSheet";
import RatingHistory from "@/components/limit/RatingHistory";
import type { BodyView } from "@/components/limit/athleticBodyArtwork";
import type { MuscleGroup, MuscleRating, RatingSnapshot } from "@/components/limit/muscleRating";
const tiers: Array<[string, string]> = [
  ["Beginner", "tier-beginner"],
  ["Intermediate", "tier-intermediate"],
  ["Advanced", "tier-advanced"],
  ["Elite", "tier-elite"],
];
interface MuscleRatingPanelProps {
  rating: MuscleRating;
  snapshots?: Array<Partial<RatingSnapshot> & Record<string, any>>;
}
export default function MuscleRatingPanel({ rating, snapshots = [] }: MuscleRatingPanelProps) {
  const [view, setView] = useState<BodyView>("front"),
    [selected, setSelected] = useState<MuscleGroup | undefined>();
  const data = rating.muscles[selected as MuscleGroup],
    history = snapshots
      .map((s) => s.muscleScores?.[selected as MuscleGroup])
      .filter((x): x is number => Number.isFinite(x)),
    trend = history.length > 1 ? history[0] - (history.at(-1) as number) : null;
  return (
    <section className="limit-hero rounded-[2rem] p-5 sm:p-6">
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="limit-kicker flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" />
            Strength profile
          </p>
          <h2 className="mt-2 text-4xl font-bold tracking-[-.035em]">{rating.overallLevel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Strength profile · Score{" "}
            <span className="font-bold text-foreground">{rating.overallScore}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-right backdrop-blur">
          <Database className="ml-auto h-3.5 w-3.5 text-primary" />
          <b className="mt-1 block text-lg tabular-nums">{snapshots.length}</b>
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            signals
          </p>
        </div>
      </div>
      {!rating.hasData && (
        <div className="relative z-10 mt-5 border-l-2 border-primary pl-4">
          <b className="text-sm">Your profile is calibrating</b>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Log your workouts to see how your strength develops across muscle groups.
          </p>
        </div>
      )}
      <div className="relative z-10 mt-5 flex rounded-xl bg-background/60 p-1">
        <button
          onClick={() => setView("front")}
          className={`h-10 flex-1 rounded-lg text-[10px] font-black tracking-[.2em] transition-all ${view === "front" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground"}`}
        >
          FRONT
        </button>
        <button
          onClick={() => setView("back")}
          className={`h-10 flex-1 rounded-lg text-[10px] font-black tracking-[.2em] transition-all ${view === "back" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground"}`}
        >
          BACK
        </button>
      </div>
      <div className="limit-grid relative z-10 mt-3 overflow-hidden rounded-[1.75rem] border border-border/50 bg-background/50">
        <BodyMap rating={rating} view={view} selected={selected} onSelect={setSelected} />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">
          <Activity className="h-3 w-3 text-primary" />
          Tap a muscle
        </div>
      </div>
      <div className="relative z-10 mt-4 grid grid-cols-4 gap-1">
        {tiers.map(([label, color]) => (
          <div key={label} className="text-center">
            <span className={`mx-auto block h-1 w-6 rounded-full bg-current ${color}`} />
            <span className="mt-2 block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
      <RatingHistory snapshots={snapshots} />
      <MuscleDetailSheet
        muscle={selected}
        data={data}
        bodyWeight={rating.bodyWeight}
        trend={trend}
        open={Boolean(selected)}
        onOpenChange={(open: boolean) => !open && setSelected(undefined)}
      />
    </section>
  );
}
