import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyDriverOutput,
  createBootProgress,
  summarizeProbeEnvironment,
  summarizeDeviceState,
  summarizeStockHierarchy,
} from "../../scripts/native-driver-probe-support.mjs";

test("pinned startup and transport errors become fixed categories without matched text", () => {
  const result = classifyDriverOutput(
    "private-token iOS driver not ready in time, consider increasing timeout by configuring MAESTRO_DRIVER_STARTUP_TIMEOUT env variable",
    "java.net.ConnectException: Connection refused at /private-path?token=private-secret"
  );
  assert.deepEqual(result, ["driver-startup-timeout", "connection-refused"]);
  assert.doesNotMatch(JSON.stringify(result), /private-|MAESTRO|env|token/);
  assert.deepEqual(classifyDriverOutput("private-unknown-error", null), []);
});

test("driver categories distinguish runtime, XCTest, transport and app failures", () => {
  assert.deepEqual(
    classifyDriverOutput(
      "Transport unreachable; SocketTimeoutException; ** TEST EXECUTE FAILED **",
      "Error getting main window kAXErrorCannotComplete; UnsupportedClassVersionError"
    ),
    [
      "driver-unreachable",
      "socket-timeout",
      "xctest-failure",
      "application-unavailable",
      "java-runtime",
    ]
  );
});

test("stock hierarchy emits only parse and exact Settings visibility booleans", () => {
  const result = summarizeStockHierarchy(
    JSON.stringify({
      children: [
        { attributes: { accessibilityText: "Settings", value: "private-value" } },
        {
          attributes: {
            accessibilityText: "private-account",
            text: "private-token",
            title: "private-name",
          },
        },
      ],
    })
  );
  assert.deepEqual(result, { parsedHierarchy: true, stockSettingsVisible: true });
  assert.deepEqual(summarizeStockHierarchy('{"attributes":{"value":"Settings"}}'), {
    parsedHierarchy: true,
    stockSettingsVisible: false,
  });
  for (const raw of ["private-invalid", "null", "[]"])
    assert.deepEqual(summarizeStockHierarchy(raw), {
      parsedHierarchy: false,
      stockSettingsVisible: false,
    });
});

test("driver probe is hosted-only, bounded and contains no app build, fixtures or settings mutation", () => {
  const script = readFileSync(
    new URL("../../scripts/native-driver-probe.mjs", import.meta.url),
    "utf8"
  );
  assert.match(script, /RUNNER_ENVIRONMENT, "github-hosted"/);
  assert.match(script, /GITHUB_EVENT_NAME, "workflow_dispatch"/);
  assert.match(script, /"cold-hierarchy"/);
  assert.match(script, /killSignal: "SIGKILL"/);
  assert.doesNotMatch(script, /30000/);
  assert.match(script, /"warm-hierarchy"/);
  assert.match(script, /"com.apple.Preferences"/);
  assert.match(script, /classifyDriverOutput\(child.stdout, child.stderr\)/);
  assert.match(script, /"xcode-version", "xcodebuild", \["-version"\]/);
  assert.match(script, /rmSync\(temporary/);
  assert.doesNotMatch(
    script,
    /fetch\(|sign-up|makeAccounts|expo|pod|npm|\/etc\/hosts|permissions|plutil|sudo|screenshot/
  );
  assert.doesNotMatch(script, /console\.(log|error)\((child|error)/);
});

test("manual default is a separately scoped driver probe, never full app acceptance", () => {
  const workflow = readFileSync(
    new URL("../../.github/workflows/native-simulator.yml", import.meta.url),
    "utf8"
  );
  assert.match(workflow, /default: driver-probe/);
  assert.match(
    workflow,
    /github.event_name != 'workflow_dispatch' \|\| inputs.mode == 'app-behavior'/
  );
  const probe = workflow.slice(workflow.indexOf("  driver-probe:"));
  assert.match(probe, /github.event.repository.private == false/);
  assert.match(probe, /github.event_name == 'workflow_dispatch' && inputs.mode == 'driver-probe'/);
  assert.match(probe, /timeout-minutes: 55/);
  assert.match(probe, /timeout-minutes: 47/);
  assert.match(probe, /path: release-evidence\/native-driver-probe\/result.json/);
  assert.doesNotMatch(probe, /npm ci|native-simulator.mjs|EXPO_PUBLIC_API_URL|secrets\./);
});

test("probe environment includes only validated model and toolchain fields", () => {
  const env = {
    ImageOS: "macos26-arm64",
    ImageVersion: "20260907.0351.1",
    RUNNER_ARCH: "ARM64",
    TOKEN: "private-secret",
  };
  const result = summarizeProbeEnvironment(
    env,
    "Xcode 26.4.1\nBuild version 17E202\nprivate-secret",
    { name: "iPhone 17 Pro", udid: "private-id" },
    "com.apple.CoreSimulator.SimRuntime.iOS-26-4"
  );
  assert.equal(result.deviceModel, "iPhone 17 Pro");
  assert.equal(result.xcodeVersion, "26.4.1");
  assert.equal(result.runnerImageVersion, "20260907.0351.1");
  assert.doesNotMatch(JSON.stringify(result), /private-|TOKEN/);
  assert.ok(
    Object.values(
      summarizeProbeEnvironment({}, "private", { name: "iPhone private-owner" }, "private-runtime")
    ).every((v) => v === null)
  );
  assert.equal(
    summarizeDeviceState(
      { devices: { runtime: [{ udid: "id", state: "Booted", name: "private" }] } },
      "id"
    ),
    "Booted"
  );
  assert.equal(
    summarizeDeviceState({ devices: { runtime: [{ udid: "id", state: "private" }] } }, "id"),
    "unavailable"
  );
});

test("boot progress handles split lines, records timing and drops private output", () => {
  const progress = createBootProgress();
  progress.consume("private-device-id\nStatus: 2 (Waiting on Data Mig", 40);
  progress.consume("ration), Total Elapsed: 02:01\nprivate-token\n", 120);
  progress.consume("Status: 4 (Waiting on System App), Total Elapsed: 02:04", 140);
  progress.finish(150);
  assert.deepEqual(progress.result.lastProgress, {
    receivedAtMs: 150,
    category: "system-app",
    statusCode: 4,
    reportedElapsedSeconds: 124,
  });
  assert.equal(progress.result.events[0].category, "data-migration");
  assert.equal(progress.result.events[0].receivedAtMs, 120);
  assert.doesNotMatch(JSON.stringify(progress.result), /private-|Waiting|device-id/);
});

test("boot progress bounds lines and event history without losing latest progress", () => {
  const progress = createBootProgress();
  progress.consume("x".repeat(5000), 1);
  progress.consume("Status: 9\n", 2);
  for (let i = 0; i < 50; i++)
    progress.consume(`Status: 2, Total Elapsed: 00:${String(i).padStart(2, "0")}\n`, i);
  progress.consume("Finished\n", 99);
  assert.equal(progress.result.oversizedLines, 1);
  assert.equal(progress.result.events.length, 32);
  assert.equal(progress.result.lastProgress.category, "boot-finished");
  assert.equal(progress.result.lastProgress.receivedAtMs, 99);
});
