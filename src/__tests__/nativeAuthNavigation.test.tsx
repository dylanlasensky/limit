import React, { useEffect, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createAuthClient } from "better-auth/react";

const state = vi.hoisted(() => ({
  client: null as ReturnType<typeof createAuthClient> | null,
  navigate: (_path: string) => {},
}));
vi.mock("expo-router", () => ({
  router: { replace: (path: string) => state.navigate(path), push: vi.fn() },
  Redirect: ({ href }: { href: string }) => {
    useEffect(() => state.navigate(href), [href]);
    return null;
  },
  useFocusEffect: () => {},
  Link: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));
vi.mock("react-native", () => ({
  Text: ({ children, testID }: React.PropsWithChildren<{ testID?: string }>) => (
    <span data-testid={testID}>{children}</span>
  ),
  View: ({ children, testID }: React.PropsWithChildren<{ testID?: string }>) => (
    <div data-testid={testID}>{children}</div>
  ),
}));
vi.mock("../../apps/mobile/src/lib/drafts", () => ({ clearDrafts: vi.fn() }));
vi.mock("../../apps/mobile/src/lib/api", () => ({
  origin: "https://limit-preview.limit-dylanlasensky.workers.dev",
  auth: {
    useSession: () => state.client!.useSession(),
    signIn: {
      email: (...args: Parameters<ReturnType<typeof createAuthClient>["signIn"]["email"]>) =>
        state.client!.signIn.email(...args),
    },
    signUp: { email: vi.fn() },
  },
  list: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../apps/mobile/src/ui", () => ({
  Page: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Title: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  Copy: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  Input: ({
    label,
    value,
    secret,
    onChangeText,
  }: {
    label: string;
    value: string;
    secret?: boolean;
    onChangeText: (value: string) => void;
  }) => (
    <input
      aria-label={label}
      type={secret ? "password" : "text"}
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
    />
  ),
  Action: ({
    label,
    disabled,
    onPress,
  }: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {label}
    </button>
  ),
  styles: { text: {} },
}));
import Home from "../../apps/mobile/src/app/index";
import SignIn from "../../apps/mobile/src/app/sign-in";

function App() {
  const [path, setPath] = useState("/");
  state.navigate = setPath;
  return path === "/sign-in" ? <SignIn /> : <Home />;
}
afterEach(cleanup);

it("reaches the dashboard when session hydration completes after sign-in returns", async () => {
  let authenticated = false;
  let finishSession!: () => void;
  const sessionReady = new Promise<void>((resolve) => {
    finishSession = resolve;
  });
  const user = {
    id: "owner",
    name: "NativeAlpha",
    email: "synthetic@example.invalid",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const fetcher = vi.fn(async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/sign-in/email")) {
      authenticated = true;
      return Response.json({ user, token: "synthetic-test-token", redirect: false });
    }
    if (path.endsWith("/get-session")) {
      if (!authenticated) return Response.json(null);
      await sessionReady;
      return Response.json({
        user,
        session: { id: "session", userId: user.id, expiresAt: new Date(Date.now() + 60000) },
      });
    }
    throw new Error("Unexpected test endpoint");
  });
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: { customFetchImpl: fetcher },
  });
  render(<App />);
  await screen.findByText("Welcome back.");
  // Match a person entering credentials after the previous guard unsubscribes.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText("Password · at least 12 characters"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
  await waitFor(() => expect(authenticated).toBe(true));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
    finishSession();
  });
  expect(await screen.findByText("Hi, NativeAlpha.")).toBeInTheDocument();
});

it("keeps rejected credentials on sign-in and never opens the dashboard", async () => {
  const destinations: string[] = [];
  state.navigate = (path) => {
    destinations.push(path);
  };
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: {
      customFetchImpl: async (url) => {
        if (String(url).endsWith("/get-session")) return Response.json(null);
        if (String(url).endsWith("/sign-in/email"))
          return Response.json(
            { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
            { status: 401 }
          );
        throw new Error("Unexpected test endpoint");
      },
    },
  });
  render(<SignIn />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.change(screen.getByLabelText("Password · at least 12 characters"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
  expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  expect(screen.getByTestId("auth-context-preview-http-4xx")).toBeInTheDocument();
  expect(screen.getByTestId("auth-error")).toBeInTheDocument();
  expect(destinations).toEqual([]);
  expect(screen.getByLabelText("Password · at least 12 characters")).toHaveAttribute(
    "type",
    "password"
  );
  expect(screen.getByRole("button", { name: /^Sign in$/ })).toBeEnabled();
});

it("distinguishes an attempted request without a response from an HTTP rejection", async () => {
  const destinations: string[] = [];
  state.navigate = (path) => {
    destinations.push(path);
  };
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: {
      customFetchImpl: async (url) => {
        if (String(url).endsWith("/get-session")) return Response.json(null);
        throw new TypeError("Network request failed");
      },
    },
  });
  render(<SignIn />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.change(screen.getByLabelText("Password · at least 12 characters"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
  expect(await screen.findByText("Network request failed")).toBeInTheDocument();
  expect(screen.getByTestId("auth-context-preview-attempted")).toBeInTheDocument();
  expect(destinations).toEqual([]);
});

it("shows a useful error when an auth response has no message", async () => {
  state.navigate = vi.fn();
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: {
      customFetchImpl: async (url) =>
        String(url).endsWith("/get-session")
          ? Response.json(null)
          : Response.json({ code: "UNKNOWN_AUTH_FAILURE" }, { status: 400 }),
    },
  });
  render(<SignIn />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.change(screen.getByLabelText("Password · at least 12 characters"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
  expect(await screen.findByText("Could not sign in. Please try again.")).toBeInTheDocument();
  expect(state.navigate).not.toHaveBeenCalled();
});
