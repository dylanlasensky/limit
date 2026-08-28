import React from 'react';
import { Check } from 'lucide-react';
const goals = [
  ['Build Muscle', 'gain muscle', 'Add size with focused hypertrophy training'],
  ['Get Stronger', 'get stronger', 'Push your big lifts up with strength work'],
  ['Muscle + Strength', 'muscle and strength', 'Heavy compounds plus growth volume'],
  ['Lose Fat', 'lose fat', 'Drop fat while keeping the muscle you have'],
  ['General Fitness', 'general fitness', 'Balanced training for overall health']
];
export default function OnboardingGoal({ data, set }) {
  return (
    <div className="space-y-3">
      {goals.map(([label, value, hint]) => (
        <button key={value} type="button" onClick={() => set('fitnessGoal', value)}
          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${data.fitnessGoal === value ? 'border-blue-600 bg-blue-600/10' : 'border-border'}`}>
          <span><b className="block">{label}</b><span className="text-sm text-muted-foreground">{hint}</span></span>
          {data.fitnessGoal === value && <Check className="h-5 w-5 shrink-0 text-blue-500" />}
        </button>
      ))}
    </div>
  );
}