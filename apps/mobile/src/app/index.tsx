import { useCallback, useRef, useState } from "react";
import { Link, Redirect, useFocusEffect, router } from "expo-router";
import { Text } from "react-native";
import { auth, list } from "../lib/api";
import { clearDrafts } from "../lib/drafts";
import { Page, Title, Copy, Card, Action, styles } from "../ui";
export default function Home() {
  const { data: session, isPending } = auth.useSession();
  const owner = session?.user.id;
  const [plan, setPlan] = useState<{ owner: string; name: string } | null>(null);
  const [error, setError] = useState<{ owner: string; message: string } | null>(null);
  const requestVersion = useRef(0);
  const loadPlan = useCallback(async () => {
    if (!owner) return;
    const ticket = ++requestVersion.current;
    try {
      const records = await list("WorkoutPlan", { active: true });
      if (ticket !== requestVersion.current) return;
      if (records.some((record) => record.ownerId !== owner))
        throw new Error("Could not verify plan ownership.");
      setPlan({ owner, name: records[0]?.name || "" });
      setError(null);
    } catch (cause) {
      if (ticket === requestVersion.current) setError({ owner, message: (cause as Error).message });
    }
  }, [owner]);
  useFocusEffect(
    useCallback(() => {
      void loadPlan();
      return () => {
        requestVersion.current += 1;
      };
    }, [loadPlan])
  );
  if (isPending)
    return (
      <Page>
        <Copy>Loading your account…</Copy>
      </Page>
    );
  if (!session) return <Redirect href="/sign-in" />;
  const currentPlan = plan && plan.owner === owner ? plan.name : undefined;
  const currentError = error && error.owner === owner ? error.message : "";
  return (
    <Page>
      <Title>Hi, {session.user.name.split(" ")[0]}.</Title>
      <Copy>Start where you are. Build from here.</Copy>
      <Card>
        <Title>{currentPlan || "Your next step"}</Title>
        <Copy>
          {currentPlan === undefined
            ? currentError || "Loading your plan…"
            : currentPlan
              ? "Your saved weekly plan is ready."
              : "Choose your training preferences to build your first personalized plan."}
        </Copy>
        {currentPlan ? (
          <Action label="Open my week" onPress={() => router.push("/plan")} />
        ) : currentPlan === "" ? (
          <Action
            label="Set up my profile"
            onPress={() => {
              router.push("/onboarding");
            }}
          />
        ) : currentError ? (
          <Action label="Retry plan" onPress={() => void loadPlan()} />
        ) : null}
      </Card>
      {!!currentError && (
        <Text accessibilityRole="alert" style={styles.text}>
          {currentError}
        </Text>
      )}
      <Link href="/plan">View weekly plan</Link>
      <Action label="Workout history" onPress={() => router.push("/history")} />
      <Action label="Account, privacy and support" onPress={() => router.push("/account")} />
      <Action
        label="Sign out"
        onPress={() => {
          void auth
            .signOut()
            .then((r) => {
              if (r.error) throw new Error(r.error.message);
              clearDrafts(session.user.id);
              router.replace("/sign-in");
            })
            .catch((e) => setError({ owner: session.user.id, message: e.message }));
        }}
      />
    </Page>
  );
}
