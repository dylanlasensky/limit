import LimitLogo from "@/components/limit/LimitLogo";
import React from "react";

export default class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-foreground">
        <section role="alert" className="limit-surface w-full rounded-3xl p-6">
          <LimitLogo size="sm" />
          <h1 className="mt-4 text-2xl font-bold">Let’s get you back.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This screen couldn’t open. Reload to try again. Reloading does not delete saved workouts
            or device drafts.
          </p>
          <button
            className="limit-button mt-6 min-h-12 w-full rounded-xl font-bold"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
          <a href="/home" className="mt-2 grid min-h-12 place-items-center text-sm font-semibold">
            Back to Home
          </a>
        </section>
      </main>
    );
  }
}
