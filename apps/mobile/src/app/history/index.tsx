import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Text } from "react-native";
import { auth, list } from "../../lib/api";
import { Page, Title, Copy, Card, Action, styles } from "../../ui";
import type { SavedRecord } from "../../../../../packages/contracts/entities";

const pageSize = 20;

export default function History() {
  const { data: session, isPending } = auth.useSession();
  const owner = session?.user.id;
  const [sessions, setSessions] = useState<SavedRecord<"WorkoutSession">[]>([]);
  const [loadedOwner, setLoadedOwner] = useState<string | undefined>();
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const loading = useRef(false);

  const load = useCallback(
    async (offset: number) => {
      if (!owner || loading.current) return;
      loading.current = true;
      const requestGeneration = generation.current;
      setBusy(true);
      setError("");
      try {
        const page = await list(
          "WorkoutSession",
          { status: "completed" },
          {
            sort: "-date",
            limit: pageSize,
            skip: offset,
          }
        );
        if (requestGeneration !== generation.current) return;
        if (page.some((record) => record.ownerId !== owner))
          throw new Error("Could not verify workout ownership. Please retry.");
        setSessions((current) => (offset === 0 ? page : [...current, ...page]));
        setSkip(offset + page.length);
        setHasMore(page.length === pageSize);
      } catch (cause) {
        if (requestGeneration === generation.current) setError((cause as Error).message);
      } finally {
        if (requestGeneration === generation.current) {
          loading.current = false;
          setBusy(false);
        }
      }
    },
    [owner]
  );

  useFocusEffect(
    useCallback(() => {
      generation.current += 1;
      loading.current = false;
      setLoadedOwner(owner);
      setSessions([]);
      setSkip(0);
      setHasMore(false);
      setBusy(!!owner);
      setError("");
      if (owner) void load(0);
      return () => {
        generation.current += 1;
        loading.current = false;
      };
    }, [owner, load])
  );

  if (isPending)
    return (
      <Page>
        <Copy>Loading your account…</Copy>
      </Page>
    );
  if (!session) return <Redirect href="/sign-in" />;
  const currentOwner = loadedOwner === owner;
  return (
    <Page>
      <Title>Workout history</Title>
      <Copy>Completed sessions from your account.</Copy>
      {currentOwner &&
        sessions.map((workout) => (
          <Card key={workout.id}>
            <Title>{workout.name}</Title>
            <Copy>{workout.date}</Copy>
            <Copy>
              {workout.setCount ?? 0} sets
              {workout.durationMinutes !== undefined
                ? ` · ${Math.round(workout.durationMinutes)} minutes`
                : ""}
            </Copy>
            <Action
              label={`View ${workout.name} from ${workout.date}`}
              onPress={() => router.push({ pathname: "/history/[id]", params: { id: workout.id } })}
            />
          </Card>
        ))}
      {(!currentOwner || busy) && <Copy>Loading workouts…</Copy>}
      {currentOwner && !busy && !sessions.length && !error && (
        <Copy>No completed workouts yet.</Copy>
      )}
      {currentOwner && !!error && (
        <>
          <Text accessibilityRole="alert" style={styles.text}>
            {error}
          </Text>
          <Action label="Retry workout history" onPress={() => void load(skip)} />
        </>
      )}
      {currentOwner && hasMore && !error && (
        <Action label="Load more workouts" disabled={busy} onPress={() => void load(skip)} />
      )}
    </Page>
  );
}
