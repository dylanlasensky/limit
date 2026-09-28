import { useCallback, useState } from "react";
import { Link, Redirect, useFocusEffect, router } from "expo-router";
import { Linking } from "react-native";
import { auth, list, origin } from "../lib/api";
import { clearDrafts } from "../lib/drafts";
import { Page, Title, Copy, Card, Action } from "../ui";
export default function Home() {
  const { data: session, isPending } = auth.useSession();
  const owner = session?.user.id;
  const [plan, setPlan] = useState(""),
    [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      if (owner)
        void list("WorkoutPlan", { active: true })
          .then((p) => setPlan(p[0]?.name || ""))
          .catch((e) => setError(e.message));
    }, [owner])
  );
  if (isPending)
    return (
      <Page>
        <Copy>Loading your account…</Copy>
      </Page>
    );
  if (!session) return <Redirect href="/sign-in" />;
  return (
    <Page>
      <Title>Hi, {session.user.name.split(" ")[0]}.</Title>
      <Copy>Start where you are. Build from here.</Copy>
      <Card>
        <Title>{plan || "Your next step"}</Title>
        <Copy>
          {plan
            ? "Your saved weekly plan is ready."
            : "Complete your profile on the web to build your first personalized plan."}
        </Copy>
        {plan ? (
          <Action label="Open my week" onPress={() => router.push("/plan")} />
        ) : (
          <Action
            label="Set up my profile"
            onPress={() => {
              void Linking.openURL(origin + "/onboarding");
            }}
          />
        )}
      </Card>
      {!!error && <Copy>{error}</Copy>}
      <Link href="/plan">View weekly plan</Link>
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
            .catch((e) => setError(e.message));
        }}
      />
    </Page>
  );
}
