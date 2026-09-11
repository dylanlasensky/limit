import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try{
    const base44=createClientFromRequest(req),user=await base44.auth.me();
    if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const input=await req.json(),question=typeof input?.question==='string'?input.question.trim():'';
    if(!question||question.length>1000)return Response.json({error:'Ask a question under 1,000 characters.'},{status:400});
    const now=new Date(),date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const [profiles,plans,foods,sessions,records,snapshots,weights,diets]=await Promise.all([
      base44.entities.UserProfile.list(),base44.entities.WorkoutPlan.filter({active:true},'-created_date',1),base44.entities.FoodEntry.filter({date}),base44.entities.WorkoutSession.filter({status:'completed'},'-date',5),base44.entities.PersonalRecord.list('-date',8),base44.entities.MuscleRatingSnapshot.list('-date',1),base44.entities.WeightEntry.list('-date',8),base44.entities.DietaryProfile.list()
    ]);
    const profile=profiles[0]||{},plan=plans[0],snapshot=snapshots[0],diet=diets[0]||{},days=plan?await base44.entities.WorkoutDay.filter({planId:plan.id}):[],todayDay=days.find(day=>day.weekday===(now.getDay()+6)%7);
    const macros=foods.reduce((sum,food)=>({calories:sum.calories+(food.calories||0),protein:sum.protein+(food.protein||0),carbs:sum.carbs+(food.carbs||0),fat:sum.fat+(food.fat||0)}),{calories:0,protein:0,carbs:0,fat:0});
    const context={profile:{goal:profile.fitnessGoal,experience:profile.experienceLevel,weightLb:profile.currentWeight,goalWeightLb:profile.goalWeight},program:plan?{name:plan.name,daysPerWeek:plan.daysPerWeek,week:days.map(day=>`${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day.weekday]}: ${day.name}`)}:null,today:todayDay?{workout:todayDay.isRest?'Rest':todayDay.name}:null,recentWorkouts:sessions.map(session=>({name:session.name,date:session.date,minutes:session.durationMinutes,sets:session.setCount,volumeLb:session.totalVolume,prs:session.prCount})),recentPRs:records.map(record=>({exercise:record.exerciseName,type:record.type,value:record.value,date:record.date})),muscleRating:snapshot?{overall:`${snapshot.overallLevel} ${snapshot.overallScore}`,muscles:snapshot.muscleScores}:null,nutritionToday:{eaten:macros,targets:{calories:profile.calorieTarget,protein:profile.proteinTarget,carbs:profile.carbTarget,fat:profile.fatTarget}},weightTrendLb:weights.map(weight=>`${weight.date}: ${weight.unit==='kg'?Math.round(weight.weight*2.20462):weight.weight}`),restrictions:{allergies:diet.allergies||[],preferences:diet.dietaryPreferences||[]}};
    const answer=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt:`You are LIMIT Coach, the in-app coach for a fitness tracking app. Be concise (under 120 words), supportive, direct, and non-medical. Ground every claim in the user data below. If the data does not cover the question, say it is not logged yet. Never invent workouts, foods, or numbers.\n\nUSER DATA:\n${JSON.stringify(context)}\n\nQUESTION: ${question}`});
    return Response.json({answer});
  }catch(error){return Response.json({error:error.message||'Coach unavailable.'},{status:500});}
}