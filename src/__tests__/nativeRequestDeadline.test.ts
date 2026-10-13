import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
const state = vi.hoisted(() => ({ cookie: vi.fn() }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-secure-store", () => ({}));
vi.mock("../../apps/mobile/node_modules/expo-secure-store", () => ({}));
vi.mock("@better-auth/expo/client", () => ({ expoClient: () => ({ id: "native-test" }) }));
vi.mock("better-auth/react", () => ({ createAuthClient: () => ({ getCookie: state.cookie }) }));
import { request, update } from "../../apps/mobile/src/lib/api";
import { RequestDeadlineError } from "../../packages/domain/requestDeadline";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
for (const method of ["read", "update"])
  it("bounds a stalled native " + method + " request without retry", async () => {
    vi.useFakeTimers();
    state.cookie.mockResolvedValue("synthetic-cookie");
    let signal!: AbortSignal;
    const fetcher = vi.fn((_url: unknown, init: RequestInit) => {
      signal = init.signal!;
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal("fetch", fetcher);
    const outcome = (
      method === "read"
        ? request("/synthetic", z.object({ ok: z.boolean() }))
        : update("UserProfile", "synthetic", { goal: "strength" })
    ).catch((error) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await outcome).toBeInstanceOf(RequestDeadlineError);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(signal.aborted).toBe(true);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: "omit",
      headers: { Cookie: "synthetic-cookie" },
    });
  });
for (const method of ["read", "update"])
  it(
    "does not start a late native " + method + " transport after storage exceeds the deadline",
    async () => {
      vi.useFakeTimers();
      let finishStorage!: (value: string) => void;
      state.cookie.mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            finishStorage = resolve;
          })
      );
      const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      vi.stubGlobal("fetch", fetcher);
      const outcome = (
        method === "read"
          ? request("/synthetic", z.object({ ok: z.boolean() }))
          : update("UserProfile", "synthetic", { goal: "strength" })
      ).catch((error) => error);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await outcome).toBeInstanceOf(RequestDeadlineError);
      finishStorage("synthetic-cookie");
      await vi.advanceTimersByTimeAsync(1);
      expect(fetcher).not.toHaveBeenCalled();
    }
  );
