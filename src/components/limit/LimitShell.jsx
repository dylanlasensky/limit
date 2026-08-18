import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '@/components/limit/BottomNav';
import CoachButton from '@/components/limit/CoachButton';
export default function LimitShell(){return <div className="min-h-screen bg-[#f5f6f4] dark:bg-[#0d0f0e] text-zinc-950 dark:text-zinc-50"><main className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]"><Outlet/></main><CoachButton/><BottomNav/></div>}