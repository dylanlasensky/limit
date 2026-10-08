import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareEasCandidate } from "../../scripts/prepare-eas-candidate.mjs";

const origin = "https://limit.limit-dylanlasensky.workers.dev";
const base = {
  build: { production: { env: { LIMIT_NATIVE_RELEASE: "true", EXPO_PUBLIC_API_URL: origin } } },
};
const env = {
  EXPO_PUBLIC_API_URL: origin,
  LIMIT_SOURCE_REVISION: "a".repeat(40),
  LIMIT_BUNDLE_IDENTIFIER: "com.limit.fitness",
  LIMIT_APPLE_TEAM_ID: "ABCDEFGHIJ",
  LIMIT_NATIVE_BUILD: "42",
  LIMIT_EAS_PROJECT_ID: "11111111-1111-4111-8111-111111111111",
  LIMIT_ASC_APP_ID: "1234567890",
};

test("puts every candidate value in the remote EAS build profile and targets the owned ASC app", () => {
  const prepared = prepareEasCandidate(base, env);
  for (const name of [
    "LIMIT_SOURCE_REVISION",
    "LIMIT_BUNDLE_IDENTIFIER",
    "LIMIT_APPLE_TEAM_ID",
    "LIMIT_NATIVE_BUILD",
    "LIMIT_EAS_PROJECT_ID",
  ])
    assert.equal(prepared.build.production.env[name], env[name]);
  assert.equal(prepared.submit.production.ios.ascAppId, env.LIMIT_ASC_APP_ID);
  assert.equal(prepared.build.production.env.EXPO_PUBLIC_API_URL, origin);
  assert.equal(base.build.production.env.LIMIT_SOURCE_REVISION, undefined);
});

test("rejects missing ASC target and preview origin", () => {
  assert.throws(
    () => prepareEasCandidate(base, { ...env, LIMIT_ASC_APP_ID: "" }),
    /LIMIT_ASC_APP_ID/
  );
  assert.throws(
    () =>
      prepareEasCandidate(base, {
        ...env,
        EXPO_PUBLIC_API_URL: "https://limit-preview.limit-dylanlasensky.workers.dev",
      }),
    /approved API origin/
  );
});
