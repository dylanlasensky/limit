import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
export default function SectionHeading({ label, title, to, action = 'View all' }) {
  return <header className="mb-4 mt-8 flex items-end justify-between gap-3"><div>{label && <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">{label}</p>}<h2 className="font-heading text-xl font-bold tracking-tight">{title}</h2></div>{to && <Link to={to} className="flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">{action}<ArrowUpRight className="h-3.5 w-3.5"/></Link>}</header>;
}