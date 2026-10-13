import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyDriverOutput,
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
  assert.match(script, /"warm-hierarchy"/);
  assert.match(script, /"com.apple.Preferences"/);
  assert.match(script, /classifyDriverOutput\(child.stdout, child.stderr\)/);
  assert.match(script, /rmSync\(temporary/);
  assert.doesNotMatch(
    script,
    /fetch\(|sign-up|makeAccounts|expo|xcodebuild|pod|npm|\/etc\/hosts|permissions|plutil|sudo|screenshot/
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
  assert.match(probe, /timeout-minutes: 12/);
  assert.match(probe, /path: release-evidence\/native-driver-probe\/result.json/);
  assert.doesNotMatch(probe, /npm ci|native-simulator.mjs|EXPO_PUBLIC_API_URL|secrets\./);
});
