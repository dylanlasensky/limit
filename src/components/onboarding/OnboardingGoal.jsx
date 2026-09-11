import React from 'react';
import { Check } from 'lucide-react';
const goals = [
  ['Build Muscle', 'gain muscle', 'Add size with focused hypertrophy training'],
  ['Get Stronger', 'get stronger', 'Push your big lifts up with strength work'],
  ['Muscle + Strength', 'muscle and strength', 'Heavy compounds plus growth volume'],
  ['Lose Fat', 'lose fat', 'Drop fat while keeping the muscle you have'],
  ['General Fitness', 'general fitness', 'Balanced training for overall health'],
  ['Use My Program', 'follow existing program', 'Import a coach plan, team lift, note, image, or PDF', true]
];
export default function OnboardingGoal({ data, set }) {
  return (
    <div className="space-y-3">
      {goals.map(([label, value, hint, imported]) => (
        <button key={value} type="button" onClick={() => { set('fitnessGoal', value); set('importAfterOnboarding', !!imported); }}
          className={`limit-surface flex w-full items-center justify-between rounded-3xl p-5 text-left transition-all ${data.fitnessGoal === value ? 'border-primary/60 bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary)),0_14px_35px_hsl(var(--primary)/.08)]' : 'hover:border-primary/20'}`}>
          <span><b className="block">{label}</b><span className="text-sm text-muted-foreground">{hint}</span></span>
          {data.fitnessGoal === value && <Check className="h-5 w-5 shrink-0 text-blue-500" />}
        </button>
      ))}
    </div>
  );
}