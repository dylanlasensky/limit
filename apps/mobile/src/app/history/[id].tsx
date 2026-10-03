import { useCallback, useRef, useState } from "react";
import { Text } from "react-native";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { auth, get, list } from "../../lib/api";
import { Page, Title, Copy, Card, Action, styles } from "../../ui";
import type { SavedRecord } from "../../../../../packages/contracts/entities";

export default function HistoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: account, isPending } = auth.useSession();
  const owner = account?.user.id;
  const requestKey = `${owner || ""}:${id || ""}`;
  const [workout, setWorkout] = useState<SavedRecord<"WorkoutSession"> | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [sets, setSets] = useState<SavedRecord<"ExerciseSet">[]>([]);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb" | "">("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);

  const load = useCallback(async () => {
    if (!owner || !id) return;
    const ticket = ++generation.current;
    setLoadedKey(requestKey);
    setBusy(true);
    setError("");
    setWorkout(null);
    setSets([]);
    setWeightUnit("");
    try {
      const record = await get("WorkoutSession", id);
      if (record.ownerId !== owner) throw new Error("Could not verify workout ownership.");
      if (record.status !== "completed") throw new Error("This workout is not completed.");
      const [savedSets, profiles] = await Promise.all([
        list(
          "ExerciseSet",
          { workoutSessionId: id },
          {
            sort: "created_date",
            limit: 2000,
          }
        ),
        list("UserProfile", {}, { limit: 1 }),
      ]);
      if (savedSets.some((set) => set.ownerId !== owner))
        throw new Error("Could not verify set ownership.");
      if (profiles.some((profile) => profile.ownerId !== owner))
        throw new Error("Could not verify profile ownership.");
      if (savedSets.length === 2000) {
        const overflow = await list(
          "ExerciseSet",
          { workoutSessionId: id },
          { limit: 1, skip: 2000 }
        );
        if (overflow.length) throw new Error("This workout has too many sets to display here.");
      }
      if (ticket === generation.current) {
        setWorkout(record);
        setSets(savedSets);
        setWeightUnit(
          profiles[0]?.units === "metric" ? "kg" : profiles[0]?.units === "imperial" ? "lb" : ""
        );
      }
    } catch (cause) {
      if (ticket === generation.current) setError((cause as Error).message);
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }, [owner, id, requestKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current += 1;
      };
    }, [load])
  );

  if (isPending)
    return (
      <Page>
        <Copy>Loading your account…</Copy>
      </Page>
    );
  if (!account) return <Redirect href="/sign-in" />;
  const visible = loadedKey === requestKey;
  const shownWorkout = visible && workout?.id === id && workout.ownerId === owner ? workout : null;
  const names = shownWorkout ? [...new Set(sets.map((set) => set.exerciseName))] : [];
  return (
    <Page>
      <Title>{shownWorkout?.name || "Workout details"}</Title>
      {(!visible || busy) && <Copy>Loading completed workout…</Copy>}
      {visible && !!error && (
        <>
          <Text accessibilityRole="alert" style={styles.text}>
            {error}
          </Text>
          <Action label="Retry workout details" onPress={() => void load()} />
        </>
      )}
      {shownWorkout && (
        <>
          <Copy>{shownWorkout.date}</Copy>
          <Copy>
            {shownWorkout.setCount ?? sets.filter((set) => set.completed).length} completed sets
            {shownWorkout.durationMinutes !== undefined
              ? ` · ${Math.round(shownWorkout.durationMinutes)} minutes`
              : ""}
          </Copy>
          {!names.length && <Copy>No saved sets for this session.</Copy>}
          {names.map((name) => (
            <Card key={name}>
              <Title>{name}</Title>
              {sets
                .filter((set) => set.exerciseName === name)
                .map((set) => (
                  <Copy key={set.id}>
                    Set {set.setNumber}: {set.reps ?? "—"} reps
                    {set.weight !== undefined
                      ? ` · load ${set.weight}${weightUnit ? ` ${weightUnit}` : ""}`
                      : ""}
                    {set.completed ? " · complete" : " · incomplete"}
                  </Copy>
                ))}
            </Card>
          ))}
        </>
      )}
      <Action label="Back to workout history" onPress={() => router.replace("/history")} />
    </Page>
  );
}
