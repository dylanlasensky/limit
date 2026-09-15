import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import BodyMap from "@/components/limit/BodyMap";
import type { MuscleRating } from "@/components/limit/muscleRating";
interface MuscleRatingPreviewProps {
  rating: MuscleRating;
}
export default function MuscleRatingPreview({ rating }: MuscleRatingPreviewProps) {
  const high = Object.values(rating.muscles).filter((x) =>
    ["Advanced", "Elite"].includes(x.level)
  ).length;
  return (
    <Link
      to="/progress?tab=muscle-rating"
      className="limit-hero group mt-8 block rounded-[2rem] p-5 active:scale-[.985]"
    >
      <div className="relative z-10 grid grid-cols-[1fr_120px] items-center">
        <div className="min-w-0">
          <p className="limit-kicker flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Muscle rating
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-.035em]">
            {rating.hasData ? rating.overallLevel : "Discover your strength"}
          </h2>
          <p className="mt-1 max-w-[13rem] text-sm leading-relaxed text-muted-foreground">
            {rating.hasData
              ? `${high} muscle groups have reached advanced or elite levels.`
              : "Your strength map grows with each workout you log."}
          </p>
          <span className="mt-5 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-primary">
            View strength map{" "}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
        <div className="limit-grid flex h-44 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-border/50 bg-background/50">
          <BodyMap rating={rating} view="front" compact />
          <BodyMap rating={rating} view="back" compact />
        </div>
      </div>
    </Link>
  );
}
