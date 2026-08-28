// Deterministic personalized program engine. Scores program structures against the user. No AI.
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const exerciseBudget = len => ({ 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 }[+len] || 6);

export const goalKey = g => {
  g = (g || '').toLowerCase();
  if (g.includes('strength') && g.includes('muscle')) return 'muscle_strength';
  if (g.includes('stronger') || g.includes('strength')) return 'strength';
  if (g.includes('muscle') || g.includes('gain')) return 'muscle';
  if (g.includes('fat') || g.includes('lose')) return 'fat_loss';
  return 'general';
};

export const PRIORITY_MAP = { Chest: ['Chest'], Back: ['Lats', 'Upper back'], Shoulders: ['Side delts', 'Front delts'], Arms: ['Biceps', 'Triceps'], Quads: ['Quads'], Hamstrings: ['Hamstrings'], Glutes: ['Glutes'], Calves: ['Calves'], Core: ['Abs/core'] };

// Sets / reps / rest per slot role, shaped by goal + experience.
export const scheme = (goal, role, experience) => {
  const base = experience === 'beginner' ? (role === 'iso' ? 2 : 3) : experience === 'advanced' && (role === 'main' || role === 'main_strength') ? 4 : 3;
  if (role === 'main_strength') return { sets: experience === 'beginner' ? 3 : 4, repMin: 3, repMax: 6, rest: 210 };
  if (goal === 'strength') return role === 'main' ? { sets: base, repMin: 4, repMax: 6, rest: 180 } : role === 'secondary' ? { sets: base, repMin: 6, repMax: 8, rest: 150 } : { sets: base, repMin: 8, repMax: 12, rest: 90 };
  if (goal === 'muscle_strength' && role === 'main') return { sets: base, repMin: 4, repMax: 8, rest: 180 };
  return role === 'main' ? { sets: base, repMin: 6, repMax: 10, rest: 150 } : role === 'secondary' ? { sets: base, repMin: 8, repMax: 12, rest: 120 } : { sets: base, repMin: 10, repMax: 15, rest: 75 };
};

const S = (muscles, role, type) => ({ muscles, role, type });
const FOCUS = {
  full: [S(['Quads'], 'main', 'Compound'), S(['Chest'], 'main', 'Compound'), S(['Lats', 'Upper back'], 'main'), S(['Hamstrings', 'Glutes'], 'secondary', 'Compound'), S(['Front delts', 'Side delts'], 'secondary'), S(['Biceps', 'Triceps'], 'iso', 'Isolation'), S(['Abs/core'], 'iso')],
  upper: [S(['Chest'], 'main', 'Compound'), S(['Upper back', 'Lats'], 'main'), S(['Front delts'], 'secondary'), S(['Lats', 'Upper back'], 'secondary'), S(['Side delts'], 'iso', 'Isolation'), S(['Triceps'], 'iso', 'Isolation'), S(['Biceps'], 'iso', 'Isolation')],
  lower: [S(['Quads'], 'main', 'Compound'), S(['Hamstrings'], 'main', 'Compound'), S(['Glutes'], 'secondary', 'Compound'), S(['Quads'], 'secondary'), S(['Hamstrings'], 'iso', 'Isolation'), S(['Calves'], 'iso', 'Isolation'), S(['Abs/core'], 'iso')],
  push: [S(['Chest'], 'main', 'Compound'), S(['Front delts'], 'secondary'), S(['Chest'], 'secondary'), S(['Side delts'], 'iso', 'Isolation'), S(['Triceps'], 'iso', 'Isolation'), S(['Abs/core'], 'iso')],
  pull: [S(['Lats'], 'main'), S(['Upper back'], 'main'), S(['Lats', 'Upper back'], 'secondary'), S(['Biceps'], 'iso', 'Isolation'), S(['Abs/core'], 'iso')],
  arms_shoulders: [S(['Front delts'], 'main'), S(['Side delts'], 'iso', 'Isolation'), S(['Triceps'], 'iso', 'Isolation'), S(['Biceps'], 'iso', 'Isolation'), S(['Chest'], 'secondary'), S(['Abs/core'], 'iso')],
  squat: [S(['Quads'], 'main_strength', 'Compound'), S(['Quads'], 'secondary'), S(['Hamstrings'], 'secondary', 'Compound'), S(['Calves'], 'iso'), S(['Abs/core'], 'iso')],
  bench: [S(['Chest'], 'main_strength', 'Compound'), S(['Chest'], 'secondary'), S(['Front delts'], 'secondary'), S(['Triceps'], 'iso', 'Isolation'), S(['Side delts'], 'iso')],
  deadlift: [S(['Hamstrings'], 'main_strength', 'Compound'), S(['Lats'], 'main'), S(['Upper back'], 'secondary'), S(['Glutes'], 'secondary', 'Compound'), S(['Biceps'], 'iso')],
  upper_assist: [S(['Front delts'], 'main'), S(['Upper back'], 'secondary'), S(['Side delts'], 'iso'), S(['Triceps'], 'iso'), S(['Biceps'], 'iso'), S(['Abs/core'], 'iso')]
};

export const focusFor = name => {
  const n = (name || '').toLowerCase();
  if (n.includes('full body')) return 'full';
  if (n.includes('squat')) return 'squat';
  if (n.includes('bench')) return 'bench';
  if (n.includes('deadlift')) return 'deadlift';
  if (n.includes('assist')) return 'upper_assist';
  if (n.includes('shoulder') || n.includes('arm')) return 'arms_shoulders';
  if (n.includes('push')) return 'push';
  if (n.includes('pull')) return 'pull';
  if (n.includes('upper')) return 'upper';
  if (n.includes('lower') || n.includes('leg')) return 'lower';
  return 'full';
};

export const slotsFor = (dayName, profile) => {
  const focus = focusFor(dayName);
  let slots = [...FOCUS[focus]];
  if (dayName.toLowerCase().includes('strength') && focus !== 'squat' && focus !== 'bench' && focus !== 'deadlift') slots = slots.map((s, i) => (i === 0 ? { ...s, role: 'main_strength' } : s));
  (profile.priorityMuscles || []).forEach(p => {
    const muscles = PRIORITY_MAP[p] || [];
    if (!muscles.length) return;
    const covering = slots.filter(s => s.muscles.some(m => muscles.includes(m)));
    if (covering.length && covering.length < 3 && ['upper', 'lower', 'full', 'push', 'pull', 'arms_shoulders'].includes(focus)) slots.push(S(muscles, 'iso', 'Isolation'));
  });
  return slots;
};

export const targetMusclesFor = dayName => ({
  full: ['Chest', 'Back', 'Shoulders', 'Legs'], upper: ['Chest', 'Back', 'Shoulders', 'Arms'], lower: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  push: ['Chest', 'Shoulders', 'Triceps'], pull: ['Back', 'Biceps'], arms_shoulders: ['Shoulders', 'Arms'],
  squat: ['Quads', 'Core'], bench: ['Chest', 'Triceps'], deadlift: ['Hamstrings', 'Back'], upper_assist: ['Shoulders', 'Back', 'Arms']
}[focusFor(dayName)] || []);

const whyFor = (key, { goal, exp, days, prios }) => {
  const goalText = { muscle: 'build muscle', strength: 'get stronger', muscle_strength: 'build muscle and strength together', fat_loss: 'lose fat while keeping muscle', general: 'improve overall fitness' }[goal];
  const prioText = prios?.length ? ` Your priority areas (${prios.join(', ')}) get extra direct work.` : '';
  return {
    full_body: `You want to ${goalText} training ${days} days a week. Full body sessions hit every major muscle multiple times per week with manageable volume — the most effective structure for your schedule${exp === 'beginner' ? ' and a great foundation to learn the key movements' : ''}.${prioText}`,
    upper_lower: `You want to ${goalText} on ${days} days. Upper / Lower trains every muscle twice a week with enough volume per session to drive real progress.${prioText}`,
    ppl: `Push / Pull / Legs splits your ${days} days by movement type, giving each session a clear focus with solid recovery between them.${prioText}`,
    ppl2: `Running Push / Pull / Legs twice across ${days} days trains every muscle twice weekly with high, focused volume — a strong fit for your experience level.${prioText}`,
    upper_lower_spec: `Upper / Lower covers everything twice a week, and your fifth day adds targeted volume where you want it most — without requiring six sessions.${prioText}`,
    powerbuilding: `You want strength and size. Heavy strength days build your big lifts; hypertrophy days add the volume that drives muscle growth.${prioText}`,
    strength_focus: `You want to get stronger. Each session is built around one main lift with focused practice, lower reps, and longer rests.${prioText}`
  }[key];
};

export const scoreProgramStructures = profile => {
  const days = Math.min(6, Math.max(2, +profile.days || profile.availableDays?.length || 3));
  const goal = goalKey(profile.fitnessGoal), exp = profile.experienceLevel || 'beginner', len = +profile.sessionLength || 60, prios = profile.priorityMuscles || [];
  const specLabel = prios.includes('Shoulders') || prios.includes('Arms') ? 'Shoulders + Arms' : prios.some(p => ['Glutes', 'Quads', 'Hamstrings', 'Calves'].includes(p)) ? 'Lower Focus' : 'Upper Focus';
  const c = [];
  if (days <= 4) c.push({ key: 'full_body', name: 'Full Body', dayNames: ['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D'].slice(0, days), score: 58 + (exp === 'beginner' ? 24 : exp === 'intermediate' ? 4 : -6) + (days <= 3 ? 14 : -4) + (len <= 45 ? 8 : 0) + (goal === 'fat_loss' || goal === 'general' ? 10 : 0) });
  if (days === 4) c.push({ key: 'upper_lower', name: 'Upper / Lower', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B'], score: 62 + 14 + (exp !== 'beginner' ? 10 : 0) + (goal === 'muscle' || goal === 'muscle_strength' ? 8 : 0) });
  if (days === 3 && exp !== 'beginner') c.push({ key: 'ppl', name: 'Push / Pull / Legs', dayNames: ['Push', 'Pull', 'Legs'], score: 60 + (goal === 'muscle' ? 8 : 0) });
  if (days === 6) c.push({ key: 'ppl2', name: 'Push / Pull / Legs ×2', dayNames: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'], score: 64 + (exp === 'advanced' ? 14 : exp === 'intermediate' ? 8 : -20) + (goal === 'muscle' ? 10 : 0) });
  if (days === 6) c.push({ key: 'upper_lower', name: 'Upper / Lower ×3', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C', 'Lower C'], score: 60 + (exp === 'beginner' ? 10 : 0) });
  if (days === 5) c.push({ key: 'upper_lower_spec', name: `Upper / Lower + ${specLabel}`, dayNames: ['Upper A', 'Lower A', specLabel, 'Upper B', 'Lower B'], score: 66 + (prios.length ? 14 : 4) + (exp !== 'beginner' ? 8 : 0) + (goal === 'muscle' ? 8 : 0) });
  if (days === 4 && goal === 'muscle_strength') c.push({ key: 'powerbuilding', name: 'Powerbuilding', dayNames: ['Upper Strength', 'Lower Strength', 'Upper Hypertrophy', 'Lower Hypertrophy'], score: 84 + (exp !== 'beginner' ? 6 : -16) });
  if (goal === 'strength' && days >= 3 && days <= 4) c.push({ key: 'strength_focus', name: 'Strength Focus', dayNames: days === 4 ? ['Squat Focus', 'Bench Focus', 'Deadlift & Pull', 'Upper Assistance'] : ['Squat Focus', 'Bench Focus', 'Deadlift & Pull'], score: 82 + (exp === 'beginner' ? -14 : 6) });
  const options = c.filter(x => x.dayNames.length === days).sort((a, b) => b.score - a.score)
    .map(x => ({ ...x, why: whyFor(x.key, { goal, exp, days, prios }) }));
  return { best: options[0], options };
};