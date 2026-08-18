import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from '@/components/limit/BottomNav';
import CoachButton from '@/components/limit/CoachButton';
export default function LimitShell(){return <div className="dark min-h-screen bg-[#09090B] text-[#F8FAFC]"><main className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]"><Outlet/></main><CoachButton/><BottomNav/></div>}