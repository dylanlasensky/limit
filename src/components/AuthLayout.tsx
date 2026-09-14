import React from "react";

interface AuthLayoutProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="mb-8 text-2xl font-black italic tracking-[.24em]">
            LIMIT<span className="text-primary">.</span>
          </p>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="limit-surface rounded-3xl p-6 sm:p-8">{children}</div>
        {footer && <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>}
      </div>
    </main>
  );
}
