import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { limitApi } from "@/api/client";
export default function Register() {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [verify, setVerify] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await limitApi.auth.register({ name, email, password });
      if (result?.token) window.location.assign("/onboarding");
      else setVerify(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout
      icon={UserPlus}
      title="Your next chapter starts here"
      subtitle="Build a routine that fits your life."
    >
      {verify ? (
        <p role="status">
          Check your email for a verification link, then return to{" "}
          <Link className="underline" to="/login">
            sign in
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <label className="block">
            Your name
            <input
              className="mt-2 h-12 w-full rounded-xl border bg-secondary px-4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
              required
            />
          </label>
          <label className="block">
            Email
            <input
              className="mt-2 h-12 w-full rounded-xl border bg-secondary px-4"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            Password
            <input
              className="mt-2 h-12 w-full rounded-xl border bg-secondary px-4"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <span className="mt-2 block text-xs text-muted-foreground">
              Use at least 12 characters.
            </span>
          </label>
          <button disabled={busy} className="limit-button h-12 w-full rounded-xl font-bold">
            {busy ? "Creating your account…" : "Create account"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
