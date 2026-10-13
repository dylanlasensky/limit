import test from "node:test";
import assert from "node:assert/strict";
import { observeBoot } from "../../scripts/native-boot-observation.mjs";

test("boot observation retains sanitized progress and nonzero failure without retry", async () => {
  const events = [];
  const result = await observeBoot(
    process.execPath,
    [
      "-e",
      'console.log("Status: 2 (Waiting on Data Migration), Total Elapsed: 00:01"); console.error("private-secret"); process.exitCode = 2',
    ],
    process.env,
    5000,
    (event) => events.push(JSON.stringify(event))
  );
  assert.equal(result.status, "failed");
  assert.equal(result.exitCode, 2);
  assert.equal(result.progress.stdout.lastProgress.category, "data-migration");
  assert.ok(result.progress.stderrBytes > 0);
  assert.ok(events.length > 0);
  assert.doesNotMatch(JSON.stringify([events, result]), /private-secret|Waiting/);
});

test("boot timeout stays failed even if SIGTERM handler exits zero", async () => {
  const result = await observeBoot(
    process.execPath,
    [
      "-e",
      'process.on("SIGTERM", () => process.exit(0)); console.log("Status: 4 (Waiting on System App)"); setInterval(() => {}, 1000)',
    ],
    process.env,
    1000
  );
  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "ETIMEDOUT");
  assert.equal(result.progress.stdout.lastProgress.category, "system-app");
});

test("successful boot and missing executable have distinct process results", async () => {
  const success = await observeBoot(
    process.execPath,
    ["-e", 'console.log("Finished")'],
    process.env,
    5000
  );
  assert.equal(success.status, "passed");
  assert.equal(success.progress.stdout.lastProgress.category, "boot-finished");
  const missing = await observeBoot("/nonexistent-limit-probe-executable", [], process.env, 5000);
  assert.equal(missing.status, "failed");
  assert.equal(missing.errorCode, "ENOENT");
});
