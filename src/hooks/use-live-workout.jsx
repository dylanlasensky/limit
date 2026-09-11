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
      const [day,templates,exercises]=await Promise.all([base44.entities.WorkoutDay.get(workoutDayId),base44.entities.WorkoutExercise.filter({workoutDayId}),base44.entities.Exercise.list(null,500)]);
      const {data}=await base44.functions.invoke('workoutCommand',{action:'start',workoutDayId,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
      const session=data.session;
      const [savedSets,completedSessions]=await Promise.all([base44.entities.ExerciseSet.filter({workoutSessionId:session.id}),base44.entities.WorkoutSession.filter({status:'completed'},'-completedAt',30)]);
      const recentSets=completedSessions.length?await base44.entities.ExerciseSet.filter({workoutSessionId:{$in:completedSessions.map(s=>s.id)},completed:true},'-timestamp',1000):[];
      const exercisesById=Object.fromEntries(exercises.map(e=>[e.id,e]));
      const workoutExercises=templates.sort((a,b)=>a.order-b.order).map(we=>{const saved=savedSets.find(s=>s.workoutExerciseId===we.id);const local=draft?.session?.id===session.id?draft.workoutExercises?.find(e=>e.id===we.id):null;return local|| (saved?{...we,exerciseId:saved.exerciseId,exerciseName:saved.exerciseName}:we)});
      const previousByExercise={};workoutExercises.forEach(we=>{const previous=completedSessions.find(s=>s.id!==session.id&&recentSets.some(r=>r.workoutSessionId===s.id&&r.exerciseName===we.exerciseName));previousByExercise[we.exerciseName]=recentSets.filter(r=>r.workoutSessionId===previous?.id&&r.exerciseName===we.exerciseName).sort((a,b)=>a.setNumber-b.setNumber)});
      if(cancelled)return;
      rowState.setRows(initialRows(workoutExercises,exercisesById,savedSets,draft?.session?.id===session.id?draft.rows:[]));
      setState({loading:false,day,workoutExercises,exercisesById,previousByExercise,session,error:null});
    }catch(e){if(cancelled)return;if(draft?.session?.status==='active'){rowState.setRows(draft.rows);setState({...draft,loading:false,error:null,offline:true})}else setState(s=>({...s,loading:false,error:e?.response?.data?.error||'Couldn’t load this workout.'}))}})();
    return()=>{cancelled=true};
  },[key,workoutDayId,attempt]);
  const invalidateAll=()=>['activePlan','workoutHistory','activeSession','todaySession','muscleRatingData','progressRatingData','workoutExercises','personalRecords','workoutDetail'].forEach(k=>client.invalidateQueries({queryKey:[k]}));
  const replaceExercise=(we,exercise)=>{setState(s=>({...s,workoutExercises:s.workoutExercises.map(x=>x.id===we.id?{...x,exerciseId:exercise.id,exerciseName:exercise.name}:x)}));rowState.setRows(rs=>rs.map(r=>r.workoutExerciseId===we.id?{...r,exerciseId:exercise.id,exerciseName:exercise.name,primaryMuscle:exercise.primaryMuscle,weight:'',reps:'',completed:false}:r))};
  const skipExercise=we=>setState(s=>({...s,workoutExercises:s.workoutExercises.map(x=>x.id===we.id?{...x,skipped:!x.skipped}:x)}));
  useEffect(()=>{if(key&&state.session)rowState.setRows(rs=>rs)},[state.workoutExercises]);
  return {...state,...rowState,replaceExercise,skipExercise,retry:()=>retry(n=>n+1),clearDraft:()=>key&&localStorage.removeItem(key),invalidateAll};
}