import { ApiError } from "./errors";
export type EmailEnv = {
  EMAIL_ENABLED: string;
  EMAIL_FROM: string;
  RESEND_API_KEY: string;
  APP_ORIGIN: string;
  ACCOUNT_COORDINATOR: { getByName(name: string): { reserveEmail(): Promise<boolean> } };
};
export function emailConfigured(env: EmailEnv) {
  return env.EMAIL_ENABLED === "true" && !!env.RESEND_API_KEY && !!env.EMAIL_FROM;
}
export async function sendAuthEmail(env: EmailEnv, to: string, subject: string, link: string) {
  if (!emailConfigured(env))
    throw new ApiError("Email delivery is not configured.", 503, "EMAIL_NOT_CONFIGURED");
  const url = new URL(link);
  if (
    url.origin !== new URL(env.APP_ORIGIN).origin ||
    !url.pathname.startsWith("/api/auth/") ||
    /[\r\n]/.test(to + env.EMAIL_FROM)
  )
    throw new ApiError("Invalid email request.", 400);
  const allowed = await env.ACCOUNT_COORDINATOR.getByName("system-email-budget").reserveEmail();
  if (!allowed)
    throw new ApiError(
      "Email delivery has reached its free allowance. Try again later.",
      503,
      "FREE_LIMIT_REACHED"
    );
  const escaped = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
    );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(to + subject + link)
  );
  const id = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "auth-" + id,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject,
        text: `LIMIT\n\n${subject}\n\n${link}\n\nThis link is personal. If you did not request it, ignore this email.`,
        html: `<main style="font-family:system-ui;max-width:560px;margin:24px auto"><h1>LIMIT</h1><h2>${escaped(subject)}</h2><p><a href="${escaped(link)}">${escaped(subject)}</a></p><p>This link is personal. If you did not request it, ignore this email.</p></main>`,
      }),
    });
  } catch {
    throw new ApiError(
      "Email is temporarily unavailable. Please retry later.",
      503,
      "EMAIL_UNAVAILABLE"
    );
  }
  if (!response.ok)
    throw new ApiError(
      "Email is temporarily unavailable. Please retry later.",
      503,
      "EMAIL_UNAVAILABLE"
    );
}
