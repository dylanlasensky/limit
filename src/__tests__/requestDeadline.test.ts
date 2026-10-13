import { afterEach, expect, it, vi } from "vitest";
import { RequestDeadlineError, withRequestDeadline } from "../../packages/domain/requestDeadline";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("aborts a stalled request and does not retry it", async () => {
  vi.useFakeTimers();
  let signal!: AbortSignal;
  const run = vi.fn((s: AbortSignal) => {
    signal = s;
    return new Promise(() => {});
  });
  const result = withRequestDeadline(run).catch((e) => e);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await result).toBeInstanceOf(RequestDeadlineError);
  expect(signal.aborted).toBe(true);
  expect(run).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("includes a stalled response body in the same deadline", async () => {
  vi.useFakeTimers();
  const result = withRequestDeadline(async () => {
    const response = { json: () => new Promise(() => {}) };
    return response.json();
  }).catch((e) => e);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await result).toBeInstanceOf(RequestDeadlineError);
  expect(vi.getTimerCount()).toBe(0);
});
it("cleans the timer after success or immediate failure", async () => {
  vi.useFakeTimers();
  expect(await withRequestDeadline(async () => 42)).toBe(42);
  expect(vi.getTimerCount()).toBe(0);
  const original = new Error("server failure");
  await expect(
    withRequestDeadline(async () => {
      throw original;
    })
  ).rejects.toBe(original);
  expect(vi.getTimerCount()).toBe(0);
});
it("forwards cancellation without waiting for a transport that ignores abort", async () => {
  vi.useFakeTimers();
  const parent = new AbortController();
  let signal!: AbortSignal;
  const result = withRequestDeadline(async (s) => {
    signal = s;
    return new Promise(() => {});
  }, parent.signal).catch((e) => e);
  await vi.advanceTimersByTimeAsync(1);
  const reason = new Error("cancelled route");
  parent.abort(reason);
  expect(await result).toBe(reason);
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("does not start a request that is already cancelled", async () => {
  const parent = new AbortController();
  parent.abort();
  const run = vi.fn();
  await expect(withRequestDeadline(run, parent.signal)).rejects.toBe(parent.signal.reason);
  expect(run).not.toHaveBeenCalled();
});

it("does not start transport when cancellation arrives before its first microtask", async () => {
  const parent = new AbortController();
  const run = vi.fn();
  const result = withRequestDeadline(run, parent.signal).catch((e) => e);
  parent.abort();
  expect(await result).toBe(parent.signal.reason);
  expect(run).not.toHaveBeenCalled();
});
it("removes the parent listener after success", async () => {
  const parent = new AbortController();
  let signal!: AbortSignal;
  expect(
    await withRequestDeadline(async (s) => {
      signal = s;
      return 1;
    }, parent.signal)
  ).toBe(1);
  parent.abort();
  expect(signal.aborted).toBe(false);
});
