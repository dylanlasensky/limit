import assert from "node:assert/strict";
import { test } from "node:test";
import { checkNativeReleaseEvidence } from "../../scripts/check-native-release-evidence.mjs";

const revision = "a".repeat(40);
const candidate = () => ({
  revision,
  health: {
    status: "ok",
    environment: "production",
    sourceRevision: revision,
    version: "deployed-version-id",
  },
  nativeCheckName: "native-compile-launch",
  apiCheckName: "prior-client-compatibility",
  checkRuns: ["native-compile-launch", "prior-client-compatibility"].map((name) => ({
    name,
    head_sha: revision,
    status: "completed",
    conclusion: "success",
  })),
});

test("accepts exact source deployed API and both successful evidence checks", () => {
  assert.equal(checkNativeReleaseEvidence(candidate()), true);
});
for (const [name, change] of [
  [
    "stale deployed source",
    (x) => {
      x.health.sourceRevision = "b".repeat(40);
    },
  ],
  [
    "preview API",
    (x) => {
      x.health.environment = "preview";
    },
  ],
  [
    "local deployment version",
    (x) => {
      x.health.version = "local";
    },
  ],
  [
    "missing unsigned launch",
    (x) => {
      x.checkRuns.shift();
    },
  ],
  [
    "failed compatibility",
    (x) => {
      x.checkRuns[1].conclusion = "failure";
    },
  ],
  [
    "stale check SHA",
    (x) => {
      x.checkRuns[0].head_sha = "b".repeat(40);
    },
  ],
]) {
  test(`rejects ${name}`, () => {
    const input = candidate();
    change(input);
    assert.throws(() => checkNativeReleaseEvidence(input));
  });
}
