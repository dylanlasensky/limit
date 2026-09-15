// Business-owned policy/contact URLs are configuration, never invented app copy.
export function validatedPublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname.includes(".") ||
      /^(localhost|127\.|0\.|\[)/.test(url.hostname) ||
      /\.(local|invalid|example|test)$/.test(url.hostname) ||
      /(^|\.)example\.(com|org|net)$/.test(url.hostname)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export const publicInfo = {
  privacyUrl: validatedPublicUrl(import.meta.env.VITE_LIMIT_PRIVACY_URL),
  termsUrl: validatedPublicUrl(import.meta.env.VITE_LIMIT_TERMS_URL),
  supportUrl: validatedPublicUrl(import.meta.env.VITE_LIMIT_SUPPORT_URL),
};
