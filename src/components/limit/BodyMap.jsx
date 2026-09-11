import React from 'react';

const tier = {
  Beginner: { fill: 'fill-emerald-500', edge: 'stroke-emerald-200', glow: 'drop-shadow-[0_0_5px_rgba(16,185,129,.35)]' },
  Intermediate: { fill: 'fill-blue-600', edge: 'stroke-blue-200', glow: 'drop-shadow-[0_0_8px_rgba(37,99,235,.55)]' },
  Advanced: { fill: 'fill-violet-500', edge: 'stroke-violet-200', glow: 'drop-shadow-[0_0_10px_rgba(139,92,246,.65)]' },
  Elite: { fill: 'fill-zinc-950', edge: 'stroke-cyan-300', glow: 'drop-shadow-[0_0_14px_rgba(103,232,249,.85)]' }
};
const regions = {
  front: [['Shoulders','M39 58 22 69 27 91 43 81 47 65Zm42 0 17 11-5 22-16-10-4-16Z'],['Chest','M45 62Q60 52 60 78 45 84 42 70Zm15 16Q60 52 75 62l3 8Q75 84 60 78Z'],['Biceps','M27 91 42 81l-4 46-14-4Zm66 0-15-10 4 46 14-4Z'],['Core','M45 82q15 7 30 0l-2 66q-13 10-26 0Z'],['Quads','M46 151l13 5-3 65-18-5Zm15 5 13-5 8 65-18 5Z'],['Calves','M39 220l17 4-4 54-14-3Zm25 4 17-4 1 55-14 3Z']],
  back: [['Shoulders','M39 58 22 69l5 22 16-10 4-16Zm42 0 17 11-5 22-16-10-4-16Z'],['Back','M44 62q16 15 32 0l-3 78q-13 11-26 0Z'],['Triceps','M27 92 42 81l-4 46-14-4Zm66 0-15-11 4 46 14-4Z'],['Glutes','M46 142q14 10 28 0l3 25q-17 13-34 0Z'],['Hamstrings','M43 169l16 7-3 46-18-6Zm18 7 16-7 5 47-18 6Z'],['Calves','M39 220l17 4-4 54-14-3Zm25 4 17-4 1 55-14 3Z']]
};
export default function BodyMap({ rating, view='front', compact=false, selected, onSelect }) {
  return <svg viewBox="0 0 120 292" className={compact?'h-40 w-24':'mx-auto h-[390px] w-48 max-w-full'} aria-label={`${view} muscle rating map`}>
    <defs><radialGradient id={`aura-${view}`}><stop stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient><linearGradient id={`body-${view}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="hsl(var(--secondary))"/><stop offset="1" stopColor="hsl(var(--background))"/></linearGradient></defs>
    <ellipse className="limit-aura text-primary" cx="60" cy="153" rx="55" ry="138" fill={`url(#aura-${view})`}/>
    <circle cx="60" cy="28" r="17" fill={`url(#body-${view})`} stroke="hsl(var(--border))" strokeWidth="1.2"/><path d="M42 48q18-6 36 0l13 17 10 61-13 5-10-40-1 57 7 72-4 60H67l-7-58-7 58H40l-4-60 7-72-1-57-10 40-13-5 10-61Z" fill={`url(#body-${view})`} stroke="hsl(var(--border))" strokeWidth="1.5"/>
    <path d="M60 49v170" stroke="hsl(var(--foreground))" strokeOpacity=".08" strokeDasharray="2 5"/>
    {regions[view].map(([muscle,path])=>{const level=rating?.muscles?.[muscle]?.level||'Beginner', active=selected===muscle, style=tier[level]||tier.Beginner;return <path key={muscle} d={path} role="button" tabIndex="0" aria-label={`${muscle}: ${level}`} onClick={()=>onSelect?.(muscle)} onKeyDown={e=>['Enter',' '].includes(e.key)&&onSelect?.(muscle)} className={`cursor-pointer transition-all duration-300 ${style.fill} ${style.edge} ${style.glow} ${active?'opacity-100 stroke-[2.5]':'opacity-75 stroke-[1.2] hover:opacity-100'}`}/>})}
  </svg>;
}