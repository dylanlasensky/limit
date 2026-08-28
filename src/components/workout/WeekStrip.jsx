import React from 'react';
import { todayWeekday } from '@/hooks/use-active-plan';

// days: 7 WorkoutDay records (Mon→Sun). completedWeekdays: Set of weekday indexes completed this week.
export default function WeekStrip({ days, completedWeekdays }) {
  const today = todayWeekday();
  return (
    <div className="flex justify-between">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => {
        const day = days.find(d => d.weekday === i);
        const rest = !day || day.isRest;
        const done = completedWeekdays.has(i);
        const isToday = i === today;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-bold ${isToday ? 'text-blue-500' : 'text-zinc-600'}`}>{letter}</span>
            <div className={`grid h-9 w-9 place-items-center rounded-full text-[10px] font-black transition-colors
              ${done ? 'bg-blue-600 text-white' : isToday ? 'border-2 border-blue-600 text-blue-500' : rest ? 'border border-zinc-800 text-zinc-700' : 'border border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
              {done ? '✓' : rest ? '·' : day.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}