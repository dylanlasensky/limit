import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  assertPreview,
  previewOrigin,
  acceptedRevision,
  redact,
  assertOneSavedSet,
} from "../../scripts/native-behavior-support.mjs";
import { behaviorFlows } from "../../scripts/native-behavior-flows.mjs";
test("native fixtures fail closed outside accepted email-disabled preview", () => {
  const health = { environment: "preview", sourceRevision: acceptedRevision };
  assertPreview(previewOrigin, health, { emailEnabled: false });
  assert.throws(() =>
    assertPreview("https://limit.limit-dylanlasensky.workers.dev", health, { emailEnabled: false })
  );
  assert.throws(() =>
    assertPreview(previewOrigin, { ...health, sourceRevision: "changed" }, { emailEnabled: false })
  );
  assert.throws(() => assertPreview(previewOrigin, health, { emailEnabled: true }));
});
test("artifact redaction removes complete and overlapping synthetic credentials", () => {
  assert.equal(
    redact("abc abcdef cookie=secret abc", ["abc", "abcdef", "cookie=secret"]),
    "[REDACTED] [REDACTED] [REDACTED] [REDACTED]"
  );
});
test("backend acceptance rejects stale reps, duplicates and another owner's sets", () => {
  const row = { ownerId: "A", workoutSessionId: "S", reps: 13, completed: true };
  assertOneSavedSet([row], "A", "S", 13);
  assert.throws(() => assertOneSavedSet([row, row], "A", "S", 13));
  assert.throws(() => assertOneSavedSet([row], "B", "S", 13));
  assert.throws(() => assertOneSavedSet([row], "A", "S", 12));
});
test("flows drive real input and do not replace unsupported iOS networking with a no-op", () => {
  const flows = behaviorFlows();
  assert.equal(Object.keys(flows).length, 5);
  const commands = JSON.stringify(flows);
  assert.ok(commands.includes("doubleTapOn"));
  assert.ok(commands.includes("assertNotVisible"));
  assert.ok(!commands.includes("setAirplaneMode"));
  assert.ok(!commands.includes("clearState"));
  assert.ok(!commands.includes("clearKeychain"));
});
test("fresh installed app is observed without reset and lifecycle launches deny permissions", () => {
  const flows = behaviorFlows();
  assert.deepEqual(flows["01-auth-and-save"][0], {
    extendedWaitUntil: { visible: "Welcome back.", timeout: 30000 },
  });
  const launches = Object.values(flows)
    .flat()
    .filter((command) => {
      assert.notEqual(command, "launchApp", "Bare launches implicitly grant permissions");
      return typeof command === "object" && command.launchApp;
    });
  assert.equal(launches.length, 4);
  for (const command of launches) {
    assert.deepEqual(command.launchApp.permissions, { all: "deny" });
  }
});

test("candidate cannot change host networking or simulator security settings", () => {
  const harness = readFileSync(
    new URL("../../scripts/native-behavior.mjs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    harness,
    /\/etc\/hosts|flushcache|mDNSResponder|plutil|PasswordAutoFill|sudo/
  );
  assert.match(
    harness,
    /Native network-loss\/API-unavailability recovery; no approved app-scoped fault method/
  );
  assert.doesNotMatch(harness, /-failure\.png/);
});
test("isolation starts with an unfinished Alpha draft and excludes login screenshots", () => {
  const flows = behaviorFlows();
  const prepare = JSON.stringify(flows["04-prepare-private-draft"]);
  const isolate = JSON.stringify(flows["05-account-isolation"]);
  assert.match(prepare, /MAESTRO_ALPHA_DRAFT_DAY/);
  assert.match(prepare, /"inputText":"17"/);
  assert.doesNotMatch(prepare, /action-complete-set|action-finish-workout/);
  assert.match(isolate, /MAESTRO_ALPHA_DRAFT_DAY/);
  assert.match(isolate, /"assertNotVisible":\{"id":"input-repetitions","text":"17"\}/);
  assert.doesNotMatch(isolate, /08-signed-out-route/);
});

test("driver readiness precedes credentials and later invocations avoid reinstallation", () => {
  const harness = readFileSync(
    new URL("../../scripts/native-behavior.mjs", import.meta.url),
    "utf8"
  );
  assert.ok(
    harness.indexOf("result.readiness = readHierarchy()") <
      harness.indexOf("accounts = await makeAccounts()")
  );
  assert.match(harness, /"--no-reinstall-driver"/);
  assert.match(harness, /timeout: 240000/);
  assert.match(harness, /stage.failureUI = readFailedStepHierarchy/);
  assert.equal(harness.match(/readHierarchy\(\)/g).length, 1);
  assert.doesNotMatch(harness, /console\.(log|error)\(run\.(stdout|stderr)/);
});
