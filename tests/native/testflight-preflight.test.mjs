import assert from "node:assert/strict";
import { test } from "node:test";
import { checkTestFlightCandidate } from "../../scripts/native-testflight-preflight.mjs";

const sha = "a".repeat(40);
const origin = "https://limit.limit-dylanlasensky.workers.dev";
const candidate = () => ({
  env: {
    LIMIT_SOURCE_REVISION: sha,
    LIMIT_NATIVE_RELEASE: "true",
    EXPO_PUBLIC_API_URL: origin,
    LIMIT_BUNDLE_IDENTIFIER: "com.limit.fitness",
    LIMIT_APPLE_TEAM_ID: "ABCDEFGHIJ",
    LIMIT_NATIVE_BUILD: "42",
    EXPO_TOKEN: "present",
    LIMIT_EAS_PROJECT_ID: "11111111-1111-4111-8111-111111111111",
  },
  head: sha,
  main: sha,
  clean: true,
  easConfig: {
    build: { production: { env: { LIMIT_NATIVE_RELEASE: "true", EXPO_PUBLIC_API_URL: origin } } },
  },
  nodeForgePresent: false,
});

test("accepts a clean, exact production release candidate", () => {
  assert.equal(checkTestFlightCandidate(candidate()), true);
});

for (const [name, change] of [
  [
    "stale main",
    (x) => {
      x.main = "b".repeat(40);
    },
  ],
  [
    "dirty checkout",
    (x) => {
      x.clean = false;
    },
  ],
  [
    "preview origin",
    (x) => {
      x.env.EXPO_PUBLIC_API_URL = "https://limit-preview.limit-dylanlasensky.workers.dev";
    },
  ],
  [
    "missing Expo access",
    (x) => {
      x.env.EXPO_TOKEN = "";
    },
  ],
  [
    "unowned bundle",
    (x) => {
      x.env.LIMIT_BUNDLE_IDENTIFIER = "com.example.limit";
    },
  ],
  [
    "node-forge present",
    (x) => {
      x.nodeForgePresent = true;
    },
  ],
]) {
  test(`rejects ${name}`, () => {
    const input = candidate();
    change(input);
    assert.throws(() => checkTestFlightCandidate(input), /TestFlight preflight/);
  });
}
