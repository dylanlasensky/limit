import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// The single source of truth for the active program.
// Defensive: if multiple plans are active, prefer the newest and deactivate the rest (history untouched).
export default function useActivePlan() {
  return useQuery({
    queryKey: ['activePlan'],
    staleTime: 60000,
    queryFn: async () => {
      const active = await base44.entities.WorkoutPlan.filter({ active: true }, '-created_date');
      const plan = active[0] || null;
      if (active.length > 1) await Promise.all(active.slice(1).map(p => base44.entities.WorkoutPlan.update(p.id, { active: false })));
      if (!plan) return { plan: null, days: [] };
      const days = (await base44.entities.WorkoutDay.filter({ planId: plan.id })).sort((a, b) => a.weekday - b.weekday);
      // one day per weekday within the active plan
      const seen = new Set();
      const unique = days.filter(d => !seen.has(d.weekday) && seen.add(d.weekday));
      return { plan, days: unique };
    }
  });
}

export const todayWeekday = () => (new Date().getDay() + 6) % 7;