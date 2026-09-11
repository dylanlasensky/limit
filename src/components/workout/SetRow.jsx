import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SetRow({ row, previous, onEdit, onToggle, saving }) {
  const done = row.completed;
  return (
    <div className="mt-2 grid grid-cols-[20px_54px_minmax(0,1fr)_minmax(0,1fr)_36px_40px] items-center gap-2">
      <span className="text-center text-sm font-bold text-zinc-500">{row.setNumber}</span>
      <span className="text-center text-xs tabular-nums text-zinc-600">{previous ? `${previous.weight}×${previous.reps}` : '—'}</span>
      <input aria-label={`Set ${row.setNumber} weight in pounds`} min="0" max="2500" disabled={saving} type="number" inputMode="decimal" value={row.weight} placeholder={previous ? String(previous.weight) : 'lb'}
        onChange={e => onEdit('weight', e.target.value)}
        className={`h-12 min-w-0 w-full rounded-xl text-center font-bold tabular-nums ${done ? 'bg-blue-950/40 text-blue-200' : 'bg-zinc-800'}`} />
      <input aria-label={`Set ${row.setNumber} repetitions`} min="1" max="100" disabled={saving} type="number" inputMode="numeric" value={row.reps} placeholder={previous ? String(previous.reps) : 'reps'}
        onChange={e => onEdit('reps', e.target.value)}
        className={`h-12 min-w-0 w-full rounded-xl text-center font-bold tabular-nums ${done ? 'bg-blue-950/40 text-blue-200' : 'bg-zinc-800'}`} />
      <input aria-label={`Set ${row.setNumber} reps in reserve, optional`} disabled={saving} type="number" inputMode="numeric" value={row.rir ?? ''} placeholder="RIR" min="0" max="9"
        onChange={e => onEdit('rir', e.target.value)}
        className={`h-12 min-w-0 w-full rounded-xl text-center text-sm tabular-nums ${done ? 'bg-blue-950/40 text-blue-200' : 'bg-zinc-800'}`} />
      <motion.button whileTap={{ scale: .88 }} disabled={saving} onClick={onToggle} aria-label={done ? 'Uncheck set' : 'Complete set'}
        className={`grid h-12 place-items-center rounded-xl transition-colors ${done ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
        {saving?<Loader2 className="h-4 w-4 animate-spin"/>:done?<Check className="h-5 w-5"/>:<span className="h-4 w-4 rounded-full border border-current"/>}
      </motion.button>
    </div>
  );
}