import LimitLogo from "@/components/limit/LimitLogo";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PageNotFound() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center">
        <LimitLogo size="lg" />
        <p className="text-sm font-medium tracking-widest text-muted-foreground">PAGE NOT FOUND</p>
        <h1 className="text-3xl font-semibold tracking-tight">Let’s get you back on track.</h1>
        <p className="text-muted-foreground">
          This page may have moved, or the link may be out of date. Your training is still waiting.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to LIMIT
          </Link>
          <Link
            to="/support"
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 py-3 text-sm font-medium"
          >
            Help & support
          </Link>
        </div>
      </div>
    </main>
  );
}
