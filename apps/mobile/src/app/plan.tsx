import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { auth, list } from "../lib/api";
import { Page, Title, Copy, Card, Action } from "../ui";
import type { SavedRecord } from "../../../../packages/contracts/entities";
import { weekStart } from "../../../../packages/domain/workoutSchedule.js";
import { localCalendarDate, nativeWeekSchedule } from "../lib/week-schedule";
export default function Plan() {
  const { data: session, isPending } = auth.useSession();
  const owner = session?.user.id;
  const [days, setDays] = useState<{
      owner: string;
      records: SavedRecord<"WorkoutDay">[];
      changes: SavedRecord<"WorkoutScheduleChange">[];
    } | null>(null),
    [error, setError] = useState<{ owner: string; message: string } | null>(null);
  const requestVersion = useRef(0);
  const load = useCallback(() => {
    if (!owner) return;
    const ticket = ++requestVersion.current;
    void list("WorkoutPlan", { active: true })
      .then(async (plans) => {
        if (ticket !== requestVersion.current) return;
        if (plans.some((plan) => plan.ownerId !== owner))
          throw new Error("Could not verify plan ownership.");
        const [records, changes] = plans[0]
          ? await Promise.all([
              list("WorkoutDay", { planId: plans[0].id }),
              list(
                "WorkoutScheduleChange",
                {
                  planId: plans[0].id,
                  active: true,
                  fromDate: { $gte: weekStart(localCalendarDate()) },
                },
                { limit: 100 }
              ),
            ])
          : [[], []];
        if (ticket !== requestVersion.current) return;
        if (records.some((day) => day.ownerId !== owner || day.planId !== plans[0]?.id))
          throw new Error("Could not verify workout day ownership.");
        if (changes.some((change) => change.ownerId !== owner || change.planId !== plans[0]?.id))
          throw new Error("Could not verify schedule ownership.");
        setDays({ owner, records, changes });
        setError(null);
      })
      .catch((e) => {
        if (ticket === requestVersion.current) setError({ owner, message: e.message });
      });
  }, [owner]);
  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load])
  );
  if (!session && !isPending) return <Redirect href="/sign-in" />;
  const currentDays = days && days.owner === owner ? days.records : null;
  const currentWeek =
    days && days.owner === owner
      ? nativeWeekSchedule(days.records, days.changes, localCalendarDate())
      : null;
  const currentError = error && error.owner === owner ? error.message : "";
  return (
    <Page>
      <Title>Your week</Title>
      <Copy>Consistency comes from a plan you can repeat.</Copy>
      {currentDays?.length
        ? currentWeek?.map(({ date, weekday, day }) => (
            <Card key={date}>
              <Title>
                {
                  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][
                    weekday
                  ]
                }
              </Title>
              <Copy>
                {date} · {day?.name || "Rest day"}
              </Copy>
              {day && !day.isRest && (
                <Action
                  label="Start workout"
                  onPress={() => router.push({ pathname: "/workout/[id]", params: { id: day.id } })}
                />
              )}
            </Card>
          ))
        : null}
      {currentDays?.length === 0 && (
        <>
          <Copy>No active plan yet.</Copy>
          <Action label="Build my starting plan" onPress={() => router.push("/onboarding")} />
        </>
      )}
      {currentDays === null && !currentError && <Copy>Loading your plan…</Copy>}
      {!!currentError && (
        <>
          <Copy>{currentError}</Copy>
          <Action label="Retry" onPress={load} />
        </>
      )}
    </Page>
  );
}
