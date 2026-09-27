# Expo path

The native foundation uses the same Worker origin and Zod contracts. Better Auth's Expo client stores cookies in SecureStore; native API calls explicitly attach those cookies. Domain logic stays in `packages/domain`. The approved logo and common tokens are shared with web.

Development builds require Expo/EAS and owned iOS/Android signing identities. Set EXPO_PUBLIC_API_URL to the preview HTTPS origin. Never embed server secrets. Use local development builds for secure storage, lifecycle and offline tests before TestFlight or Play internal testing. Add native Swift only for an actual Apple-only capability unsupported by Expo.

Native release still requires physical-device keyboard, background/resume, accessibility, network interruption and account recovery testing, plus approved policy/support pages. See `release/app-store.json` for the evidence ledger; unverified entries must stay unverified.
