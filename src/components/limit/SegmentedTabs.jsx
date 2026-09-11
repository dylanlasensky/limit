import React from 'react';
export default function SegmentedTabs({ options, value, onChange, label = 'View' }) {
  return <div role="tablist" aria-label={label} className="my-5 flex rounded-2xl border border-border bg-card p-1">{options.map(option => <button key={option} role="tab" aria-selected={value===option} onClick={()=>onChange(option)} className={`min-h-11 min-w-0 flex-1 rounded-xl px-2 text-xs font-bold transition-colors ${value===option?'bg-secondary text-foreground shadow-sm':'text-muted-foreground'}`}>{option}</button>)}</div>;
}