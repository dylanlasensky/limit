import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, SlidersHorizontal } from 'lucide-react';
import SegmentedTabs from '@/components/limit/SegmentedTabs';
import ScreenState from '@/components/limit/ScreenState';
import ExerciseDetails from '@/components/workout/ExerciseDetails';
import { format, startOfWeek } from 'date-fns';
import useActivePlan, { todayWeekday } from '@/hooks/use-active-plan';
import WeekStrip from '@/components/workout/WeekStrip';
import TodayWorkoutHero from '@/components/workout/TodayWorkoutHero';
import PlanOptions from '@/components/workout/PlanOptions';
import PullToRefresh from '@/components/limit/PullToRefresh';

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Workout() {
  const [tab, setTab] = useState('Schedule');
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('All');
  const [equipment, setEquipment] = useState('All');
  const [detail, setDetail] = useState(null);
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
  const activeSession = (activeQuery.data || []).find(s => days.some(d => d.id === s.workoutDayId));
  const activeDay = days.find(d => d.id === activeSession?.workoutDayId);
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
        <header className="limit-hero flex items-end justify-between rounded-[2rem] p-5">
          <div className="relative z-10"><p className="limit-kicker">Training block</p><h1 className="mt-2 text-4xl font-black italic tracking-[-.04em]">WORKOUT</h1></div>
          {plan && <div className="relative z-10 text-right"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">This week</p><p className="mt-1 text-2xl font-black tabular-nums text-primary">{completedWeekdays.size}<span className="text-sm text-muted-foreground"> / {trainingDays.length}</span></p></div>}
        </header>
        <SegmentedTabs options={['Schedule','Exercises','History']} value={tab} onChange={setTab} label="Workout sections" />
        {tab === 'Schedule' && (planQuery.isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-900/70" />)}</div>
        ) : !plan ? (
          <section className="rounded-3xl border border-zinc-800 bg-[#121217] p-8 text-center">
            <h2 className="text-xl font-black">No workout plan</h2>
            <p className="mt-2 text-sm text-zinc-500">Answer a few questions and LIMIT will build and schedule your training week.</p>
            <button onClick={() => nav('/onboarding')} className="limit-button mt-5 h-12 rounded-xl px-6 font-bold">BUILD MY LIMIT PLAN</button>
            <button onClick={() => nav('/workout/import')} className="mt-3 min-h-11 w-full text-xs font-bold text-muted-foreground">Already have a program? Use your own</button>
          </section>
        ) : (
          <>
            <WeekStrip days={days} completedWeekdays={completedWeekdays} />
            <TodayWorkoutHero day={activeDay || nextDay} exercises={(weQuery.data || []).filter(x => x.workoutDayId === (activeDay?.id || today?.id))}
              activeSession={activeSession} completedSession={activeDay ? null : completedToday} />
            {activeSession && activeSession.workoutDayId !== today?.id && (
              <p className="mt-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">You have a workout in progress from another day. Resume it from its schedule row or it will stay open.</p>
            )}
            <p className="mb-2 mt-7 text-xs font-black tracking-[.16em] text-zinc-500">{plan.name.toUpperCase()} · {plan.daysPerWeek} DAYS</p>
            <div className="space-y-2">
              {days.map(d => (
                <div key={d.id} className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${d.weekday === weekday ? 'border-primary/40 bg-primary/[.07] shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'border-border/50 bg-card/60'}`}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{WEEKDAY_LABELS[d.weekday]}</p>
                    <div className="flex items-center gap-2"><b className={d.isRest ? 'text-zinc-600' : ''}>{d.name}</b>{d.coachMandated&&<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-black tracking-wider text-primary">COACH</span>}{d.fixedSchedule&&<span className="rounded-full bg-secondary px-2 py-0.5 text-[8px] font-black tracking-wider text-muted-foreground">FIXED</span>}</div>
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
            <PlanOptions plan={plan} onGenerate={()=>nav('/profile')} onImport={()=>nav('/workout/import')} onEdit={()=>nav(`/workout/import?plan=${plan.id}`)}/>
          </>
        ))}

        {tab === 'Exercises' && (() => {
          const muscles=['All',...new Set(exercises.map(x=>x.primaryMuscle).filter(Boolean))], equipmentOptions=['All',...new Set(exercises.map(x=>x.equipment).filter(Boolean))];
          const filtered=exercises.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())&&(muscle==='All'||x.primaryMuscle===muscle)&&(equipment==='All'||x.equipment===equipment));
          return <><div className="relative"><Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search exercises" className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3"/></div><div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1"><SlidersHorizontal className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground"/>{muscles.map(x=><button key={x} onClick={()=>setMuscle(x)} className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-bold ${muscle===x?'bg-primary text-primary-foreground':'bg-secondary text-muted-foreground'}`}>{x}</button>)}</div><div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-2">{equipmentOptions.map(x=><button key={x} onClick={()=>setEquipment(x)} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-bold ${equipment===x?'border-primary text-primary':'border-border text-muted-foreground'}`}>{x}</button>)}</div>{filtered.length?filtered.map(x=><button key={x.id} onClick={()=>setDetail(x)} className="mt-2 flex min-h-16 w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left"><div><b className="text-sm">{x.name}</b><p className="mt-1 text-xs text-muted-foreground">{x.primaryMuscle} · {x.equipment}{x.repMin?` · ${x.repMin}–${x.repMax} reps`:''}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></button>):<ScreenState title="No exercises found" description="Try another muscle, equipment filter, or search term."/>}<ExerciseDetails exercise={detail} open={Boolean(detail)} onOpenChange={o=>!o&&setDetail(null)}/></>;
        })()}

        {tab === 'History' && (history.length ? history.map(x => (
          <button key={x.id} onClick={()=>nav(`/workout/history/${x.id}`)} className="mt-3 w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary">
            <div className="flex justify-between">
              <b>{x.name}</b>
              <span className="text-xs tabular-nums text-zinc-500">{format(new Date(`${x.date}T12:00:00`), 'MMM d').toUpperCase()}</span>
            </div>
            <p className="mt-1 text-sm tabular-nums text-zinc-500">
              {x.durationMinutes ? `${x.durationMinutes} min · ` : ''}{x.setCount ? `${x.setCount} sets · ` : ''}{Math.round(x.totalVolume || 0).toLocaleString()} lb{x.prCount ? ` · ${x.prCount} PR${x.prCount > 1 ? 's' : ''}` : ''}
            </p>
          </button>
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