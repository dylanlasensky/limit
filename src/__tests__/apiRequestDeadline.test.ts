import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, ApiError } from "../api/client";
import { RequestDeadlineError } from "../../packages/domain/requestDeadline";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("rejects a stalled fetch and aborts its transport without retry", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(() => new Promise<Response>(() => {}));
  vi.stubGlobal("fetch", fetcher);
  const result = apiRequest("/synthetic", z.object({ ok: z.boolean() })).catch((error) => error);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await result).toBeInstanceOf(RequestDeadlineError);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].signal?.aborted).toBe(true);
});

it("keeps a mutation timed out even if its response body arrives late", async () => {
  vi.useFakeTimers();
  let completeBody!: (value: unknown) => void;
  let signal!: AbortSignal;
  const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => {
    signal = init.signal!;
    return {
      ok: true,
      json: () =>
        new Promise((resolve) => {
          completeBody = resolve;
        }),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  const accepted = vi.fn();
  const rejected = vi.fn();
  const result = apiRequest("/synthetic-save", z.object({ ok: z.boolean() }), {
    method: "POST",
    body: JSON.stringify({ operationId: "same-operation" }),
  }).then(accepted, rejected);
  await vi.advanceTimersByTimeAsync(30_000);
  await result;
  expect(rejected).toHaveBeenCalledExactlyOnceWith(expect.any(RequestDeadlineError));
  expect(signal.aborted).toBe(true);
  completeBody({ ok: true });
  await vi.advanceTimersByTimeAsync(30_000);
  expect(accepted).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("preserves server errors and response validation", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: "Synthetic conflict" }, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ wrong: true }));
  vi.stubGlobal("fetch", fetcher);
  await expect(apiRequest("/synthetic", z.object({ ok: z.boolean() }))).rejects.toMatchObject({
    status: 409,
    message: "Synthetic conflict",
  });
  await expect(apiRequest("/synthetic", z.object({ ok: z.boolean() }))).rejects.toBeInstanceOf(
    ApiError
  );
  expect(vi.getTimerCount()).toBe(0);
});
