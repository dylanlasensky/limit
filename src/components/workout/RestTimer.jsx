import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function RestTimer({ endsAt, onAdjust, onSkip }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 500); return () => clearInterval(t); }, []);
  const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  useEffect(() => { if (remaining === 0) { const t = setTimeout(onSkip, 1200); return () => clearTimeout(t); } }, [remaining === 0]);
  const mm = Math.floor(remaining / 60), ss = String(remaining % 60).padStart(2, '0');
  return (
    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-blue-900/50 bg-[#0C0C12]/95 px-5 pb-[max(.9rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-500">Rest</p>
          <p className="font-mono text-2xl font-black tabular-nums">{mm}:{ss}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onAdjust(-15)} className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-bold">−15</button>
          <button onClick={() => onAdjust(15)} className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-bold">+15</button>
          <button onClick={onSkip} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">SKIP</button>
        </div>
      </div>
    </motion.div>
  );
}