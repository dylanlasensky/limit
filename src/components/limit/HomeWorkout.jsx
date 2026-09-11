import React from 'react';
import TodayWorkoutHero from '@/components/workout/TodayWorkoutHero';

export default function HomeWorkout({ day, exercises = [], activeSession, completedSession }) {
  return <TodayWorkoutHero day={day} exercises={exercises} activeSession={activeSession} completedSession={completedSession} />;
}