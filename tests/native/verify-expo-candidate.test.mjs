import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyExpoCandidate } from "../../scripts/verify-expo-candidate.mjs";

const env = {
  LIMIT_BUNDLE_IDENTIFIER: "com.limit.fitness",
  LIMIT_APPLE_TEAM_ID: "ABCDEFGHIJ",
  LIMIT_NATIVE_BUILD: "42",
  LIMIT_SOURCE_REVISION: "a".repeat(40),
  LIMIT_EAS_PROJECT_ID: "11111111-1111-4111-8111-111111111111",
};
const config = {
  ios: {
    bundleIdentifier: env.LIMIT_BUNDLE_IDENTIFIER,
    appleTeamId: env.LIMIT_APPLE_TEAM_ID,
    buildNumber: env.LIMIT_NATIVE_BUILD,
  },
  extra: {
    sourceRevision: env.LIMIT_SOURCE_REVISION,
    eas: { projectId: env.LIMIT_EAS_PROJECT_ID },
  },
};
test("accepts exact Expo release metadata", () =>
  assert.equal(verifyExpoCandidate(config, env), true));
test("rejects a remote project mismatch", () =>
  assert.throws(() => verifyExpoCandidate(config, { ...env, LIMIT_EAS_PROJECT_ID: "other" })));
