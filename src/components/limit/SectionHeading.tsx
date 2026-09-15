import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
interface SectionHeadingProps {
  label?: React.ReactNode;
  title: React.ReactNode;
  to?: string;
  action?: React.ReactNode;
}
export default function SectionHeading({
  label,
  title,
  to,
  action = "View all",
}: SectionHeadingProps) {
  return (
    <header className="mb-4 mt-9 flex items-end justify-between gap-3">
      <div>
        {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
        <h2 className="font-heading text-xl font-semibold tracking-[-.025em]">{title}</h2>
      </div>
      {to && (
        <Link
          to={to}
          className="flex min-h-11 items-center gap-1 text-xs font-semibold text-primary"
        >
          {action}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </header>
  );
}
