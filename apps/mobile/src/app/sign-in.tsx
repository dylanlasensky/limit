import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { auth, origin } from "../lib/api";
import { Page, Title, Copy, Input, Action, styles } from "../ui";
export default function SignIn() {
  const { data: session, isPending } = auth.useSession();
  useEffect(() => {
    if (session && !isPending) router.replace("/");
  }, [session, isPending]);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState("idle");
  const destination =
    origin === "https://limit-preview.limit-dylanlasensky.workers.dev"
      ? "preview"
      : origin === "https://limit.limit-dylanlasensky.workers.dev"
        ? "production"
        : "other";
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const fallback = signup
      ? "Could not create your account. Please try again."
      : "Could not sign in. Please try again.";
    const observation = {
      onRequest: () => {
        setRequestStatus("attempted");
      },
      onResponse: ({ response }: { response: Response }) => {
        const group = Math.floor(response.status / 100);
        setRequestStatus(group >= 1 && group <= 5 ? `http-${group}xx` : "http-other");
      },
    };
    try {
      const result = signup
        ? await auth.signUp.email({ email, password, name }, observation)
        : await auth.signIn.email({ email, password }, observation);
      if (result.error) throw new Error(result.error.message || fallback);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <View testID={`auth-context-${destination}-${requestStatus}`}>
        <Title>{signup ? "Make your first move." : "Welcome back."}</Title>
      </View>
      <Copy>Your plan, one session at a time.</Copy>
      {signup && <Input label="Name" value={name} onChangeText={setName} />}
      <Input label="Email" value={email} onChangeText={setEmail} />
      <Input
        label="Password · at least 12 characters"
        secret
        value={password}
        onChangeText={setPassword}
      />
      {!!error && (
        <Text testID="auth-error" accessibilityRole="alert" style={styles.text}>
          {error}
        </Text>
      )}
      <Action
        label={busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
        onPress={submit}
        disabled={busy || !email || password.length < 12 || (signup && !name)}
      />
      <Action
        label={signup ? "I already have an account" : "Create a new account"}
        onPress={() => setSignup(!signup)}
      />
    </Page>
  );
}
