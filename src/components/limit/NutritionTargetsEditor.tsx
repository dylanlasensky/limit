import React from "react";
interface NutritionTargetsEditorProps {
  profile: Record<string, any>;
  profileChanged?: boolean;
  onTargetsChange: (key: string, value: number) => void;
  onRecalculate: () => void;
}
export default function NutritionTargetsEditor({
  profile,
  profileChanged,
  onTargetsChange,
  onRecalculate,
}: NutritionTargetsEditorProps) {
  return (
    <section className="limit-surface mt-4 rounded-3xl p-5">
      <p className="limit-kicker text-muted-foreground">Nutrition preferences</p>
      <h2 className="mt-2 text-xl font-semibold">Daily nutrition targets</h2>
      {profileChanged && (
        <div className="mt-3 rounded-xl border border-primary/25 bg-primary/10 p-3">
          <p className="text-sm font-bold">Your profile changed.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recalculate your recommended nutrition targets?
          </p>
          <button
            onClick={onRecalculate}
            className="mt-3 min-h-10 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            Recalculate
          </button>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["calorieTarget", "Calories"],
          ["proteinTarget", "Protein (g)"],
          ["carbTarget", "Carbs (g)"],
          ["fatTarget", "Fat (g)"],
        ].map(([k, l]) => (
          <label key={k} className="text-xs text-muted-foreground">
            {l}
            <input
              type="number"
              value={profile[k] || ""}
              onChange={(e) => onTargetsChange(k, +e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-transparent px-3 text-base text-foreground"
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {profile.targetExplanation || "Personalized from your profile. This is an estimate."}
        {profile.targetsCustomized ? " Custom targets are preserved." : ""}
      </p>
      {!profileChanged && (
        <button
          onClick={onRecalculate}
          className="mt-3 min-h-10 text-xs font-semibold text-primary"
        >
          Recalculate recommendation
        </button>
      )}
    </section>
  );
}
