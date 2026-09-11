import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { today, sumMacros } from '@/components/limit/data';
import { calculateMuscleRating, emptyRating } from '@/components/limit/muscleRating';
import { profileWeightLb } from '@/components/limit/nutritionTargets';
import useActivePlan, { todayWeekday } from '@/hooks/use-active-plan';
import HomeWorkout from '@/components/limit/HomeWorkout';
import MuscleRatingPreview from '@/components/limit/MuscleRatingPreview';
import PullToRefresh from '@/components/limit/PullToRefresh';
import HomeSnapshot from '@/components/limit/HomeSnapshot';
import HomeInsight from '@/components/limit/HomeInsight';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export default function Home() {
  const date = today();
  const profile = useQuery({ queryKey: ['userProfile'], queryFn: () => base44.entities.UserProfile.list(), staleTime: 30000 });
  const foodsQuery = useQuery({ queryKey: ['foodEntries', date], queryFn: () => base44.entities.FoodEntry.filter({ date }), staleTime: 30000 });
  const planQuery = useActivePlan();
  const weightsQuery = useQuery({ queryKey: ['weightEntries'], queryFn: () => base44.entities.WeightEntry.list('date', 30), staleTime: 30000 });
  const workoutExercises = useQuery({ queryKey: ['workoutExercises'], queryFn: () => base44.entities.WorkoutExercise.list(null, 500), staleTime: 60000 });
  const sessionsQuery = useQuery({ queryKey: ['todaySession'], queryFn: async () => { const [todayRows,activeRows]=await Promise.all([base44.entities.WorkoutSession.filter({date}),base44.entities.WorkoutSession.filter({status:'active'},'-created_date',10)]);return [...new Map([...activeRows,...todayRows].map(x=>[x.id,x])).values()] }, staleTime: 15000 });
  const ratingData = useQuery({
    queryKey: ['muscleRatingData'], staleTime: 30000,
    queryFn: async () => {
      const [sets, exercises, sessions, records] = await Promise.all([
        base44.entities.ExerciseSet.list('-timestamp', 500),
        base44.entities.Exercise.list(null, 500),
        base44.entities.WorkoutSession.list('-date', 100),
        base44.entities.PersonalRecord.list('-date', 10)
      ]);
      return { sets, exercises, sessions, records };
    }
  });

  const p = profile.data?.[0] || {};
  const foods = foodsQuery.data || [];
  const { days = [] } = planQuery.data || {};
  const weights = weightsQuery.data || [];
  const data = ratingData.data;
  const rating = data ? calculateMuscleRating({ ...data, profile: p, weights }) : emptyRating();
  const m = sumMacros(foods);
  const weekday = todayWeekday();
  const day = days.find(x => x.weekday === weekday);
  const dayExercises = (workoutExercises.data || []).filter(x => x.workoutDayId === day?.id);
  const todaySessions = sessionsQuery.data || [];
  const activeSession = todaySessions.find(s => s.status === 'active');
  const activeDay = days.find(d => d.id === activeSession?.workoutDayId);
  const completedSession = todaySessions.find(s => s.status === 'completed' && s.workoutDayId === day?.id);
  const heroLine = completedSession ? 'Session done. Recover well.' : activeSession ? 'Finish what you started.' : day && !day.isRest ? 'Beat last week.' : days.length ? 'Recovery day.' : '';
  const latestWeight = weights.at(-1) ? Math.round((weights.at(-1).unit === 'kg' ? weights.at(-1).weight * 2.20462 : weights.at(-1).weight) * 10) / 10 : Math.round(profileWeightLb(p) * 10) / 10 || null;
  const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekDone = (data?.sessions || []).filter(session => session.status === 'completed' && session.date >= weekStartDate).length;
  const weekGoal = days.filter(item => !item.isRest).length;
  const proteinShort = Math.max(0, Math.round((p.proteinTarget || 0) - m.protein));

  const refresh = () => Promise.all([profile.refetch(), foodsQuery.refetch(), planQuery.refetch(), weightsQuery.refetch(), workoutExercises.refetch(), sessionsQuery.refetch(), ratingData.refetch()]);

  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        <header className="mb-5 flex items-end justify-between gap-4 pt-1">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{format(new Date(), 'EEEE, MMM d')}</p><h1 className="mt-1 text-3xl font-extrabold tracking-[-.04em]">{greeting()}{p.name ? `, ${p.name.split(' ')[0]}` : ''}</h1></div>
          <span className="pb-1 text-xs font-extrabold tracking-[.2em] text-primary">LIMIT</span>
        </header>
        <HomeWorkout day={activeDay||day} exercises={activeDay?(workoutExercises.data||[]).filter(x=>x.workoutDayId===activeDay.id):dayExercises} activeSession={activeSession} completedSession={activeDay?null:completedSession} />
        <HomeSnapshot calories={m.calories} calorieGoal={p.calorieTarget} protein={m.protein} proteinGoal={p.proteinTarget} weekDone={weekDone} weekGoal={weekGoal} weight={latestWeight}/>
        <HomeInsight records={data?.records} weekDone={weekDone} weekGoal={weekGoal} proteinShort={proteinShort}/>
        <MuscleRatingPreview rating={rating} />
      </div>
    </PullToRefresh>
  );
}