import { emailConfigured, sendAuthEmail } from "./email";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { ApiError } from "./errors";
export function authFor(env: Env) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new ApiError("Account service is not configured.", 503, "AUTH_NOT_CONFIGURED");
  const emailEnabled = emailConfigured(env);
  const send = (to: string, subject: string, url: string) => sendAuthEmail(env, to, subject, url);
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_ORIGIN,
    trustedOrigins: [
      env.APP_ORIGIN,
      "limit://",
      ...(env.ENVIRONMENT === "local" ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []),
    ],
    plugins: [expo()],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: emailEnabled,
      sendResetPassword: async ({ user, url }) =>
        send(user.email, "Reset your LIMIT password", url),
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: emailEnabled,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        send(user.email, "Verify your LIMIT email", url),
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: env.ENVIRONMENT !== "local",
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    logger: { disabled: true },
  });
}
