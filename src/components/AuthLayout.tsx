import LimitLogo from "@/components/limit/LimitLogo";
import React from "react";
import { Link } from "react-router-dom";
import PublicLinks from "@/components/limit/PublicLinks";

interface AuthLayoutProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <LimitLogo size="lg" className="mb-8" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="limit-surface rounded-3xl p-6 sm:p-8">{children}</div>
        {footer && <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>}
        <Link
          to="/exercises"
          className="mt-3 grid min-h-11 place-items-center text-sm font-semibold text-primary"
        >
          Explore exercises without an account
        </Link>
        <PublicLinks />
      </div>
    </main>
  );
}
