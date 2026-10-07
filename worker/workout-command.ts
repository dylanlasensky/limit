import { workoutCommandSchema } from "../packages/contracts/workout";
import { withWorkoutLock } from "./workout-lock";

import { fail, owned, ownerFilter, localDate } from "../packages/domain/workoutAccess.js";
import { validSet, personalBests, finishAnalytics } from "../packages/domain/workoutAnalytics.js";
import { activatePlan } from "../packages/domain/planActivation.js";
import { enrichExercise } from "../packages/domain/exerciseLibrary.js";
import { dateWeekday, weekStart, affectedDates } from "../packages/domain/workoutSchedule.js";

export default async function workoutCommand(req: Request, client: any) {
  let action = "unknown";
  let stage = "authenticate";
  try {
    const user = await client.auth.me();
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    stage = "validate";
    const input = workoutCommandSchema.parse(await req.json());
    action = input.action;
    if (
      ![
        "start",
        "saveSet",
        "finish",
        "discard",
        "check",
        "activatePlan",
        "changeSchedule",
        "undoScheduleChange",
      ].includes(input?.action)
    )
      fail("Unknown workout action.");
    if (input.action === "check")
      return Response.json({ ok: true, localDate: localDate(input.timezone), authenticated: true });
    const result = await withWorkoutLock(
      client,
      user,
      async (assertLock: () => Promise<void>, profile: any) => {
        stage = "load-workout";
        const db = client.asServiceRole.entities,
          filter = ownerFilter(user.id);
        if (input.action === "activatePlan")
          return activatePlan(db, user, input.planId, assertLock);
        if (input.action === "changeSchedule" || input.action === "undoScheduleChange") {
          const today = localDate(input.timezone);
          const existing =
            input.action === "undoScheduleChange"
              ? await db.WorkoutScheduleChange.get(input.changeId)
              : null;
          if (existing && (!owned(existing, user.id) || !existing.active))
            fail("Schedule change not found.", 404);
          const planId = input.action === "changeSchedule" ? input.planId : existing!.planId;
          const plan = await db.WorkoutPlan.get(planId);
          if (!owned(plan, user.id) || !plan.active)
            fail("Open your active program to adjust this week.", 409);
          if (plan.structureLocked || plan.athleteMode === "track_only" || plan.coachProvided)
            fail("This coach program's schedule is locked.", 409);
          const currentPlans = await db.WorkoutPlan.filter(
            { ...filter, active: true },
            "-created_date",
            1
          );
          if (currentPlans[0]?.id !== plan.id) fail("This program is no longer active.", 409);
          const fromDate = input.action === "changeSchedule" ? input.fromDate : existing!.fromDate;
          const toDate = input.action === "changeSchedule" ? input.toDate : existing!.toDate;
          try {
            dateWeekday(fromDate);
            dateWeekday(toDate);
          } catch {
            fail("Choose valid calendar dates.");
          }
          if (
            weekStart(fromDate) !== weekStart(today) ||
            weekStart(toDate) !== weekStart(today) ||
            fromDate < today ||
            toDate < today ||
            fromDate === toDate
          )
            fail("Choose two upcoming dates in this week.", 409);
          const days = await db.WorkoutDay.filter({ ...filter, planId }, "weekday", 7);
          const fromDay = days.find((day: any) => day.weekday === dateWeekday(fromDate));
          const toDay = days.find((day: any) => day.weekday === dateWeekday(toDate));
          if (
            !fromDay ||
            !toDay ||
            fromDay.isRest ||
            fromDay.fixedSchedule ||
            fromDay.coachMandated ||
            toDay.fixedSchedule ||
            toDay.coachMandated
          )
            fail("These dates cannot be moved in this program.", 409);
          if (input.action === "changeSchedule" && (toDay.isRest ? "move" : "swap") !== input.mode)
            fail("Review the current destination before saving.", 409);
          const sessions = await Promise.all(
            affectedDates({ fromDate, toDate }).map((date) =>
              db.WorkoutSession.filter({ ...filter, date }, "created_date", 1)
            )
          );
          if (sessions.some((rows) => rows.length))
            fail(
              "A workout has already started on one of these dates. Your history was kept.",
              409
            );
          const changes = await db.WorkoutScheduleChange.filter(
            { ...filter, planId, active: true, fromDate: { $gte: weekStart(today) } },
            "created_date",
            100
          );
          if (
            input.action === "changeSchedule" &&
            changes.some((change: any) =>
              affectedDates(change).some((date) => date === fromDate || date === toDate)
            )
          )
            fail("One of these dates already has a temporary change. Undo it first.", 409);
          await assertLock();
          if (existing) {
            const change = await db.WorkoutScheduleChange.update(existing.id, { active: false });
            return { change };
          }
          const change = await db.WorkoutScheduleChange.create({
            planId,
            fromDayId: fromDay.id,
            toDayId: toDay.id,
            fromDate,
            toDate,
            mode: input.action === "changeSchedule" ? input.mode : existing!.mode,
            active: true,
          });
          return { change };
        }
        if (input.action === "start") {
          if (typeof input.workoutDayId !== "string") fail("Choose a workout.");
          const day = await db.WorkoutDay.get(input.workoutDayId);
          if (!owned(day, user.id)) fail("Workout not found.", 404);
          if (day.isRest) fail("This is a recovery day.");
          const plan = await db.WorkoutPlan.get(day.planId);
          if (!owned(plan, user.id)) fail("Workout not found.", 404);
          const date = localDate(input.timezone);
          const active = await db.WorkoutSession.filter(
            { ...filter, status: "active" },
            "created_date",
            100
          );
          if (active.length)
            return {
              session: active[0],
              ...(active[0].workoutDayId !== day.id
                ? { redirectWorkoutDayId: active[0].workoutDayId }
                : {}),
            };
          const finished = await db.WorkoutSession.filter(
            { ...filter, workoutDayId: day.id, date, status: "completed" },
            "created_date",
            1
          );
          if (finished.length) return { session: finished[0] };
          const currentPlans = await db.WorkoutPlan.filter(
            { ...filter, active: true },
            "-created_date",
            1
          );
          if (!plan.active || currentPlans[0]?.id !== plan.id)
            fail("This program is no longer active. Open your current schedule.", 409);
          const exercises = await db.WorkoutExercise.filter(
            { created_by_id: user.id, workoutDayId: day.id },
            "order",
            100
          );
          if (!exercises.length)
            fail("This workout has no exercises. Rebuild your plan in Profile.", 409);
          await assertLock();
          const session = await db.WorkoutSession.create({
            ownerId: user.id,
            workoutDayId: day.id,
            planId: day.planId,
            name: day.name,
            date,
            timezone: input.timezone,
            startedAt: new Date().toISOString(),
            status: "active",
            targetMuscles: day.targetMuscles || [],
          });
          return { session };
        }
        if (typeof input.sessionId !== "string") fail("A workout session is required.");
        const session = await db.WorkoutSession.get(input.sessionId);
        if (!owned(session, user.id)) fail("Workout not found.", 404);
        if (input.action === "saveSet") {
          if (session.status !== "active")
            fail("This workout is no longer active. Your local changes have been kept.", 409);
          const row = input.row;
          if (
            !row ||
            typeof row.workoutExerciseId !== "string" ||
            !Number.isInteger(row.setNumber) ||
            row.setNumber < 1 ||
            row.setNumber > 30 ||
            typeof row.operationId !== "string" ||
            !row.operationId.trim() ||
            row.operationId.length > 100
          )
            fail("Invalid set.");
          const we = await db.WorkoutExercise.get(row.workoutExerciseId);
          if (!owned(we, user.id) || we.workoutDayId !== session.workoutDayId)
            fail("Exercise does not belong to this workout.", 403);
          const plan = await db.WorkoutPlan.get(session.planId);
          const locked =
            plan.structureLocked || plan.athleteMode === "track_only" || we.coachMandated;
          if (locked && row.exerciseId && row.exerciseId !== we.exerciseId)
            fail("This exercise is locked by your imported program.", 409);
          const original = we.exerciseId
            ? enrichExercise(await db.Exercise.get(we.exerciseId))
            : null;
          const exercise = row.exerciseId
            ? enrichExercise(await db.Exercise.get(row.exerciseId))
            : original || {
                id: "",
                name: we.exerciseName,
                primaryMuscle: we.primaryMuscle || "Other",
                category: we.category || "Imported",
                equipment: we.equipment || "Coach program",
              };
          if (
            original &&
            exercise.id !== original.id &&
            (exercise.primaryMuscle !== original.primaryMuscle ||
              exercise.category !== original.category ||
              (original.movementPattern && exercise.movementPattern !== original.movementPattern) ||
              (original.difficulty !== "Advanced" && exercise.difficulty === "Advanced") ||
              (original.category !== "Power" && exercise.programEligible === false))
          )
            fail("Choose a replacement with the same muscle and movement category.");
          if (
            original &&
            exercise.id !== original.id &&
            profile.equipment?.length &&
            !profile.equipment.some((e: any) => /full|commercial|gym/i.test(e)) &&
            exercise.equipment !== "Bodyweight" &&
            !profile.equipment.some((e: any) =>
              e.toLowerCase().includes(exercise.equipment.toLowerCase())
            )
          )
            fail("This replacement requires equipment outside your profile.");
          if (typeof row.completed !== "boolean" || !validSet({ ...row, completed: true }))
            fail("Use a weight from 0–2,500 lb and whole reps from 1–100.");
          if (
            row.rir !== "" &&
            row.rir != null &&
            (!Number.isInteger(+row.rir) || +row.rir < 0 || +row.rir > 10)
          )
            fail("RIR must be from 0–10.");
          const rowKey = `${we.id}:${row.setNumber}`;
          stage = "load-sets";
          const all = await db.ExerciseSet.filter(
            { ...filter, workoutSessionId: session.id },
            "created_date",
            1000
          );
          const existing = all.find(
            (s: any) =>
              s.rowKey === rowKey ||
              (!s.rowKey && s.exerciseName === we.exerciseName && s.setNumber === row.setNumber)
          );
          if (existing?.revision === row.operationId) return { set: existing };
          if (existing && (existing.revision || "") !== (row.revision || ""))
            fail(
              "This set changed on another screen. Refresh to load the saved version before editing it.",
              409
            );
          const payload = {
            ownerId: user.id,
            workoutSessionId: session.id,
            workoutExerciseId: we.id,
            rowKey,
            revision: row.operationId,
            exerciseId: exercise.id || "",
            exerciseName: exercise.name,
            primaryMuscle: exercise.primaryMuscle,
            setNumber: row.setNumber,
            setType: row.setType === "warmup" ? "warmup" : "working",
            weight: +row.weight,
            reps: +row.reps,
            completed: row.completed,
            timestamp: new Date().toISOString(),
            ...(row.rir === "" || row.rir == null ? {} : { rir: +row.rir }),
          };
          stage = "lock-set";
          await assertLock();
          stage = existing ? "update-set" : "create-set";
          const saved = existing
            ? await db.ExerciseSet.update(existing.id, payload)
            : await db.ExerciseSet.create(payload);
          return { set: saved };
        }
        if (input.action === "discard") {
          if (session.status === "completed")
            fail("Completed workouts cannot be discarded here.", 409);
          await assertLock();
          await db.WorkoutSession.update(session.id, {
            status: "skipped",
            completedAt: session.completedAt || new Date().toISOString(),
          });
          return { ok: true };
        }
        if (session.status === "skipped") fail("This workout was discarded.", 409);
        let finished = session;
        if (session.status !== "completed") {
          const sets = (
            await db.ExerciseSet.filter(
              { ...filter, workoutSessionId: session.id, completed: true },
              "setNumber",
              1000
            )
          ).filter(validSet);
          if (!sets.length) fail("Complete and sync at least one set before finishing.");
          if (
            !Array.isArray(input.expectedSets) ||
            sets.length !== input.expectedSets.length ||
            sets.some(
              (s: any) =>
                !input.expectedSets.some(
                  (e) => e.id === s.id && (e.revision || "") === (s.revision || "")
                )
            )
          )
            fail("Your workout changed on another screen. Refresh before finishing.", 409);
          const records = await db.PersonalRecord.filter(filter, "-date", 1000);
          const workingSets = sets.filter((set: any) => set.setType !== "warmup");
          const prs = personalBests(workingSets, records);
          const previous = (
            await db.WorkoutSession.filter(
              { ...filter, workoutDayId: session.workoutDayId, status: "completed" },
              "-completedAt",
              1
            )
          )[0];
          const volume = Math.round(
              workingSets.reduce((a: number, r: any) => a + +r.weight * +r.reps, 0)
            ),
            completedAt = new Date().toISOString();
          const durationMinutes = Math.max(
            1,
            Math.round(
              (Date.now() -
                new Date(session.startedAt).getTime() -
                (input.pausedMilliseconds || 0)) /
                60000
            )
          );
          const best = [...workingSets].sort((a, b) => b.weight - a.weight)[0];
          const summary = {
            name: session.name,
            durationMinutes,
            workingSets: workingSets.length,
            completedExercises: new Set(sets.map((s: any) => s.workoutExerciseId || s.exerciseName))
              .size,
            volume,
            prs,
            ratingChanges: [],
            analyticsPending: true,
            bestLift: best
              ? { name: best.exerciseName, weight: best.weight, reps: best.reps }
              : null,
            previousVolume: previous?.totalVolume ?? null,
          };
          await assertLock();
          finished = await db.WorkoutSession.update(session.id, {
            status: "completed",
            completedAt,
            durationMinutes,
            totalVolume: volume,
            setCount: workingSets.length,
            prCount: prs.length,
            completionSummary: summary,
            analyticsStatus: "pending",
          });
        }
        if (!finished.completionSummary)
          return {
            summary: {
              name: finished.name,
              durationMinutes: finished.durationMinutes || 0,
              workingSets: finished.setCount || 0,
              volume: finished.totalVolume || 0,
              prs: [],
              ratingChanges: [],
              analyticsPending: false,
            },
          };
        if (finished.analyticsStatus === "complete") return { summary: finished.completionSummary };
        try {
          return { summary: await finishAnalytics(client, user, finished, profile, assertLock) };
        } catch {
          return { summary: { ...finished.completionSummary, analyticsPending: true } };
        }
      }
    );
    return Response.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    if (status >= 500)
      console.error(JSON.stringify({ event: "workout_command_failure", action, stage }));
    return Response.json(
      {
        error:
          status < 500
            ? error.message
            : "Could not sync this workout. Your draft is kept; please retry.",
      },
      { status }
    );
  }
}
