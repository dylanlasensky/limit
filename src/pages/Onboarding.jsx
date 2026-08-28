import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSystemTheme from '@/hooks/use-system-theme';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { calcTargets } from '@/components/limit/nutritionTargets';
import { scoreProgramStructures } from '@/lib/training/programEngine';
import { createPersonalizedPlan } from '@/lib/training/planService';
import OnboardingGoal from '@/components/onboarding/OnboardingGoal';
import OnboardingPersonal from '@/components/limit/OnboardingPersonal';
import OnboardingTraining from '@/components/limit/OnboardingTraining';
import OnboardingSchedule from '@/components/onboarding/OnboardingSchedule';
import OnboardingPriorities from '@/components/onboarding/OnboardingPriorities';
import OnboardingDiet from '@/components/limit/OnboardingDiet';
import OnboardingReveal from '@/components/onboarding/OnboardingReveal';

const steps = [
  ['Your goal', 'What are you training for?', OnboardingGoal, d => !!d.fitnessGoal],
  ['Your body', 'Let’s meet you', OnboardingPersonal, d => d.name && d.heightFeet && d.weightLb],
  ['Your training', 'How you train', OnboardingTraining, d => d.experienceLevel && d.sessionLength],
  ['Your schedule', 'When can you train?', OnboardingSchedule, d => (d.availableDays?.length || 0) >= 2],
  ['Your priorities', 'Anything to emphasize?', OnboardingPriorities, () => true],
  ['Your food', 'Food that fits', OnboardingDiet, () => true],
  ['Your plan', 'Built for you', OnboardingReveal, () => true]
];

export default function Onboarding() {
  const dark = useSystemTheme(), [step, setStep] = useState(0), [saving, setSaving] = useState(false), [error, setError] = useState(false);
  const [data, setData] = useState({ units: 'imperial', sex: 'female', activityLevel: 'moderate', sessionLength: 60, equipment: ['Full commercial gym'], allergies: [], dietaryPreferences: [], availableDays: [], priorityMuscles: [] });
  const nav = useNavigate(), set = (k, v) => setData(x => ({ ...x, [k]: v }));
  const [label, title, View, valid] = steps[step];
  const canContinue = valid(data);

  const finish = async () => {
    setSaving(true); setError(false);
    try {
      const days = data.availableDays.length;
      const targets = calcTargets({ ...data, days });
      const rec = scoreProgramStructures(data).best;
      const profile = {
        name: data.name, birthDate: data.birthDate, sex: data.sex,
        heightCm: (data.heightFeet * 12 + (+data.heightInches || 0)) * 2.54,
        heightFeet: +data.heightFeet, heightInches: +data.heightInches || 0,
        currentWeight: +data.weightLb, goalWeight: +data.goalWeightLb || +data.weightLb,
        activityLevel: data.activityLevel, fitnessGoal: data.fitnessGoal,
        experienceLevel: data.experienceLevel, sessionLength: +data.sessionLength,
        trainingDays: data.availableDays, availableDays: data.availableDays,
        priorityMuscles: data.priorityMuscles, equipment: data.equipment,
        workoutSplit: rec.name, units: 'imperial', measurementSystemVersion: 'us_v1',
        targetsCustomized: false, onboardingComplete: true, ...targets
      };
      await base44.entities.UserProfile.create(profile);
      await base44.entities.DietaryProfile.create({
        allergies: data.allergies, intolerances: [],
        foodsToAvoid: (data.avoidText || '').split(',').map(x => x.trim()).filter(Boolean),
        dietaryPreferences: data.dietaryPreferences, cookingSkill: 'beginner',
        maxCookingTime: 'Under 30 minutes', budgetFriendly: true, mealPrepPreference: true
      });
      await createPersonalizedPlan({ ...profile, days }, rec);
      nav('/home');
    } catch (e) {
      setSaving(false); setError(true);
    }
  };

  return (
    <main className={`${dark ? 'dark' : ''} mx-auto min-h-screen max-w-md overflow-hidden bg-background px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))] text-foreground`}>
      <b className="text-xl tracking-[.2em]">LIMIT</b>
      <div className="mt-6 flex gap-1.5">
        {steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-800'}`} />)}
      </div>
      <div className="my-7">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{label}</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -22, opacity: 0 }} transition={{ duration: .2, ease: 'easeOut' }}>
          <View data={data} set={set} />
        </motion.div>
      </AnimatePresence>
      {error && <p className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">Something went wrong building your plan. Try again.</p>}
      <button disabled={saving || !canContinue} onClick={() => step < steps.length - 1 ? setStep(step + 1) : finish()}
        className="mt-8 h-14 w-full rounded-2xl bg-zinc-950 font-bold text-white transition-opacity disabled:opacity-40 dark:bg-blue-600">
        {saving ? 'Building your LIMIT plan…' : step < steps.length - 1 ? 'Continue' : 'START MY LIMIT PLAN'}
      </button>
      {step > 0 && !saving && <button onClick={() => setStep(step - 1)} className="mt-2 h-12 w-full text-sm font-semibold text-muted-foreground">Back</button>}
    </main>
  );
}