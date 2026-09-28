import { useState } from "react";
import { router } from "expo-router";
import { auth } from "../lib/api";
import { Page, Title, Copy, Input, Action } from "../ui";
export default function SignIn() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = signup
        ? await auth.signUp.email({ email, password, name })
        : await auth.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message);
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Title>{signup ? "Make your first move." : "Welcome back."}</Title>
      <Copy>Your plan, one session at a time.</Copy>
      {signup && <Input label="Name" value={name} onChangeText={setName} />}
      <Input label="Email" value={email} onChangeText={setEmail} />
      <Input
        label="Password · at least 12 characters"
        secret
        value={password}
        onChangeText={setPassword}
      />
      {!!error && <Copy>{error}</Copy>}
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
