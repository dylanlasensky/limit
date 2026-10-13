import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  summarizeCommands,
  summarizeHierarchy,
  readCommandDiagnostics,
  summarizeProcess,
} from "../../scripts/native-behavior-diagnostics.mjs";

test("command diagnostics retain startup/action timing without sensitive payloads", () => {
  const result = summarizeCommands(
    [
      {
        command: { inputTextCommand: { text: "private-password" } },
        metadata: {
          status: "COMPLETED",
          timestamp: 1100,
          duration: 20,
          depth: 0,
          evaluatedCommand: { text: "private-email" },
          error: { message: "private-token" },
          artifacts: ["private-record"],
        },
      },
      {
        command: { assertConditionCommand: { visible: "private-record" } },
        metadata: { status: "FAILED", timestamp: 1130, duration: 30000 },
      },
    ],
    1000
  );
  assert.equal(result.firstCommandDelayMs, 100);
  assert.deepEqual(
    result.commands.map((c) => [c.kind, c.status, c.durationMs]),
    [
      ["inputTextCommand", "COMPLETED", 20],
      ["assertConditionCommand", "FAILED", 30000],
    ]
  );
  assert.doesNotMatch(JSON.stringify(result), /private-/);
});
test("unknown command keys and malformed timing cannot become diagnostic output", () => {
  const result = summarizeCommands(
    [
      {
        command: { "secret-as-key": {} },
        metadata: { status: "secret-status", timestamp: "secret", duration: -3, depth: 999 },
      },
    ],
    1000
  );
  assert.deepEqual(result.commands[0], {
    index: 0,
    kind: "other",
    status: "UNKNOWN",
    startOffsetMs: null,
    durationMs: null,
    depth: null,
  });
  assert.equal(summarizeCommands({}, 1000).status, "unavailable");
});
test("hierarchy never exports field values, arbitrary text, records or nested secure content", () => {
  const result = summarizeHierarchy({
    children: [
      { attributes: { accessibilityText: "Welcome back." } },
      {
        attributes: {
          class: "XCUIElementTypeTextField",
          "resource-id": "input-email",
          accessibilityText: "Hi, NativeBeta.",
          text: "private-email",
          value: "private-email",
        },
        children: [{ attributes: { accessibilityText: "Hi, NativeAlpha." } }],
      },
      {
        attributes: {
          class: "XCUIElementTypeSecureTextField",
          "resource-id": "input-password-at-least-12-characters",
          value: "private-password",
        },
      },
      {
        attributes: {
          class: "XCUIElementTypeButton",
          "resource-id": "action-sign-in",
          label: "private-token",
        },
        enabled: false,
      },
      { attributes: { accessibilityText: "private-record" } },
      { attributes: { accessibilityText: "Invalid email or password" } },
    ],
  });
  assert.deepEqual(result.states, ["signedOut"]);
  assert.deepEqual(result.errorCategories, ["invalid-credentials"]);
  assert.equal(result.controls.find((c) => c.id === "action-sign-in").enabled, false);
  assert.doesNotMatch(JSON.stringify(result), /private-|Invalid email|Welcome back/);
});
test("timing reader accepts pinned commands layout and fails closed on ambiguous files", () => {
  const temp = mkdtempSync(join(tmpdir(), "limit-native-diagnostics-"));
  try {
    mkdirSync(join(temp, "flow"));
    writeFileSync(
      join(temp, "flow", "commands.json"),
      JSON.stringify([
        {
          command: { tapOnElement: { text: "secret" } },
          metadata: { status: "COMPLETED", timestamp: 1020, duration: 5 },
        },
      ])
    );
    assert.equal(readCommandDiagnostics(temp, 1000).firstCommandDelayMs, 20);
    writeFileSync(join(temp, "commands-(other).json"), "[]");
    assert.equal(readCommandDiagnostics(temp, 1000).reason, "command-file-count");
    assert.doesNotMatch(
      JSON.stringify(readCommandDiagnostics(temp, 1000)),
      /secret|limit-native-diagnostics-/
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("process timeout cannot be reported as success even if shutdown returns zero", () => {
  assert.deepEqual(
    summarizeProcess(
      {
        status: 0,
        signal: null,
        error: { code: "ETIMEDOUT", message: "secret" },
        stdout: "private-record",
      },
      1000,
      1250
    ),
    {
      status: "failed",
      elapsedMs: 250,
      exitCode: 0,
      signal: null,
      errorCode: "ETIMEDOUT",
    }
  );
  assert.equal(summarizeProcess({ status: 0 }, 1000, 1010).status, "passed");
});
