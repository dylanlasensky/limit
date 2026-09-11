import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { draftKey, readDraft, initialRows } from '@/components/workout/workoutDraft';
import useWorkoutRows from '@/components/workout/useWorkoutRows';

export default function useLiveWorkout(workoutDayId) {
  const {user}=useAuth(),client=useQueryClient(),key=user?.id?draftKey(user.id,workoutDayId):null;
  const [state,setState]=useState({loading:true,day:null,workoutExercises:[],exercisesById:{},previousByExercise:{},session:null,error:null}),[attempt,retry]=useState(0);
  const rowState=useWorkoutRows(state,key);
  useEffect(()=>{if(!key)return;let cancelled=false;
    (async()=>{const draft=readDraft(key);try{
      setState(s=>({...s,loading:true,error:null}));
      const [day,templates,exercises,profiles]=await Promise.all([base44.entities.WorkoutDay.get(workoutDayId),base44.entities.WorkoutExercise.filter({workoutDayId}),base44.entities.Exercise.list(null,500),base44.entities.UserProfile.list()]);
      const plan=await base44.entities.WorkoutPlan.get(day.planId);
      const {data}=await base44.functions.invoke('workoutCommand',{action:'start',workoutDayId,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
      const session=data.session;
      if(data.redirectWorkoutDayId&&data.redirectWorkoutDayId!==workoutDayId){window.location.replace(`/live-workout/${data.redirectWorkoutDayId}`);return}
      if(session.status==='completed'){window.location.replace(`/workout/history/${session.id}`);return}
      const [savedSets,completedSessions]=await Promise.all([base44.entities.ExerciseSet.filter({workoutSessionId:session.id}),base44.entities.WorkoutSession.filter({status:'completed'},'-completedAt',30)]);
      const recentSets=completedSessions.length?await base44.entities.ExerciseSet.filter({workoutSessionId:{$in:completedSessions.map(s=>s.id)},completed:true},'-timestamp',1000):[];
      const exercisesById=Object.fromEntries(exercises.map(e=>[e.id,e]));
      const workoutExercises=templates.sort((a,b)=>a.order-b.order).map(we=>{const saved=savedSets.find(s=>s.workoutExerciseId===we.id);const local=draft?.session?.id===session.id?draft.workoutExercises?.find(e=>e.id===we.id):null;return local|| (saved?{...we,exerciseId:saved.exerciseId,exerciseName:saved.exerciseName}:we)});
      const previousByExercise={};workoutExercises.forEach(we=>{const previous=completedSessions.find(s=>s.id!==session.id&&recentSets.some(r=>r.workoutSessionId===s.id&&r.exerciseName===we.exerciseName));previousByExercise[we.exerciseName]=recentSets.filter(r=>r.workoutSessionId===previous?.id&&r.exerciseName===we.exerciseName).sort((a,b)=>a.setNumber-b.setNumber)});
      if(cancelled)return;
      rowState.setRows(initialRows(workoutExercises,exercisesById,savedSets,draft?.session?.id===session.id?draft.rows:[]));
      setState({loading:false,day,plan,workoutExercises,exercisesById,allExercises:exercises,profile:profiles[0]||{},previousByExercise,session,error:null});
    }catch(e){if(cancelled)return;if(draft?.session?.status==='active'){rowState.setRows(draft.rows);setState({...draft,loading:false,error:null,offline:true})}else setState(s=>({...s,loading:false,error:e?.response?.data?.error||'Couldn’t load this workout.'}))}})();
    return()=>{cancelled=true};
  },[key,workoutDayId,attempt]);
  const invalidateAll=()=>['activePlan','workoutHistory','activeSession','todaySession','muscleRatingData','progressRatingData','workoutExercises','personalRecords','workoutDetail'].forEach(k=>client.invalidateQueries({queryKey:[k]}));
  const replaceExercise=(we,exercise)=>{setState(s=>({...s,workoutExercises:s.workoutExercises.map(x=>x.id===we.id?{...x,exerciseId:exercise.id,exerciseName:exercise.name}:x)}));rowState.setRows(rs=>rs.map(r=>r.workoutExerciseId===we.id?{...r,exerciseId:exercise.id,exerciseName:exercise.name,primaryMuscle:exercise.primaryMuscle,weight:'',reps:'',completed:false}:r))};
  const skipExercise=we=>setState(s=>({...s,workoutExercises:s.workoutExercises.map(x=>x.id===we.id?{...x,skipped:!x.skipped}:x)}));
  const addAccessory=async exercise=>{const template=await base44.entities.WorkoutExercise.create({workoutDayId,exerciseId:exercise.id,exerciseName:exercise.name,primaryMuscle:exercise.primaryMuscle,category:exercise.category,equipment:exercise.equipment,order:state.workoutExercises.length+1,sets:3,repMin:exercise.repMin||10,repMax:exercise.repMax||15,restSeconds:75,notes:'Optional LIMIT accessory',matchConfidence:100,coachMandated:false});setState(s=>({...s,workoutExercises:[...s.workoutExercises,template],exercisesById:{...s.exercisesById,[exercise.id]:exercise}}));rowState.setRows(rows=>[...rows,...initialRows([template],{...state.exercisesById,[exercise.id]:exercise},[],[])]);return template};
  useEffect(()=>{if(key&&state.session)rowState.setRows(rs=>rs)},[state.workoutExercises]);
  return {...state,...rowState,replaceExercise,skipExercise,addAccessory,retry:()=>retry(n=>n+1),clearDraft:()=>key&&localStorage.removeItem(key),invalidateAll};
}