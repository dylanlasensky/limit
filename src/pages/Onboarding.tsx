import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSystemTheme from "@/hooks/use-system-theme";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { calcTargets } from "@/components/limit/nutritionTargets";
import { scoreProgramStructures } from "@/lib/training/programEngine";
import { createPersonalizedPlan } from "@/lib/training/planService";
import OnboardingGoal from "@/components/onboarding/OnboardingGoal";
import OnboardingPersonal from "@/components/limit/OnboardingPersonal";
import OnboardingTraining from "@/components/limit/OnboardingTraining";
import OnboardingSchedule from "@/components/onboarding/OnboardingSchedule";
import OnboardingPriorities from "@/components/onboarding/OnboardingPriorities";
import OnboardingDiet from "@/components/limit/OnboardingDiet";
import OnboardingReveal from "@/components/onboarding/OnboardingReveal";
import { bodyInputErrors } from "@/lib/profile-inputs";
import { profilePayload } from "@/lib/profile-payload";

export interface OnboardingData {
  units: string;
  sex: string;
  activityLevel: string;
  sessionLength: number | string;
  equipment: string[];
  allergies: string[];
  dietaryPreferences: string[];
  availableDays: string[];
  priorityMuscles: string[];
  name?: string;
  birthDate?: string;
  heightFeet?: number | string;
  heightInches?: number | string;
  weightLb?: number | string;
  goalWeightLb?: number | string;
  fitnessGoal?: string;
  experienceLevel?: string;
  avoidText?: string;
  importAfterOnboarding?: boolean;
  [key: string]: any;
}

type StepView = React.ComponentType<any>;
type StepValidator = (d: OnboardingData) => unknown;
type Step = [string, string, StepView, StepValidator];

const steps: Step[] = [
  ["Your goal", "What are you training for?", OnboardingGoal, (d) => !!d.fitnessGoal],
  [
    "Your body",
    "Let’s meet you",
    OnboardingPersonal,
    (d) => !Object.keys(bodyInputErrors(d)).length,
  ],
  [
    "Your training",
    "How you train",
    OnboardingTraining,
    (d) => d.experienceLevel && d.sessionLength && d.equipment.length > 0,
  ],
  [
    "Your schedule",
    "When can you train?",
    OnboardingSchedule,
    (d) => (d.availableDays?.length || 0) >= 2,
  ],
  ["Your priorities", "Anything to emphasize?", OnboardingPriorities, () => true],
  ["Your food", "Food that fits", OnboardingDiet, () => true],
  ["Your plan", "Built for you", OnboardingReveal, () => true],
];

export default function Onboarding() {
  const dark = useSystemTheme(),
    [step, setStep] = useState(0),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const finishing = useRef(false);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);
  const [data, setData] = useState<OnboardingData>({
    units: "imperial",
    sex: "female",
    activityLevel: "moderate",
    sessionLength: 60,
    equipment: ["Full commercial gym"],
    allergies: [],
    dietaryPreferences: [],
    availableDays: [],
    priorityMuscles: [],
  });
  const nav = useNavigate(),
    set = (k: string, v: any) => setData((x) => ({ ...x, [k]: v }));
  const [label, title, View, valid] = steps[step];
  const canContinue = valid(data);

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setSaving(true);
    setError("");
    try {
      const days = data.availableDays.length;
      const targets = calcTargets({ ...data, days });
      const rec = scoreProgramStructures(data).best;
      const profile = profilePayload({
        name: data.name,
        birthDate: data.birthDate,
        sex: data.sex,
        heightCm: (+data.heightFeet! * 12 + (+data.heightInches! || 0)) * 2.54,
        heightFeet: +data.heightFeet!,
        heightInches: +data.heightInches! || 0,
        currentWeight: +data.weightLb!,
        goalWeight: +data.goalWeightLb! || +data.weightLb!,
        activityLevel: data.activityLevel,
        fitnessGoal: data.fitnessGoal,
        experienceLevel: data.experienceLevel,
        sessionLength: +data.sessionLength,
        trainingDays: data.availableDays,
        availableDays: data.availableDays,
        priorityMuscles: data.priorityMuscles,
        equipment: data.equipment,
        workoutSplit: rec.name,
        units: "imperial",
        measurementSystemVersion: "us_v1",
        targetsCustomized: false,
        onboardingComplete: false,
        ...targets,
      });
      const [profiles, diets] = await Promise.all([
        base44.entities.UserProfile.list(),
        base44.entities.DietaryProfile.list(),
      ]);
      const savedProfile = profiles[0]
        ? await base44.entities.UserProfile.update(profiles[0].id, profile)
        : await base44.entities.UserProfile.create(profile);
      const diet = {
        allergies: data.allergies,
        intolerances: [],
        foodsToAvoid: (data.avoidText || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        dietaryPreferences: data.dietaryPreferences,
        cookingSkill: "beginner",
        maxCookingTime: "Under 30 minutes",
        budgetFriendly: true,
        mealPrepPreference: true,
      };
      if (diets[0]) await base44.entities.DietaryProfile.update(diets[0].id, diet);
      else await base44.entities.DietaryProfile.create(diet);
      // A retry may follow edits to exact weekdays, equipment, or experience.
      // Rebuild from all current answers, not just a matching plan name/day count.
      // The plan service validates an inactive replacement before activation,
      // so the current working program stays available if generation fails.
      if (!data.importAfterOnboarding) await createPersonalizedPlan({ ...profile, days }, rec);
      await base44.entities.UserProfile.update(savedProfile.id, { onboardingComplete: true });
      nav(data.importAfterOnboarding ? "/workout/import" : "/home", { replace: true });
    } catch (e: any) {
      setSaving(false);
      setError(
        e?.response
          ? "Something went wrong building your plan. Try again."
          : e.message || "Something went wrong building your plan. Try again."
      );
    } finally {
      finishing.current = false;
    }
  };

  return (
    <main
      className={`${dark ? "dark" : ""} limit-grid relative mx-auto min-h-screen max-w-md overflow-hidden bg-background px-5 pb-8 md:max-w-3xl md:px-8 lg:max-w-5xl lg:px-10 pt-[max(2rem,env(safe-area-inset-top))] text-foreground`}
    >
      <div className="flex items-center justify-between">
        <b className="text-xl font-black italic tracking-[.24em]">LIMIT</b>
        <span className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-[10px] font-black tabular-nums text-muted-foreground">
          {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-6 flex gap-1.5">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: i <= step ? 1 : 0.25 }}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/.7)]" : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="lg:mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-start lg:gap-12">
        <div className="my-7 lg:sticky lg:top-10 lg:my-0">
          <p className="limit-kicker">{label}</p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="mt-3 text-4xl font-bold leading-tight tracking-[-.035em] outline-none"
          >
            {title}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Your answers shape your training frequency, exercise selection, session length, and
            starting nutrition targets.
          </p>
        </div>
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ x: 28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -22, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <View data={data} set={set} />
            </motion.div>
          </AnimatePresence>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground"
            >
              {error}
            </p>
          )}
          <button
            disabled={saving || !canContinue}
            onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
            className={`mt-8 h-14 w-full rounded-2xl font-black tracking-wide transition-all ${canContinue && !saving ? "limit-button" : "bg-secondary text-muted-foreground"}`}
          >
            {saving
              ? "Building your LIMIT plan…"
              : step < steps.length - 1
                ? "Continue"
                : "START MY LIMIT PLAN"}
          </button>
          {step > 0 && !saving && (
            <button
              aria-label="Back to previous step"
              onClick={() => setStep(step - 1)}
              className="mt-2 h-12 w-full text-sm font-semibold text-muted-foreground"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
