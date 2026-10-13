import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Linking } from "react-native";
import { auth, origin, request } from "../lib/api";
import { clearDrafts } from "../lib/drafts";
import { Page, Title, Copy, Card, Action } from "../ui";
import { functionResponseSchema } from "../../../../packages/contracts/functions";

export default function Account() {
  const { data: session, isPending } = auth.useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!session && !isPending) return <Redirect href="/sign-in" />;

  const deleteAccount = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await request(
        "/functions/deleteAccount",
        functionResponseSchema("deleteAccount", { confirm: true }),
        { confirm: true }
      );
      if (!result.success || !result.deleted) throw new Error("Account deletion did not finish.");
      try {
        clearDrafts(session.user.id);
      } catch {
        // The server has already deleted the account; local cleanup is best effort.
      }
      await auth.signOut().catch(() => undefined);
      router.replace("/sign-in");
    } catch (cause) {
      setError((cause as Error).message || "Account deletion failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Title>Your account</Title>
      <Copy>{session?.user.email || "Loading your account…"}</Copy>
      <Card>
        <Title>Privacy and support</Title>
        <Action
          label="Privacy information"
          onPress={() => void Linking.openURL(origin + "/privacy")}
        />
        <Action
          label="Help and support"
          onPress={() => void Linking.openURL(origin + "/support")}
        />
      </Card>
      <Card>
        <Title>Delete account</Title>
        <Copy>
          Deleting your LIMIT account permanently removes your profile, workouts, food logs and
          private uploads. This cannot be undone. Export anything you want to keep first.
        </Copy>
        <Action
          label="Export my data on the web"
          onPress={() => void Linking.openURL(origin + "/profile#account")}
        />
        <Copy>The web page may ask you to sign in again.</Copy>
        {!confirming ? (
          <Action label="Review account deletion" onPress={() => setConfirming(true)} />
        ) : (
          <>
            <Copy>Are you sure? Deleting the app alone does not delete your account.</Copy>
            <Action
              label={busy ? "Deleting account…" : "Permanently delete account"}
              onPress={() => void deleteAccount()}
              disabled={busy}
            />
            <Action label="Keep my account" onPress={() => setConfirming(false)} disabled={busy} />
          </>
        )}
        {!!error && <Copy>{error}</Copy>}
      </Card>
    </Page>
  );
}
