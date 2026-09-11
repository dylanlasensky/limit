import React,{Fragment,useId} from 'react';
import {BODY_VIEW_BOX,detailLines,headPath,regions,silhouette} from '@/components/limit/athleticBodyArtwork';

const tiers={
  Beginner:{color:'#359b78',deep:'#183d34',edge:'#78bca5',glow:.12},
  Intermediate:{color:'#4778c7',deep:'#192b50',edge:'#8eafe4',glow:.16},
  Advanced:{color:'#8067b8',deep:'#342850',edge:'#ad9bd3',glow:.18},
  Elite:{color:'#438fa5',deep:'#183b46',edge:'#8ec3d0',glow:.2}
};
const neutral={color:'#59616e',deep:'#292e37',edge:'#838b97',glow:0};

export default function BodyMap({rating,view='front',compact=false,selected,onSelect}){
  const uid=useId().replace(/:/g,''),body=`body-${uid}`,clip=`clip-${uid}`,glow=`glow-${uid}`;
  const stateFor=muscle=>rating?.hasData?(tiers[rating?.muscles?.[muscle]?.level]||tiers.Beginner):neutral;
  return <svg viewBox={BODY_VIEW_BOX} preserveAspectRatio="xMidYMid meet" className={compact?'h-40 w-16':'mx-auto h-[430px] w-60 max-w-full'} aria-label={`${view} muscle rating chart`}>
    <defs>
      <linearGradient id={body} x1="0" y1="0" x2="1" y2="1"><stop stopColor="hsl(var(--muted-foreground))" stopOpacity=".28"/><stop offset=".5" stopColor="hsl(var(--secondary))" stopOpacity=".72"/><stop offset="1" stopColor="hsl(var(--muted-foreground))" stopOpacity=".18"/></linearGradient>
      <clipPath id={clip}><path d={silhouette[view]}/></clipPath>
      <filter id={glow} x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation={compact?'1.2':'2.2'}/></filter>
      {regions[view].map(([muscle,,path],index)=>{const state=stateFor(muscle);return <linearGradient key={index} id={`muscle-${uid}-${index}`} x1="0" y1="0" x2="0.8" y2="1"><stop stopColor={state.edge}/><stop offset=".35" stopColor={state.color}/><stop offset="1" stopColor={state.deep}/></linearGradient>})}
    </defs>
    <path d={headPath} fill={`url(#${body})`} stroke="hsl(var(--foreground))" strokeOpacity=".1" strokeWidth=".45"/>
    <path d={silhouette[view]} fill={`url(#${body})`} fillOpacity=".76"/>
    <g clipPath={`url(#${clip})`}>
      {regions[view].map(([muscle,label,path],index)=>{const state=stateFor(muscle),active=selected===muscle,opacity=active ? .96 : (rating?.hasData ? .68 : .38);return <Fragment key={`${label}-${index}`}>
        {active&&<path d={path} fill={state.color} opacity={state.glow} filter={`url(#${glow})`} pointerEvents="none"/>}
        <path d={path} fill={`url(#muscle-${uid}-${index})`} fillOpacity={opacity} stroke={state.edge} strokeOpacity={active ? .8 : .28} strokeWidth={active?1.05:.48} vectorEffect="non-scaling-stroke" role="button" tabIndex="0" aria-label={`${label}: ${rating?.muscles?.[muscle]?.level||'Calibrating'}`} onClick={()=>onSelect?.(muscle)} onKeyDown={event=>['Enter',' '].includes(event.key)&&onSelect?.(muscle)} className="cursor-pointer transition-opacity duration-200"/>
      </Fragment>})}
      <path d={detailLines[view]} fill="none" stroke="hsl(var(--foreground))" strokeOpacity=".22" strokeWidth=".6" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    </g>
    <path d={silhouette[view]} fill="none" stroke="hsl(var(--foreground))" strokeOpacity=".09" strokeWidth=".5" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    <path d="M90 50Q100 56 110 50M93 25Q100 21 107 25M96 38Q100 41 104 38" fill="none" stroke="hsl(var(--foreground))" strokeOpacity=".1" strokeWidth=".5" pointerEvents="none"/>
  </svg>;
}