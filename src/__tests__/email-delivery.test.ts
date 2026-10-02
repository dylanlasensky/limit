// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAuthEmail, type EmailEnv } from "../../worker/email";
import { reserveEmailBudget } from "../../packages/domain/emailBudget";
const reservation = vi.fn(async () => true);
const env = {
  EMAIL_ENABLED: "true",
  EMAIL_FROM: "LIMIT <accounts@mail.example.org>",
  RESEND_API_KEY: "test-only",
  APP_ORIGIN: "https://limit.example.org",
  ACCOUNT_COORDINATOR: { getByName: () => ({ reserveEmail: reservation }) },
} as unknown as EmailEnv;
afterEach(() => {
  vi.unstubAllGlobals();
  reservation.mockResolvedValue(true);
});
describe("transactional email boundary", () => {
  it("requires complete configuration without making requests", async () => {
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    await expect(
      sendAuthEmail(
        { ...env, RESEND_API_KEY: "" },
        "test@example.org",
        "Verify",
        "https://limit.example.org/api/auth/verify-email?token=private"
      )
    ).rejects.toThrow("not configured");
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects foreign links and header injection", async () => {
    await expect(
      sendAuthEmail(env, "test@example.org", "Verify", "https://attacker.example/api/auth/reset")
    ).rejects.toThrow("Invalid");
    await expect(
      sendAuthEmail(
        env,
        "test@example.org\r\nBcc:other@example.org",
        "Verify",
        "https://limit.example.org/api/auth/reset"
      )
    ).rejects.toThrow("Invalid");
  });
  it("sends escaped content and stable opaque retry key", async () => {
    const send = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", send);
    const link =
      "https://limit.example.org/api/auth/reset-password/token?callbackURL=%2Freset-password";
    await sendAuthEmail(env, "test@example.org", "Reset your LIMIT password", link);
    await sendAuthEmail(env, "test@example.org", "Reset your LIMIT password", link);
    const request = send.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(request[1].body));
    expect(body.text).toContain(link);
    expect(body.html).toContain("LIMIT");
    expect(request[1].headers).toEqual(
      (send.mock.calls[1] as unknown as [string, RequestInit])[1].headers
    );
  });
  it.each([429, 500])("fails visibly on provider status %s", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status }))
    );
    await expect(
      sendAuthEmail(
        env,
        "test@example.org",
        "Verify",
        "https://limit.example.org/api/auth/verify-email"
      )
    ).rejects.toThrow("temporarily unavailable");
  });
  it("fails closed at the app budget", async () => {
    reservation.mockResolvedValue(false);
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    await expect(
      sendAuthEmail(
        env,
        "test@example.org",
        "Verify",
        "https://limit.example.org/api/auth/verify-email"
      )
    ).rejects.toThrow("free allowance");
    expect(send).not.toHaveBeenCalled();
  });
  it("resets days separately from monthly quota", () => {
    const previous = { day: "2026-10-01", month: "2026-10", daily: 25, monthly: 499 };
    expect(reserveEmailBudget(previous, new Date("2026-10-01"))).toBeNull();
    expect(reserveEmailBudget(previous, new Date("2026-10-02"))?.monthly).toBe(500);
    expect(reserveEmailBudget({ ...previous, monthly: 500 }, new Date("2026-10-02"))).toBeNull();
    expect(reserveEmailBudget(previous, new Date("2026-11-01"))?.monthly).toBe(1);
  });
});
