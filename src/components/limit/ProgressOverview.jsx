import React from 'react';
import { Dumbbell, CalendarCheck2, Trophy, TrendingUp } from 'lucide-react';
export default function ProgressOverview({ sessions, records, sets }) {
  const totalVolume=sessions.reduce((a,s)=>a+(s.totalVolume||0),0),weeks=new Set(sessions.map(s=>s.date?.slice(0,7))).size;
  const items=[[Dumbbell,Math.round(totalVolume).toLocaleString(),'LB VOLUME'],[CalendarCheck2,sessions.length,'WORKOUTS'],[Trophy,records.length,'PERSONAL RECORDS'],[TrendingUp,weeks||0,'ACTIVE MONTHS']];
  return <div className="grid grid-cols-2 gap-3">{items.map(([Icon,value,label])=><div key={label} className="rounded-2xl border border-border bg-card p-4"><Icon className="h-4 w-4 text-primary"/><p className="mt-4 text-2xl font-black tabular-nums">{value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">{label}</p></div>)}</div>;
}