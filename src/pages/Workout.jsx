import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import useActivePlan, { todayWeekday } from '@/hooks/use-active-plan';
import WeekStrip from '@/components/workout/WeekStrip';
import TodayWorkoutHero from '@/components/workout/TodayWorkoutHero';
import PullToRefresh from '@/components/limit/PullToRefresh';

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Workout() {
  const [tab, setTab] = useState('Schedule');
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const planQuery = useActivePlan();
  const exQuery = useQuery({ queryKey: ['exercises'], queryFn: () => base44.entities.Exercise.list(null, 500), staleTime: 60000 });
  const weQuery = useQuery({ queryKey: ['workoutExercises'], queryFn: () => base44.entities.WorkoutExercise.list(null, 500), staleTime: 60000 });
  const historyQuery = useQuery({ queryKey: ['workoutHistory'], queryFn: () => base44.entities.WorkoutSession.filter({ status: 'completed' }, '-date', 30), staleTime: 30000 });
  const activeQuery = useQuery({ queryKey: ['activeSession'], queryFn: () => base44.entities.WorkoutSession.filter({ status: 'active' }, '-created_date'), staleTime: 15000 });

  const { plan, days = [] } = planQuery.data || {};
  const exercises = exQuery.data || [], history = historyQuery.data || [];
  const weekday = todayWeekday();
  const today = days.find(d => d.weekday === weekday);
  const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const completedWeekdays = new Set(history
    .filter(s => s.date >= format(weekStartDate, 'yyyy-MM-dd'))
    .map(s => days.findIndex(d => d.id === s.workoutDayId)).filter(i => i >= 0)
    .map(i => days[i].weekday));
  const trainingDays = days.filter(d => !d.isRest);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const activeSession = (activeQuery.data || []).find(s => s.date === todayStr && days.some(d => d.id === s.workoutDayId));
  const completedToday = history.find(s => s.workoutDayId === today?.id && s.date === todayStr);
  const nextDay = today?.isRest ? (() => {
    for (let i = 1; i <= 7; i++) {
      const d = days.find(x => x.weekday === (weekday + i) % 7 && !x.isRest);
      if (d) return { ...today, next: { name: d.name, label: i === 1 ? 'Tomorrow' : WEEKDAY_LABELS[(weekday + i) % 7] } };
    }
    return today;
  })() : today;

  const refresh = () => Promise.all([planQuery.refetch(), historyQuery.refetch(), activeQuery.refetch(), weQuery.refetch()]);

  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        <header className="flex items-end justify-between">
          <h1 className="text-3xl font-black tracking-tight">Workout</h1>
          {plan && <p className="text-xs font-bold text-zinc-500">THIS WEEK <span className="text-blue-500">{completedWeekdays.size} / {trainingDays.length}</span></p>}
        </header>
        <div className="no-scrollbar my-5 grid grid-cols-3 rounded-xl bg-zinc-200/60 p-1 dark:bg-zinc-800">
          {['Schedule', 'Exercises', 'History'].map(x => (
            <button key={x} onClick={() => setTab(x)} className={`h-10 rounded-lg text-sm font-bold transition-colors ${tab === x ? 'bg-white dark:bg-zinc-700' : 'text-zinc-500'}`}>{x}</button>
          ))}
        </div>

        {tab === 'Schedule' && (planQuery.isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-900/70" />)}</div>
        ) : !plan ? (
          <section className="rounded-3xl border border-zinc-800 bg-[#121217] p-8 text-center">
            <h2 className="text-xl font-black">No workout plan</h2>
            <p className="mt-2 text-sm text-zinc-500">Build your training plan and LIMIT will schedule your week.</p>
            <button onClick={() => nav('/onboarding')} className="mt-5 h-12 rounded-xl bg-blue-600 px-6 font-bold text-white">CREATE PLAN</button>
          </section>
        ) : (
          <>
            <WeekStrip days={days} completedWeekdays={completedWeekdays} />
            <TodayWorkoutHero day={nextDay} exercises={(weQuery.data || []).filter(x => x.workoutDayId === today?.id)}
              activeSession={activeSession} completedSession={completedToday} />
            {activeSession && activeSession.workoutDayId !== today?.id && (
              <p className="mt-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">You have a workout in progress from another day. Resume it from its schedule row or it will stay open.</p>
            )}
            <p className="mb-2 mt-7 text-xs font-black tracking-[.16em] text-zinc-500">{plan.name.toUpperCase()} · {plan.daysPerWeek} DAYS</p>
            <div className="space-y-2">
              {days.map(d => (
                <div key={d.id} className={`flex items-center justify-between rounded-2xl border p-4 ${d.weekday === weekday ? 'border-blue-900/60 bg-[#121217]' : 'border-zinc-800/70 bg-[#101014]'}`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{WEEKDAY_LABELS[d.weekday]}</p>
                    <b className={d.isRest ? 'text-zinc-600' : ''}>{d.name}</b>
                    {!d.isRest && <p className="text-xs text-zinc-500">{(weQuery.data || []).filter(x => x.workoutDayId === d.id).length} exercises</p>}
                  </div>
                  {!d.isRest && (
                    <button onClick={() => nav(`/live-workout/${d.id}`)}
                      className={`rounded-xl px-4 py-2.5 text-sm font-bold ${activeSession?.workoutDayId === d.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                      {activeSession?.workoutDayId === d.id ? 'Resume' : 'Start'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        ))}

        {tab === 'Exercises' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search exercises"
                className="h-12 w-full rounded-xl border border-zinc-800 bg-[#121217] pl-10" />
            </div>
            {exercises.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).map(x => (
              <div key={x.id} className="mt-2 flex items-center justify-between rounded-xl border border-zinc-800/70 bg-[#121217] p-3.5">
                <div>
                  <b className="text-sm">{x.name}</b>
                  <p className="text-xs text-zinc-500">{x.primaryMuscle} · {x.equipment}{x.repMin ? ` · ${x.repMin}–${x.repMax} reps` : ''}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-700" />
              </div>
            ))}
          </>
        )}

        {tab === 'History' && (history.length ? history.map(x => (
          <div key={x.id} className="mt-3 rounded-2xl border border-zinc-800/70 bg-[#121217] p-4">
            <div className="flex justify-between">
              <b>{x.name}</b>
              <span className="text-xs tabular-nums text-zinc-500">{format(new Date(`${x.date}T12:00:00`), 'MMM d').toUpperCase()}</span>
            </div>
            <p className="mt-1 text-sm tabular-nums text-zinc-500">
              {x.durationMinutes ? `${x.durationMinutes} min · ` : ''}{x.setCount ? `${x.setCount} sets · ` : ''}{Math.round(x.totalVolume || 0).toLocaleString()} lb{x.prCount ? ` · ${x.prCount} PR${x.prCount > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        )) : (
          <section className="rounded-3xl border border-zinc-800 bg-[#121217] p-8 text-center">
            <h2 className="font-black">Your training history starts here.</h2>
            <p className="mt-2 text-sm text-zinc-500">Finish your first workout and it will show up in History.</p>
          </section>
        ))}
      </div>
    </PullToRefresh>
  );
}