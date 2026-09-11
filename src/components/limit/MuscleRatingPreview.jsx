import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Sparkles} from 'lucide-react';
import BodyMap from '@/components/limit/BodyMap';
export default function MuscleRatingPreview({rating}){
  const high=Object.values(rating.muscles).filter(x=>['Advanced','Elite'].includes(x.level)).length;
  return <Link to="/progress" className="limit-hero group mt-8 block rounded-[2rem] p-5 active:scale-[.985]">
    <div className="relative z-10 grid grid-cols-[1fr_120px] items-center"><div className="min-w-0"><p className="limit-kicker flex items-center gap-2"><Sparkles className="h-3.5 w-3.5"/>Muscle rating</p><h2 className="mt-3 text-3xl font-black uppercase italic tracking-[-.04em]">{rating.overallLevel}</h2><p className="mt-1 max-w-[13rem] text-sm leading-relaxed text-muted-foreground">{rating.hasData?`${high} muscle groups are breaking into advanced territory.`:'Train, log, evolve. Your strength map is calibrating.'}</p><span className="mt-5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.18em] text-primary">Open profile <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></span></div><div className="limit-grid relative h-44 overflow-hidden rounded-2xl border border-border/50 bg-background/50"><div className="absolute -left-1 top-1"><BodyMap rating={rating} view="front" compact/></div><div className="absolute left-11 top-1 opacity-60"><BodyMap rating={rating} view="back" compact/></div></div></div>
  </Link>;
}