import React from "react";
import { Dumbbell } from "lucide-react";
import TodayWorkoutHero from "@/components/workout/TodayWorkoutHero";

interface HomeWorkoutProps {
  day?: Record<string, any> | null;
  exercises?: any[];
  activeSession?: Record<string, any> | null;
  completedSession?: Record<string, any> | null;
}

export default function HomeWorkout({
  day,
  exercises = [],
  activeSession,
  completedSession,
}: HomeWorkoutProps) {
  return (
    <div>
      <div className="flex items-center gap-2 text-primary">
        <Dumbbell className="h-4 w-4" />
        <span className="text-xs font-semibold">Today’s training</span>
      </div>
      <div className="-mt-3">
        <TodayWorkoutHero
          day={day}
          exercises={exercises}
          activeSession={activeSession}
          completedSession={completedSession}
        />
      </div>
    </div>
  );
}
