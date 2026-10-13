import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  summarizeCommands,
  summarizeHierarchy,
  readCommandDiagnostics,
  readFailedStepHierarchy,
  summarizeProcess,
  summarizeLimitProcess,
  readPreInputFailureImage,
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

function withFailedHierarchy(run) {
  const temp = mkdtempSync(join(tmpdir(), "limit-native-failed-tree-"));
  const folder = join(temp, "flow", "screen-hierarchy");
  const relative = "screen-hierarchy/step-007-assertCondition-private-record.json";
  const commandPath = join(temp, "flow", "commands.json");
  const treePath = join(temp, "flow", relative);
  const commands = [
    { metadata: { status: "COMPLETED", artifacts: [] } },
    {
      command: { assertConditionCommand: { text: "private-record" } },
      metadata: {
        status: "FAILED",
        error: { message: "private-error" },
        artifacts: [
          { type: "SCREENSHOT", path: "private-screenshot.png" },
          { type: "SCREEN_HIERARCHY", path: relative },
        ],
      },
    },
  ];
  try {
    mkdirSync(folder, { recursive: true });
    writeFileSync(commandPath, JSON.stringify(commands));
    writeFileSync(
      treePath,
      JSON.stringify({
        children: [
          { attributes: { accessibilityText: "Unmatched Route" } },
          { attributes: { accessibilityText: "limit://private-record" } },
          {
            attributes: {
              "resource-id": "input-email",
              accessibilityText: "Welcome back.",
              value: "private-email",
            },
            children: [{ attributes: { accessibilityText: "Loading your saved session…" } }],
          },
        ],
      })
    );
    run({ temp, folder, commandPath, treePath, commands });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

test("failed-step artifact exposes only fixed route state without another driver invocation", () => {
  withFailedHierarchy(({ temp }) => {
    const result = readFailedStepHierarchy(temp);
    assert.equal(result.status, "available");
    assert.equal(result.source, "failed-step-artifact");
    assert.equal(result.commandIndex, 1);
    assert.deepEqual(result.states, ["unmatchedRoute"]);
    assert.doesNotMatch(JSON.stringify(result), /private-|screen-hierarchy|limit:\/\//);
  });
});

test("failed-step reader rejects traversal, absolute paths, ambiguous and passing artifacts", () => {
  withFailedHierarchy(({ temp, commands, commandPath }) => {
    const metadata = commands[1].metadata;
    for (const path of [
      "../private.json",
      "/tmp/private.json",
      "screen-hierarchy/../private.json",
    ]) {
      metadata.artifacts = [{ type: "SCREEN_HIERARCHY", path }];
      writeFileSync(commandPath, JSON.stringify(commands));
      assert.equal(readFailedStepHierarchy(temp).status, "unavailable");
    }
    metadata.artifacts = Array(2).fill({
      type: "SCREEN_HIERARCHY",
      path: "screen-hierarchy/step-007-assertCondition-private-record.json",
    });
    writeFileSync(commandPath, JSON.stringify(commands));
    assert.equal(readFailedStepHierarchy(temp).status, "unavailable");
    metadata.artifacts.pop();
    metadata.status = "COMPLETED";
    writeFileSync(commandPath, JSON.stringify(commands));
    assert.equal(readFailedStepHierarchy(temp).status, "unavailable");
  });
});

test("failed-step reader refuses symbolic link files and directories", () => {
  withFailedHierarchy(({ temp, treePath, folder }) => {
    const outside = join(temp, "private.json");
    writeFileSync(outside, '{"attributes":{"accessibilityText":"Welcome back."}}');
    rmSync(treePath);
    symlinkSync(outside, treePath);
    assert.equal(readFailedStepHierarchy(temp).status, "unavailable");
    rmSync(folder, { recursive: true });
    symlinkSync(temp, folder);
    assert.equal(readFailedStepHierarchy(temp).status, "unavailable");
  });
});

test("failed-step reader fails closed on oversized, malformed and missing captured hierarchy", () => {
  withFailedHierarchy(({ temp, treePath }) => {
    for (const value of ["private-invalid-json", "null", "[]", " ".repeat(8 * 1024 * 1024 + 1)]) {
      writeFileSync(treePath, value);
      const result = readFailedStepHierarchy(temp);
      assert.deepEqual(result, { source: "failed-step-artifact", status: "unavailable" });
    }
    rmSync(treePath);
    assert.equal(readFailedStepHierarchy(temp).status, "unavailable");
  });
});

test("last captured failure is selected without exporting earlier records", () => {
  withFailedHierarchy(({ temp, commands, commandPath }) => {
    commands.push({ metadata: { status: "FAILED", artifacts: [] } });
    writeFileSync(commandPath, JSON.stringify(commands));
    assert.equal(readFailedStepHierarchy(temp).commandIndex, 1);
  });
});

test("auth observations emit fixed destinations and HTTP classes, never arbitrary errors", () => {
  const result = summarizeHierarchy({
    children: [
      { attributes: { "resource-id": "auth-context-preview-http-4xx", value: "private-token" } },
      { attributes: { "resource-id": "auth-context-private-host-private-status" } },
      {
        attributes: {
          "resource-id": "auth-error",
          accessibilityText: "Unknown private-account failure",
        },
      },
    ],
  });
  assert.deepEqual(result.authContexts, [{ apiDestination: "preview", requestStatus: "http-4xx" }]);
  assert.equal(result.authErrorPresent, true);
  assert.deepEqual(result.errorCategories, []);
  assert.doesNotMatch(JSON.stringify(result), /private-|Unknown/);
});

test("synthetic input comparison emits booleans only and masked passwords stay unknown", () => {
  const expected = { email: "private-fixture@example.invalid", password: "private-password-123" };
  const tree = (email, password) => ({
    children: [
      { attributes: { "resource-id": "input-email", value: email } },
      { attributes: { "resource-id": "input-password-at-least-12-characters", value: password } },
    ],
  });
  for (const [password, matches] of [
    [expected.password, true],
    ["different-private-password", false],
    ["••••••••", null],
    ["", false],
  ]) {
    const result = summarizeHierarchy(tree(expected.email, password), expected);
    assert.deepEqual(result.inputEvidence, {
      emailMatchesFixture: true,
      passwordFieldNonEmpty: password.length > 0,
      passwordMatchesFixture: matches,
    });
    assert.doesNotMatch(JSON.stringify(result), /private-|example.invalid|••/);
  }
  assert.equal(
    summarizeHierarchy(tree("wrong", "••"), expected).inputEvidence.emailMatchesFixture,
    false
  );
});

test("input evidence fails closed for missing or duplicate nodes and non-fixture expectations", () => {
  const expected = { email: "fixture@example.invalid", password: "private-password-123" };
  const result = summarizeHierarchy(
    {
      children: [
        { attributes: { "resource-id": "input-email", value: expected.email } },
        { attributes: { "resource-id": "input-email", value: expected.email } },
      ],
    },
    expected
  );
  assert.deepEqual(result.inputEvidence, {
    emailMatchesFixture: null,
    passwordFieldNonEmpty: null,
    passwordMatchesFixture: null,
  });
  assert.equal(
    summarizeHierarchy({}, { ...expected, email: "real@example.com" }).inputEvidence,
    undefined
  );
  assert.equal(summarizeHierarchy({}, { ...expected, password: "short" }).inputEvidence, undefined);
});

test("hierarchy counts distinguish structural captures without exposing labels or input descendants", () => {
  assert.deepEqual(summarizeHierarchy({}).hierarchyCounts, {
    nodes: 1,
    labelledNodes: 0,
    skippedInputSubtrees: 0,
    truncated: false,
  });
  const result = summarizeHierarchy({
    children: [
      { attributes: { accessibilityText: "private unknown screen" } },
      {
        attributes: { "resource-id": "input-email", accessibilityText: "private email" },
        children: [{ attributes: { accessibilityText: "private password" } }],
      },
    ],
  });
  assert.deepEqual(result.hierarchyCounts, {
    nodes: 3,
    labelledNodes: 1,
    skippedInputSubtrees: 1,
    truncated: false,
  });
  assert.deepEqual(result.states, []);
  assert.doesNotMatch(JSON.stringify(result), /private|unknown screen/);
  const oversized = summarizeHierarchy({
    children: Array.from({ length: 10020 }, () => ({
      attributes: { accessibilityText: "private record" },
    })),
  });
  assert.deepEqual(oversized.hierarchyCounts, {
    nodes: 10000,
    labelledNodes: 9999,
    skippedInputSubtrees: 0,
    truncated: true,
  });
  assert.doesNotMatch(JSON.stringify(oversized), /private record/);
});

test("LIMIT process observation exports presence only and rejects malformed or timed-out output", () => {
  const row = "321\t0\tUIKitApplication:com.example.limit.simulator[private-token][rb-legacy]";
  const observe = (stdout, extra = {}) =>
    summarizeLimitProcess({ status: 0, stdout, stderr: "private-error", ...extra }, 1000, 1020);
  const running = observe("PID\tStatus\tLabel\n" + row + "\n44\t0\tprivate.other.app\n");
  assert.equal(running.processRunning, true);
  assert.equal(running.observationStatus, "available");
  assert.equal(running.elapsedMs, 20);
  assert.doesNotMatch(JSON.stringify(running), /private|UIKit|simulator\[/);
  for (const body of [
    "-\t0\tcom.example.limit.simulator",
    "321\t0\tcom.example.limit.simulator.other",
    "321\t0\tother.com.example.limit.simulator",
  ])
    assert.equal(observe("PID Status Label\n" + body).processRunning, false);
  for (const stdout of [
    "",
    row,
    "PID Status Label\nmalformed private-output",
    "x".repeat(1024 * 1024 + 1),
  ])
    assert.equal(observe(stdout).processRunning, null);
  const timedOut = observe("PID Status Label\n" + row, {
    error: { code: "ETIMEDOUT", message: "private-secret" },
  });
  assert.equal(timedOut.processRunning, null);
  assert.equal(timedOut.status, "failed");
  assert.doesNotMatch(JSON.stringify(timedOut), /private/);
});

function preInputImageFixture(run) {
  const temp = mkdtempSync(join(tmpdir(), "limit-preinput-"));
  const imagePath = join(temp, "screenshots/step-006-assertCondition.png");
  const treePath = "screen-hierarchy/step-006-assertCondition.json";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aemcAAAAASUVORK5CYII=",
    "base64"
  );
  const open = { tapOnElement: { selector: { textRegex: "Open" } } };
  const commands = [
    { defineVariablesCommand: {} },
    { applyConfigurationCommand: {} },
    { assertConditionCommand: { condition: { visible: { textRegex: "Welcome back." } } } },
    { openLinkCommand: { link: "limit://workout/${MAESTRO_ALPHA_DAY}" } },
    { runFlowCommand: { commands: [open] } },
    open,
    { assertConditionCommand: { condition: { visible: { textRegex: "Welcome back." } } } },
  ].map((command, index) => ({
    command,
    metadata: {
      status: index === 6 ? "FAILED" : "COMPLETED",
      artifacts:
        index === 6
          ? [
              { type: "SCREENSHOT", path: "screenshots/step-006-assertCondition.png" },
              { type: "SCREEN_HIERARCHY", path: treePath },
            ]
          : [],
    },
  }));
  const context = {
    flow: "01-auth-and-save",
    firstFlow: true,
    hostedFreshInstall: true,
    initialInputsEmpty: true,
  };
  const write = () => writeFileSync(join(temp, "commands.json"), JSON.stringify(commands));
  try {
    mkdirSync(join(temp, "screenshots"));
    writeFileSync(imagePath, png);
    write();
    run({ temp, imagePath, png, commands, context, write });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

test("pre-input image requires the exact first-flow prefix and proven empty initial fields", () => {
  preInputImageFixture(({ temp, png, context, commands, write }) => {
    assert.deepEqual(readPreInputFailureImage(temp, context), png);
    for (const change of [
      { flow: "05-account-isolation" },
      { firstFlow: false },
      { hostedFreshInstall: false },
      { initialInputsEmpty: false },
      { initialInputsEmpty: null },
    ])
      assert.equal(readPreInputFailureImage(temp, { ...context, ...change }), null);
    const original = structuredClone(commands);
    for (const mutation of [
      () => {
        commands[5].command = { inputTextCommand: { text: "private-password" } };
      },
      () => {
        commands[5].command.tapOnElement.selector = { idRegex: "input-email" };
      },
      () => {
        commands[0].command.unknownPrivateCommand = {};
      },
      () => {
        commands[4].command.runFlowCommand.commands.push({ inputTextCommand: { text: "private" } });
      },
      () => {
        commands[2].metadata.status = "UNKNOWN";
      },
      () => {
        commands[6].metadata.status = "COMPLETED";
      },
      () => {
        commands[3].command.openLinkCommand.link = "https://private.example";
      },
      () => {
        commands.push({
          command: { inputTextCommand: { text: "private" } },
          metadata: { status: "RUNNING" },
        });
      },
    ]) {
      commands.splice(0, commands.length, ...structuredClone(original));
      mutation();
      write();
      assert.equal(readPreInputFailureImage(temp, context), null);
    }
  });
  const field = (id, value) => ({ attributes: { "resource-id": id, value } });
  assert.equal(
    summarizeHierarchy({
      children: [field("input-email", ""), field("input-password-at-least-12-characters", "")],
    }).emptyAuthInputs,
    true
  );
  assert.equal(
    summarizeHierarchy({
      children: [
        field("input-email", "private"),
        field("input-password-at-least-12-characters", ""),
      ],
    }).emptyAuthInputs,
    false
  );
  assert.equal(summarizeHierarchy({ children: [field("input-email", "")] }).emptyAuthInputs, null);
  const emptyFields = [
    field("input-email", ""),
    field("input-password-at-least-12-characters", ""),
  ];
  assert.equal(
    summarizeHierarchy({ children: [...emptyFields, ...Array.from({ length: 10000 }, () => ({}))] })
      .emptyAuthInputs,
    null
  );
  emptyFields[0].children = [{ attributes: { value: "private-descendant" } }];
  assert.equal(summarizeHierarchy({ children: emptyFields }).emptyAuthInputs, null);
});

test("pre-input image rejects unsafe, ambiguous, oversized and non-PNG artifacts", () => {
  preInputImageFixture(({ temp, imagePath, context, commands, write, png }) => {
    const artifacts = commands[6].metadata.artifacts;
    for (const path of [
      "/private/file.png",
      "screenshots/../file.png",
      "screenshots/step-006-assertCondition\n.png",
      "screenshots/step-007-assertCondition.png",
    ]) {
      artifacts[0].path = path;
      write();
      assert.equal(readPreInputFailureImage(temp, context), null);
    }
    artifacts[0].path = "screenshots/step-006-assertCondition.png";
    artifacts.push({ ...artifacts[0] });
    write();
    assert.equal(readPreInputFailureImage(temp, context), null);
    artifacts.pop();
    write();
    for (const content of [Buffer.from("private-not-png"), Buffer.alloc(8 * 1024 * 1024 + 1)]) {
      writeFileSync(imagePath, content);
      assert.equal(readPreInputFailureImage(temp, context), null);
    }
    rmSync(imagePath);
    writeFileSync(join(temp, "private.png"), png);
    symlinkSync(join(temp, "private.png"), imagePath);
    assert.equal(readPreInputFailureImage(temp, context), null);
    rmSync(imagePath);
    rmSync(join(temp, "screenshots"), { recursive: true });
    mkdirSync(join(temp, "other"));
    writeFileSync(join(temp, "other/step-006-assertCondition.png"), png);
    symlinkSync(join(temp, "other"), join(temp, "screenshots"));
    assert.equal(readPreInputFailureImage(temp, context), null);
  });
});
