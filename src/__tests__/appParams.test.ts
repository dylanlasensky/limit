import { afterEach, describe, it, expect, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { z } from "zod";
afterEach(() => vi.unstubAllGlobals());
describe("trusted API boundary", () => {
  it("uses only the same origin even when a link supplies host overrides", async () => {
    window.history.replaceState({}, "", "/?app_base_url=https://untrusted.invalid");
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await apiRequest("/health", z.object({ ok: z.boolean() }));
    expect(fetch.mock.calls[0][0]).toBe("/api/health");
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
  });
  it("rejects malformed successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"ok":"yes"}')));
    await expect(apiRequest("/health", z.object({ ok: z.boolean() }))).rejects.toThrow(
      "invalid response"
    );
  });
  it("retains a useful error status for retry and authorization handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"error":"Sign in"}', { status: 401 }))
    );
    await expect(apiRequest("/me", z.unknown())).rejects.toMatchObject({ status: 401 });
  });
});
