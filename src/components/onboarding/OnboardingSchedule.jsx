import React from 'react';
import { WEEKDAYS } from '@/lib/training/programEngine';
export default function OnboardingSchedule({ data, set }) {
  const days = data.availableDays || [];
  const toggle = d => {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
    if (next.length > 6) return;
    set('availableDays', next.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)));
  };
  return (
    <div>
      <p className="text-sm text-muted-foreground">Pick the exact days you can train. LIMIT builds your week around them.</p>
      <div className="mt-4 grid grid-cols-1 gap-2">
        {WEEKDAYS.map(d => (
          <button key={d} type="button" onClick={() => toggle(d)}
            className={`flex min-h-12 w-full items-center py-3 justify-between rounded-xl border px-4 font-semibold transition-colors ${days.includes(d) ? 'border-blue-600 bg-blue-600/10 text-blue-500' : 'border-border'}`}>
            {d}
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${days.includes(d) ? 'border-blue-600 bg-blue-600 text-white' : 'border-border text-transparent'}`}>✓</span>
          </button>
        ))}
      </div>
      <p className={`mt-4 text-sm font-bold ${days.length >= 2 ? 'text-blue-500' : 'text-muted-foreground'}`}>
        {days.length} day{days.length === 1 ? '' : 's'} per week{days.length < 2 ? ' · pick at least 2' : ''}
      </p>
    </div>
  );
}