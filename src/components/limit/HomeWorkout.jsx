import React from 'react';
import { Dumbbell } from 'lucide-react';
import TodayWorkoutHero from '@/components/workout/TodayWorkoutHero';

export default function HomeWorkout({ day, exercises = [], activeSession, completedSession }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-blue-500">
        <Dumbbell className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Training</span>
      </div>
      <div className="-mt-3">
        <TodayWorkoutHero day={day} exercises={exercises} activeSession={activeSession} completedSession={completedSession} />
      </div>
    </div>
  );
}