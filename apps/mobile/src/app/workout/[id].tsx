import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { auth, command, list } from "../../lib/api";
import { loadDraft, saveDraft, removeDraft } from "../../lib/drafts";
import { Page, Title, Copy, Card, Input, Action, styles } from "../../ui";
import { MediaGuide } from "../../media-guide";
import { recordSchema, type SavedRecord } from "../../../../../packages/contracts/entities";
type Row = {
  workoutExerciseId: string;
  exerciseId: string;
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
  completed: boolean;
  operationId: string;
  revision: string;
  savedId?: string;
  pending: boolean;
};
type Draft = {
  session: SavedRecord<"WorkoutSession">;
  exercises: SavedRecord<"WorkoutExercise">[];
  catalog: SavedRecord<"Exercise">[];
  rows: Row[];
  index: number;
  paused: boolean;
  pausedAt: number | null;
  pausedMs: number;
  restUntil: number | null;
};
export default function Workout() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { data: account, isPending } = auth.useSession();
  const owner = account?.user.id || "",
    key = owner + ":" + id;
  const [draft, setDraft] = useState<Draft | null>(null),
    [draftKey, setDraftKey] = useState(""),
    [error, setError] = useState<{ key: string; message: string } | null>(null),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(() => Date.now());
  const current = useRef<Draft | null>(null),
    saving = useRef(false);
  const persist = useCallback(
    (value: Draft) => {
      saveDraft(owner, key, value);
      current.current = value;
      setDraft(value);
      setDraftKey(key);
    },
    [owner, key]
  );
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    if (!owner || !id) return;
    let cancelled = false;
    void (async () => {
      const stored = await Promise.resolve(loadDraft(owner, key) as Draft | null);
      const cached = stored?.session.ownerId === owner ? stored : null;
      if (cancelled) return;
      if (cached) {
        current.current = cached;
        setDraft(cached);
        setDraftKey(key);
      }
      try {
        const response = await command({
          action: "start",
          workoutDayId: id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (
          typeof response.redirectWorkoutDayId === "string" &&
          response.redirectWorkoutDayId !== id
        ) {
          if (!cancelled)
            router.replace({
              pathname: "/workout/[id]",
              params: { id: response.redirectWorkoutDayId },
            });
          return;
        }
        const session = recordSchema("WorkoutSession").parse(response.session);
        if (session.status === "completed") {
          removeDraft(owner, key);
          if (!cancelled) router.replace("/plan");
          return;
        }
        const [exercises, catalog, sets] = await Promise.all([
          list("WorkoutExercise", { workoutDayId: id }),
          list("Exercise"),
          list("ExerciseSet", { workoutSessionId: session.id }),
        ]);
        if (cancelled) return;
        if (cached?.session.id === session.id) {
          persist({ ...cached, catalog });
          return;
        }
        const rows = exercises.flatMap((e) =>
          Array.from({ length: e.sets || 3 }, (_, i) => {
            const saved = sets.find((s) => s.workoutExerciseId === e.id && s.setNumber === i + 1);
            return {
              workoutExerciseId: e.id,
              exerciseId: e.exerciseId || "",
              setNumber: i + 1,
              weight: saved?.weight?.toString() || "",
              reps: saved?.reps?.toString() || "",
              rir: saved?.rir?.toString() || "",
              completed: saved?.completed || false,
              operationId: Crypto.randomUUID(),
              revision: saved?.revision || "",
              savedId: saved?.id,
              pending: false,
            };
          })
        );
        persist({
          session,
          exercises: exercises.sort((a, b) => (a.order || 0) - (b.order || 0)),
          catalog,
          rows,
          index: 0,
          paused: false,
          pausedAt: null,
          pausedMs: 0,
          restUntil: null,
        });
      } catch (e) {
        if (!cancelled) setError({ key, message: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, id, key, persist]);
  const sync = async () => {
    if (current.current?.session.ownerId !== owner) return false;
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      for (const row of current.current?.rows || []) {
        if (!row.pending) continue;
        const response = await command({
          action: "saveSet",
          sessionId: current.current!.session.id,
          row,
        });
        const saved = recordSchema("ExerciseSet").parse(response.set);
        persist({
          ...current.current!,
          rows: current.current!.rows.map((r) =>
            r.operationId === row.operationId
              ? { ...r, pending: false, revision: saved.revision || "", savedId: saved.id }
              : r
          ),
        });
      }
      setError(null);
      return true;
    } catch (e) {
      setError({ key, message: (e as Error).message });
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const finish = async (finishedAt: number) => {
    if (!current.current || !(await sync())) return;
    setBusy(true);
    try {
      await command({
        action: "finish",
        sessionId: current.current.session.id,
        pausedMilliseconds:
          current.current.pausedMs +
          (current.current.pausedAt === null ? 0 : finishedAt - current.current.pausedAt),
        expectedSets: current.current.rows
          .filter((r) => r.completed && r.savedId)
          .map((r) => ({ id: r.savedId, revision: r.revision })),
      });
      removeDraft(owner, key);
      router.replace("/plan");
    } catch (e) {
      setError({ key, message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  if (!account && !isPending) return <Redirect href="/sign-in" />;
  const shownError = error?.key === key ? error.message : "";
  if (!draft || draftKey !== key || draft.session.ownerId !== owner)
    return (
      <Page>
        <Title>Your workout</Title>
        <Copy>{shownError || "Loading your saved session…"}</Copy>
        <Action label="Back to plan" onPress={() => router.back()} />
      </Page>
    );
  const exercise = draft.exercises[draft.index],
    catalog = draft.catalog.find((e) => e.id === exercise?.exerciseId);
  const edit = (row: Row, patch: Partial<Row>) =>
    persist({
      ...draft,
      rows: draft.rows.map((r) =>
        r === row
          ? {
              ...r,
              ...patch,
              operationId: Crypto.randomUUID(),
              pending: r.completed || !!patch.completed,
            }
          : r
      ),
    });
  return (
    <Page>
      <Title>{draft.session.name}</Title>
      <Copy>
        Movement {draft.index + 1} of {draft.exercises.length}
      </Copy>
      {!!shownError && (
        <Text accessibilityRole="alert" style={styles.text}>
          {shownError}
        </Text>
      )}
      <Copy>
        {draft.rows.some((r) => r.pending)
          ? "Saved on this device · waiting to sync"
          : "All completed sets synced"}
      </Copy>
      <Action
        label={draft.paused ? "Resume workout" : "Pause workout"}
        onPress={() => {
          const time = Date.now();
          const duration = draft.pausedAt === null ? 0 : time - draft.pausedAt;
          persist({
            ...draft,
            paused: !draft.paused,
            pausedAt: draft.paused ? null : time,
            pausedMs: draft.pausedMs + duration,
            restUntil:
              draft.restUntil && draft.paused ? draft.restUntil + duration : draft.restUntil,
          });
        }}
      />
      <Card>
        <Title>{exercise?.exerciseName}</Title>
        <Copy>{catalog?.primaryMuscle || exercise?.primaryMuscle}</Copy>
        {!!catalog && (
          <MediaGuide
            key={catalog.id}
            catalogKey={catalog.id}
            instructions={catalog.instructions || []}
          />
        )}
        <Copy>A set is one group of repetitions. Leave two or three comfortable reps left.</Copy>
      </Card>
      {!draft.paused &&
        draft.rows
          .filter((r) => r.workoutExerciseId === exercise?.id)
          .map((row) => (
            <Card key={row.setNumber}>
              <Copy>
                Set {row.setNumber}
                {row.completed ? " · complete" : ""}
              </Copy>
              <Input
                label="Weight"
                numeric
                value={row.weight}
                onChangeText={(weight) => edit(row, { weight })}
              />
              <Input
                label="Repetitions"
                numeric
                value={row.reps}
                onChangeText={(reps) => edit(row, { reps })}
              />
              <Action
                label={row.completed ? "Set completed" : "Complete set"}
                disabled={
                  busy ||
                  row.completed ||
                  !row.reps ||
                  !Number.isFinite(Number(row.reps)) ||
                  Number(row.reps) < 1 ||
                  !Number.isFinite(Number(row.weight)) ||
                  Number(row.weight) < 0
                }
                onPress={() => {
                  edit(row, { completed: true });
                  persist({
                    ...current.current!,
                    restUntil: Date.now() + (exercise.restSeconds || 90) * 1000,
                  });
                  void sync();
                }}
              />
            </Card>
          ))}
      {!!draft.restUntil && draft.restUntil > (draft.pausedAt ?? now) && (
        <Copy>Rest · {Math.ceil((draft.restUntil - (draft.pausedAt ?? now)) / 1000)} seconds</Copy>
      )}
      <View style={{ gap: 12 }}>
        <Action
          label="Previous movement"
          disabled={draft.index === 0}
          onPress={() => persist({ ...draft, index: draft.index - 1 })}
        />
        <Action
          label="Next movement"
          disabled={draft.index === draft.exercises.length - 1}
          onPress={() => persist({ ...draft, index: draft.index + 1 })}
        />
        <Action
          label="Retry sync"
          disabled={busy}
          onPress={() => {
            void sync();
          }}
        />
        <Action
          label="Finish workout"
          disabled={busy || !draft.rows.some((r) => r.completed)}
          onPress={() => {
            void finish(Date.now());
          }}
        />
      </View>
    </Page>
  );
}
