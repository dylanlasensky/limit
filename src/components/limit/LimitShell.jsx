import React from 'react';
import {Outlet,useLocation} from 'react-router-dom';
import {AnimatePresence,motion} from 'framer-motion';
import BottomNav from '@/components/limit/BottomNav';
import CoachButton from '@/components/limit/CoachButton';
import useSystemTheme from '@/hooks/use-system-theme';
export default function LimitShell(){const dark=useSystemTheme(),location=useLocation();return <div className={`${dark?'dark':''} min-h-screen bg-background text-foreground`}><main className="mx-auto min-h-screen max-w-md overflow-x-hidden px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]"><AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} initial={{x:24,opacity:0}} animate={{x:0,opacity:1}} exit={{x:-18,opacity:0}} transition={{duration:.2,ease:'easeOut'}}><Outlet/></motion.div></AnimatePresence></main><CoachButton/><BottomNav/></div>}