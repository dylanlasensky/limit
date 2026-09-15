import LimitLogo from "@/components/limit/LimitLogo";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ExerciseLibrary from "@/components/workout/ExerciseLibrary";
import PublicLinks from "@/components/limit/PublicLinks";

export default function PublicExercises() {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 pb-10 md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link
          to="/login"
          className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          <LimitLogo size="sm" />
        </Link>
        <Link
          to="/register"
          className="grid min-h-11 place-items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Create account
        </Link>
      </header>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Explore the exercise library</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        No account needed to browse. Sign in to build a program and save workouts.
      </p>
      <ExerciseLibrary
        exercises={[]}
        loading={false}
        error={false}
        onRetry={() => {}}
        userId="public-reference"
        referenceMode
      />
      <PublicLinks />
    </main>
  );
}
