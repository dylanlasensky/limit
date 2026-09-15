import React from "react";
interface DailyTargetSummaryProps {
  profile: {
    calorieTarget?: number;
    proteinTarget?: number;
    targetExplanation?: string;
    [key: string]: any;
  };
}
export default function DailyTargetSummary({ profile }: DailyTargetSummaryProps) {
  return (
    <section className="limit-surface mb-4 rounded-3xl p-5">
      <p className="text-xs font-medium text-primary">Your daily target</p>
      <div className="mt-2 flex flex-wrap items-end gap-4">
        <b className="text-3xl">
          {(profile.calorieTarget || 0).toLocaleString()}{" "}
          <span className="text-sm text-muted-foreground">calories</span>
        </b>
        <b className="pb-1 text-sm">{profile.proteinTarget || 0}g protein</b>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {profile.targetExplanation ||
          "Based on your current weight, activity, training schedule, and fitness goal. This is an estimate."}
      </p>
    </section>
  );
}
