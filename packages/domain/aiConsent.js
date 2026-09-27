// Keep the recipient disclosure tied to an explicit model, not the app's mutable default.
export const AI_CONSENT_VERSION = "cloudflare-ai-v1";
export const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export function requireAiConsent(input) {
  if (input?.aiConsent !== AI_CONSENT_VERSION)
    throw Object.assign(new Error("Allow AI data sharing before using this optional feature."), {
      status: 403,
    });
}
