import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createAuthClient } from "better-auth/react";

const state = vi.hoisted(() => ({
  client: null as ReturnType<typeof createAuthClient> | null,
  navigate: (_path: string) => {},
  openURL: vi.fn().mockResolvedValue(undefined),
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
  Linking: { openURL: (...args: unknown[]) => state.openURL(...args) },
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
    signUp: {
      email: (...args: Parameters<ReturnType<typeof createAuthClient>["signUp"]["email"]>) =>
        state.client!.signUp.email(...args),
    },
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
import SignIn from "../../apps/mobile/src/app/sign-in";

afterEach(cleanup);

it("explains verification after account creation without a session", async () => {
  state.navigate = vi.fn();
  let created = false;
  const user = {
    id: "owner",
    name: "NativeAlpha",
    email: "synthetic@example.invalid",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: {
      customFetchImpl: async (url) => {
        if (String(url).endsWith("/get-session")) return Response.json(null);
        if (String(url).endsWith("/sign-up/email")) {
          created = true;
          return Response.json({ user, token: null });
        }
        throw new Error("Unexpected endpoint");
      },
    },
  });
  render(<SignIn />);
  fireEvent.click(screen.getByRole("button", { name: "Create a new account" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: user.name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText("Password · at least 12 characters"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() => expect(created).toBe(true));
  await screen.findByText(/Check your email for a verification link/);
  expect(screen.getByLabelText("Password · at least 12 characters")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  expect(state.navigate).not.toHaveBeenCalled();
  expect(screen.queryByText(/check your email|verify your email/i)).toBeInTheDocument();
});

it("opens the existing recovery page without putting credentials in the URL", async () => {
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: { customFetchImpl: async () => Response.json(null) },
  });
  state.openURL.mockReset().mockResolvedValue(undefined);
  render(<SignIn />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.change(screen.getByLabelText("Password · at least 12 characters"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Forgot password? Open recovery on the web" })
  );
  expect(state.openURL).toHaveBeenCalledExactlyOnceWith(
    "https://limit-preview.limit-dylanlasensky.workers.dev/forgot-password"
  );
});
it("reports a recovery browser failure without erasing the form", async () => {
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: { customFetchImpl: async () => Response.json(null) },
  });
  state.openURL.mockReset().mockRejectedValue(new Error("private OS error"));
  render(<SignIn />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Forgot password? Open recovery on the web" })
  );
  expect(
    await screen.findByText("Could not open password recovery. Try again.")
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("synthetic@example.invalid");
});
it("explains a fresh verification link without claiming successful sign-in", async () => {
  state.navigate = vi.fn();
  state.client = createAuthClient({
    baseURL: "https://example.test",
    fetchOptions: {
      customFetchImpl: async (url) =>
        String(url).endsWith("/get-session")
          ? Response.json(null)
          : Response.json(
              { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" },
              { status: 403 }
            ),
    },
  });
  render(<SignIn />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.change(screen.getByLabelText("Password · at least 12 characters"), {
    target: { value: "synthetic-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText(/Signing in again requests a fresh link/)).toBeInTheDocument();
  expect(state.navigate).not.toHaveBeenCalled();
});
