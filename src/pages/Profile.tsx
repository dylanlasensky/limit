import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { profilePayload } from "@/lib/profile-payload";
import { ageFromBirthDate, bodyInputErrors } from "@/lib/profile-inputs";
import { calcTargets, toUSProfile } from "@/components/limit/nutritionTargets";
import { createPersonalizedPlan } from "@/lib/training/planService";
import { scoreProgramStructures } from "@/lib/training/programEngine";
import ProfileBasics from "@/components/limit/ProfileBasics";
import TrainingPreferences from "@/components/limit/TrainingPreferences";
import NutritionTargetsEditor from "@/components/limit/NutritionTargetsEditor";
import AppPreferences from "@/components/limit/AppPreferences";
import AccountDeletion from "@/components/limit/AccountDeletion";
import AccountDataExport from "@/components/limit/AccountDataExport";
import PublicLinks from "@/components/limit/PublicLinks";
import NativeSelect from "@/components/limit/NativeSelect";
import ScreenState from "@/components/limit/ScreenState";
const allergens = [
  "Eggs",
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Fish",
  "Milk/dairy",
  "Soy",
  "Wheat/gluten",
  "Sesame",
];
export default function Profile() {
  const { user, logout } = useAuth(),
    [p, setP] = useState<any>(),
    [d, setD] = useState<any>(),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [saving, setSaving] = useState(false),
    [rebuilding, setRebuilding] = useState(false),
    [message, setMessage] = useState(""),
    [profileChanged, setProfileChanged] = useState(false),
    client = useQueryClient();
  useEffect(() => {
    Promise.all([base44.entities.UserProfile.list(), base44.entities.DietaryProfile.list()])
      .then(([a, b]) => {
        setP(toUSProfile(a[0] || {}));
        setD(b[0] || {});
      })
      .catch(() => setError("Couldn’t load your settings."));
  }, []);
  if (error && !p)
    return (
      <ScreenState
        title="Couldn’t load Profile"
        description="Your settings are safe."
        onAction={() => window.location.reload()}
      />
    );
  if (!p || !d) return <ScreenState loading />;
  const change = (next: any) => {
      setP(next);
      setProfileChanged(true);
      setSaved(false);
    },
    changeDiet = (next: any) => {
      setD(next);
      setSaved(false);
    },
    toggle = (x: string) =>
      changeDiet({
        ...d,
        allergies: d.allergies?.includes(x)
          ? d.allergies.filter((a: string) => a !== x)
          : [...(d.allergies || []), x],
      });
  const save = async () => {
    if (saving) return null;
    setSaving(true);
    setError("");
    try {
      const age = ageFromBirthDate(p.birthDate);
      const safeTargets =
        p.targetsCustomized !== true && (age === null || age < 18) ? calcTargets(p) : {};
      const payload = profilePayload({
        ...p,
        ...safeTargets,
        heightCm: (+p.heightFeet * 12 + (+p.heightInches || 0)) * 2.54,
        units: "imperial",
        measurementSystemVersion: "us_v1",
      });
      // Persist returned IDs immediately, even if saving dietary preferences
      // fails later. Retrying must update the same records, not create copies.
      const savedProfile = await (p.id
        ? base44.entities.UserProfile.update(p.id, payload)
        : base44.entities.UserProfile.create(payload));
      setP(savedProfile);
      const savedDiet = await (d.id
        ? base44.entities.DietaryProfile.update(d.id, d)
        : base44.entities.DietaryProfile.create(d));
      setD(savedDiet);
      setSaved(true);
      for (const key of ["userProfile", "dietaryProfile", "progressData", "muscleRatingData"]) {
        void client.invalidateQueries({ queryKey: [key] });
      }
      return savedProfile;
    } catch (e: any) {
      setError(
        e?.response
          ? "Couldn’t save these changes. Try again."
          : e.message || "Couldn’t save these changes. Try again."
      );
      return null;
    } finally {
      setSaving(false);
    }
  };
  const rebuild = async () => {
    if (rebuilding || saving) return;
    setRebuilding(true);
    setMessage("");
    try {
      const savedProfile = await save();
      if (!savedProfile) return;
      const input = {
          ...savedProfile,
          days: savedProfile.trainingDays?.length || 3,
          availableDays: savedProfile.availableDays?.length
            ? savedProfile.availableDays
            : savedProfile.trainingDays,
        },
        rec = scoreProgramStructures(input).best;
      await createPersonalizedPlan(input, rec);
      ["activePlan", "workoutExercises", "todaySession"].forEach((k) =>
        client.invalidateQueries({ queryKey: [k] })
      );
      setMessage(`New plan: ${rec.name}. History preserved.`);
    } catch (e: any) {
      setMessage(
        e?.response?.data?.error || e.message || "Could not rebuild your program. Try again."
      );
    } finally {
      setRebuilding(false);
    }
  };
  const reset = async () => {
    try {
      await base44.auth.resetPasswordRequest(user!.email);
      setMessage("Password reset instructions sent if this email is eligible.");
    } catch {
      setError("Couldn’t request a reset. Please try again.");
    }
  };
  return (
    <div>
      <header className="px-1 pb-1 pt-3">
        <div className="relative z-10">
          <p className="limit-kicker">Made for you</p>
          <h1 className="limit-page-title">Profile</h1>
          <p className="mt-2 break-words text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </header>
      <nav
        aria-label="Profile sections"
        className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1"
      >
        {[
          ["appearance", "Appearance"],
          ["basics", "About you"],
          ["training", "Training"],
          ["nutrition", "Nutrition"],
          ["account", "Account"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex min-h-10 shrink-0 items-center rounded-full border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>
      <div id="appearance" className="scroll-mt-24">
        <AppPreferences />
      </div>
      <fieldset disabled={saving || rebuilding} className="min-w-0">
        <div id="basics" className="scroll-mt-24">
          <ProfileBasics profile={p} onChange={change} />
        </div>
        <div id="training" className="scroll-mt-24">
          <TrainingPreferences profile={p} onChange={change} />
        </div>
        <div id="nutrition" className="scroll-mt-24">
          <NutritionTargetsEditor
            profile={p}
            profileChanged={profileChanged}
            onTargetsChange={(k: string, v: any) => {
              setP((x: any) => ({ ...x, [k]: v, targetsCustomized: true }));
              setSaved(false);
            }}
            onRecalculate={() => {
              const errors = bodyInputErrors(p);
              if (Object.keys(errors).length) {
                setError(Object.values(errors)[0]);
                return;
              }
              setError("");
              setP((x: any) => ({ ...x, ...calcTargets(x), targetsCustomized: false }));
              setProfileChanged(false);
              setSaved(false);
            }}
          />
        </div>
        <section className="limit-surface mt-4 rounded-3xl p-5">
          <p className="limit-kicker text-muted-foreground">Food safety</p>
          <h2 className="mt-2 font-semibold">Allergies & foods to avoid</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {allergens.map((x) => (
              <button
                key={x}
                onClick={() => toggle(x)}
                aria-pressed={d.allergies?.includes(x) || false}
                className={`min-h-10 rounded-full border px-3 text-xs font-bold ${d.allergies?.includes(x) ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground"}`}
              >
                {x}
              </button>
            ))}
          </div>
          <textarea
            value={(d.foodsToAvoid || []).join(", ")}
            onChange={(e) =>
              changeDiet({
                ...d,
                foodsToAvoid: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Other foods to avoid"
            aria-label="Other foods to avoid, separated by commas"
            className="mt-3 min-h-20 w-full rounded-xl border border-border bg-transparent p-3"
          />
          <NativeSelect
            value={d.maxCookingTime || "Under 30 minutes"}
            onChange={(v: string) => changeDiet({ ...d, maxCookingTime: v })}
            options={["Under 15 minutes", "Under 30 minutes", "Under 60 minutes", "No preference"]}
            label="Cooking time"
            className="mt-3"
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Always verify labels and cross-contact details for serious allergies.
          </p>
        </section>
      </fieldset>
      <section className="limit-surface mt-4 rounded-3xl p-5">
        <p className="limit-kicker text-muted-foreground">Training program</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Rebuild after changing your goal, schedule, experience, duration, or equipment. Past
          workouts stay in History. Your current settings are saved before rebuilding.
        </p>
        <button
          onClick={rebuild}
          disabled={rebuilding || saving}
          className="mt-4 h-12 w-full rounded-xl border border-primary font-bold text-primary disabled:opacity-40"
        >
          {rebuilding ? "Rebuilding…" : "Rebuild my program"}
        </button>
      </section>
      {(error || message) && (
        <p
          role={error ? "alert" : "status"}
          className="mt-4 rounded-xl border border-border bg-secondary p-3 text-sm"
        >
          {error || message}
        </p>
      )}
      <button
        onClick={save}
        disabled={saving || rebuilding}
        className="mt-5 h-14 w-full rounded-2xl bg-primary font-bold text-primary-foreground"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
      </button>
      <section id="account" className="mt-6 scroll-mt-24 border-t border-border pt-6">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Account
        </p>
        <button onClick={reset} className="h-12 w-full rounded-xl bg-secondary text-sm font-bold">
          Change password
        </button>
        <button
          onClick={() => logout()}
          className="mt-2 h-12 w-full rounded-xl bg-secondary text-sm font-bold"
        >
          Sign out
        </button>
        <div className="mt-2">
          <AccountDataExport />
        </div>
        <div className="mt-2">
          <AccountDeletion />
        </div>
        <div className="mt-4">
          <PublicLinks />
        </div>
      </section>
    </div>
  );
}
