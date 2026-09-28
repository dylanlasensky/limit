# Expo development

The Expo 57 application is in `apps/mobile`. npm workspaces share `packages/contracts`, `packages/domain` and `packages/design`. Web and native use React 19.2. Better Auth's Expo adapter keeps sessions in SecureStore; native API calls attach the secure cookie to the same Worker API. Private workout drafts use owner-scoped SQLite storage and are erased on logout. Never place server secrets in the app.

From the repository root:

```
npm ci
npm run lint --workspace limit-mobile
npm run typecheck --workspace limit-mobile
cd apps/mobile
EXPO_PUBLIC_API_URL=https://limit-preview.limit-dylanlasensky.workers.dev npx expo start --dev-client
```

The shell includes signup/login, navigation, dashboard, weekly plan, focused workout logging, pause/rest state, offline drafts, revision-aware synchronization and workout completion. Profile setup opens the web app. Expo Router controls navigation. Every exercise displays catalog setup instructions while approved videos are being produced.

For a free local development build, install Xcode (iOS) or Android Studio and run `npx expo run:ios` or `npx expo run:android`. Native folders are generated from app.json; do not maintain a separate Swift app. iOS device signing requires an owned signing identity; configure your unique bundle/application IDs before distribution.

`eas.json` contains development, preview and production profiles for future use. Do not start a paid EAS build or exceed a free build allowance. No cloud builds, developer subscriptions or store fees were purchased for this work. Both native JavaScript bundles are checked locally/CI with `npx expo export --platform ios --platform android`.

Physical-device keyboard, background/resume, VoiceOver/TalkBack, offline closure and reset-link tests remain prerequisites for a store release. Shared schemas and domain functions are ready for additional native nutrition, progress, health integrations and exercise video playback. Native Swift is reserved for a demonstrated Apple-only need unsupported by Expo.

The root postinstall script normalizes query-string's CommonJS decoder import after upgrading its vulnerable transitive decoder to the maintained ESM release. It fails visibly if that import changes. Reevaluate and remove this compatibility patch when Expo Router updates its dependency. The patched parser and native bundles are verified; the lockfile audit is clean.
