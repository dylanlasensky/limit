import { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { auth, list } from "../lib/api";
import { Page, Title, Copy, Card, Action } from "../ui";
import type { SavedRecord } from "../../../../packages/contracts/entities";
export default function Plan() {
  const { data: session, isPending } = auth.useSession();
  const owner = session?.user.id;
  const [days, setDays] = useState<SavedRecord<"WorkoutDay">[]>([]),
    [error, setError] = useState("");
  const load = useCallback(() => {
    if (!owner) return;
    void list("WorkoutPlan", { active: true })
      .then(async (plans) => {
        setDays(
          plans[0]
            ? (await list("WorkoutDay", { planId: plans[0].id })).sort(
                (a, b) => a.weekday - b.weekday
              )
            : []
        );
      })
      .catch((e) => setError(e.message));
  }, [owner]);
  useFocusEffect(load);
  if (!session && !isPending) return <Redirect href="/sign-in" />;
  return (
    <Page>
      <Title>Your week</Title>
      <Copy>Consistency comes from a plan you can repeat.</Copy>
      {days.map((day) => (
        <Card key={day.id}>
          <Title>
            {
              ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][
                day.weekday
              ]
            }
          </Title>
          <Copy>{day.name}</Copy>
          {!day.isRest && (
            <Action
              label="Start workout"
              onPress={() => router.push({ pathname: "/workout/[id]", params: { id: day.id } })}
            />
          )}
        </Card>
      ))}
      {!days.length && <Copy>No active plan yet. Complete your profile on the web.</Copy>}
      {!!error && (
        <>
          <Copy>{error}</Copy>
          <Action label="Retry" onPress={load} />
        </>
      )}
    </Page>
  );
}
