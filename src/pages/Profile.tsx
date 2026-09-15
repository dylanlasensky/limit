import React, { useEffect, useRef, useState } from "react";
import { Cable, Dumbbell, Palette, ShieldCheck, UserRound, Utensils } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
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
import ConnectedHealthPanel from "@/components/health/ConnectedHealthPanel";
import ProfileSettingsSection from "@/components/limit/ProfileSettingsSection";
const sectionIds = ["appearance", "connections", "basics", "training", "nutrition", "account"];
const sectionLabels: Record<string, string> = {
  appearance: "Appearance",
  connections: "Connected health",
  basics: "About you",
  training: "Training",
  nutrition: "Nutrition",
  account: "Account",
};
const nutritionInputs = [
  "birthDate",
  "sex",
  "heightFeet",
  "heightInches",
  "currentWeight",
  "goalWeight",
  "activityLevel",
  "fitnessGoal",
];
const sectionFromHash = (hash: string) => {
  const value = hash.slice(1);
  return sectionIds.includes(value) ? value : "appearance";
};
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
  const location = useLocation();
  const { user, logout } = useAuth(),
    [p, setP] = useState<any>(),
    [d, setD] = useState<any>(),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [dirty, setDirty] = useState(false),
    [foodsToAvoidText, setFoodsToAvoidText] = useState(""),
    [saving, setSaving] = useState(false),
    [rebuilding, setRebuilding] = useState(false),
    [message, setMessage] = useState(""),
    [profileChanged, setProfileChanged] = useState(false),
    [activeSection, setActiveSection] = useState(() => sectionFromHash(location.hash)),
    saveInFlight = useRef(false),
    client = useQueryClient();
  const settingsReady = Boolean(p && d);
  useEffect(() => {
    setActiveSection(sectionFromHash(location.hash));
  }, [location.hash]);
  useEffect(() => {
    if (!settingsReady || !location.hash) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionFromHash(location.hash))?.scrollIntoView?.({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [settingsReady, location.hash]);
  useEffect(() => {
    const openLinkedSection = () => setActiveSection(sectionFromHash(window.location.hash));
    window.addEventListener("hashchange", openLinkedSection);
    return () => window.removeEventListener("hashchange", openLinkedSection);
  }, []);
  useEffect(() => {
    Promise.all([base44.entities.UserProfile.list(), base44.entities.DietaryProfile.list()])
      .then(([a, b]) => {
        setP(toUSProfile(a[0] || {}));
        setD(b[0] || {});
        setFoodsToAvoidText((b[0]?.foodsToAvoid || []).join(", "));
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
      if (nutritionInputs.some((key) => next[key] !== p[key])) setProfileChanged(true);
      setDirty(true);
      setSaved(false);
      setMessage("");
    },
    changeDiet = (next: any) => {
      setD(next);
      setDirty(true);
      setSaved(false);
      setMessage("");
    },
    toggle = (x: string) =>
      changeDiet({
        ...d,
        allergies: d.allergies?.includes(x)
          ? d.allergies.filter((a: string) => a !== x)
          : [...(d.allergies || []), x],
      });
  const save = async () => {
    if (saveInFlight.current) return null;
    saveInFlight.current = true;
    setSaving(true);
    setSaved(false);
    setError("");
    setMessage("");
    let profilePersisted = false;
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
      const profileResult = await (p.id
        ? base44.entities.UserProfile.update(p.id, payload)
        : base44.entities.UserProfile.create(payload));
      const savedProfile = { ...p, ...payload, ...profileResult };
      setP(savedProfile);
      profilePersisted = true;
      void client.invalidateQueries({ queryKey: ["userProfile"] });
      const dietResult = await (d.id
        ? base44.entities.DietaryProfile.update(d.id, d)
        : base44.entities.DietaryProfile.create(d));
      setD({ ...d, ...dietResult });
      setSaved(true);
      setDirty(false);
      for (const key of ["userProfile", "dietaryProfile", "progressData", "muscleRatingData"]) {
        void client.invalidateQueries({ queryKey: [key] });
      }
      return savedProfile;
    } catch (e: any) {
      setDirty(true);
      setError(
        profilePersisted
          ? "Your profile was saved. Food preferences are still unsaved. Try again to finish saving."
          : e?.response
            ? "Couldn’t save these changes. Try again."
            : e.message || "Couldn’t save these changes. Try again."
      );
      return null;
    } finally {
      saveInFlight.current = false;
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
          days: savedProfile.availableDays?.length || savedProfile.trainingDays?.length || 3,
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
  const section = (id: string) => ({
    id,
    open: activeSection === id,
    onToggle: () => setActiveSection((current) => (current === id ? "" : id)),
  });
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-start lg:gap-x-8">
      <div className="lg:sticky lg:top-6">
        <header className="px-1 pb-1 pt-3">
          <div className="relative z-10">
            <p className="limit-kicker">Made for you</p>
            <h1 className="limit-page-title">Profile</h1>
            <p className="mt-2 break-words text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </header>
        <p className="mt-4 px-1 text-sm text-muted-foreground">
          Open a section to make it yours. Your edits stay here as you switch sections.
        </p>
        <nav aria-label="Profile sections" className="mt-6 hidden space-y-1 lg:block">
          {sectionIds.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setActiveSection(id)}
              aria-current={activeSection === id ? "location" : undefined}
              className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors ${activeSection === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              {sectionLabels[id]}
            </a>
          ))}
        </nav>
      </div>
      <div className={`mt-4 min-w-0 space-y-3 lg:mt-3 ${dirty || saving ? "mb-28 lg:mb-8" : ""}`}>
        <ProfileSettingsSection
          {...section("appearance")}
          title="Appearance"
          description="Light, dark or match your device"
          icon={Palette}
        >
          <AppPreferences />
        </ProfileSettingsSection>
        <ProfileSettingsSection
          {...section("connections")}
          title="Connected health"
          description="Optional watches, rings and smart scales"
          icon={Cable}
        >
          <div className="mt-4">
            <ConnectedHealthPanel compact />
          </div>
        </ProfileSettingsSection>
        <ProfileSettingsSection
          {...section("basics")}
          title="About you"
          description="Your body, goals and weekly schedule"
          icon={UserRound}
        >
          <fieldset disabled={saving || rebuilding} className="min-w-0">
            <ProfileBasics profile={p} onChange={change} />
          </fieldset>
        </ProfileSettingsSection>
        <ProfileSettingsSection
          {...section("training")}
          title="Training"
          description="Experience, equipment and your program"
          icon={Dumbbell}
        >
          <fieldset disabled={saving || rebuilding} className="min-w-0">
            <TrainingPreferences profile={p} onChange={change} />
          </fieldset>
          <section className="limit-surface mt-4 rounded-3xl p-5">
            <h3 className="font-semibold">Apply changes to your program</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Save your preferences anytime. When you want a new program, rebuild it using your
              goal, schedule and equipment. Your workout history stays with you.
            </p>
            <button
              onClick={rebuild}
              disabled={rebuilding || saving}
              className="mt-4 min-h-12 w-full rounded-xl border border-primary px-3 py-2 font-semibold text-primary disabled:opacity-40"
            >
              {rebuilding ? "Rebuilding…" : "Rebuild my program"}
            </button>
          </section>
        </ProfileSettingsSection>
        <ProfileSettingsSection
          {...section("nutrition")}
          title="Nutrition"
          description="Daily targets, food preferences and allergies"
          icon={Utensils}
        >
          <fieldset disabled={saving || rebuilding} className="min-w-0">
            <NutritionTargetsEditor
              profile={p}
              profileChanged={profileChanged}
              onTargetsChange={(k: string, v: any) => {
                setP((x: any) => ({ ...x, [k]: v, targetsCustomized: true }));
                setDirty(true);
                setSaved(false);
                setMessage("");
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
                setDirty(true);
                setSaved(false);
                setMessage("");
              }}
            />
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
                value={foodsToAvoidText}
                onChange={(e) => {
                  setFoodsToAvoidText(e.target.value);
                  changeDiet({
                    ...d,
                    foodsToAvoid: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  });
                }}
                placeholder="Other foods to avoid"
                aria-label="Other foods to avoid, separated by commas"
                className="mt-3 min-h-20 w-full rounded-xl border border-border bg-transparent p-3"
              />
              <NativeSelect
                value={d.maxCookingTime || "Under 30 minutes"}
                onChange={(v: string) => changeDiet({ ...d, maxCookingTime: v })}
                options={[
                  "Under 15 minutes",
                  "Under 30 minutes",
                  "Under 60 minutes",
                  "No preference",
                ]}
                label="Cooking time"
                className="mt-3"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Always verify labels and cross-contact details for serious allergies.
              </p>
            </section>
          </fieldset>
        </ProfileSettingsSection>
        <ProfileSettingsSection
          {...section("account")}
          title="Account"
          description="Password, privacy and your data"
          icon={ShieldCheck}
        >
          <div className="mt-4 space-y-3">
            <button
              onClick={reset}
              className="h-12 w-full rounded-xl bg-secondary text-sm font-semibold"
            >
              Change password
            </button>
            <AccountDataExport />
            <AccountDeletion />
            <button
              onClick={() => logout()}
              className="h-12 w-full rounded-xl bg-secondary text-sm font-semibold"
            >
              Sign out
            </button>
            <PublicLinks />
          </div>
        </ProfileSettingsSection>
      </div>
      <div
        className={`mt-5 rounded-2xl border border-border bg-card p-3 shadow-lg lg:col-start-2 ${dirty || saving ? "sticky bottom-24 z-30 mr-16 lg:bottom-6" : ""}`}
      >
        {(error || message) && (
          <p
            role={error ? "alert" : "status"}
            className={`mb-3 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
          >
            {error || message}
          </p>
        )}
        <div className="flex items-center gap-3">
          <p
            role="status"
            aria-live="polite"
            className={`flex-1 text-xs leading-relaxed text-muted-foreground ${dirty || saving ? "sr-only sm:not-sr-only" : ""}`}
          >
            {saving
              ? "Saving your settings…"
              : dirty
                ? "You have unsaved changes."
                : saved
                  ? "All changes saved."
                  : "Your settings are up to date."}
          </p>
          <button
            onClick={save}
            disabled={saving || rebuilding || !dirty}
            className={`min-h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 ${dirty || saving ? "w-full sm:w-auto" : ""}`}
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
