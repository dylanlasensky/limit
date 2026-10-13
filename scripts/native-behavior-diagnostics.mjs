import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { behaviorFlows } from "./native-behavior-flows.mjs";

const kinds = new Set([
  "applyConfigurationCommand",
  "assertConditionCommand",
  "tapOnElement",
  "inputTextCommand",
  "hideKeyboardCommand",
  "openLinkCommand",
  "runFlowCommand",
  "pressKeyCommand",
  "launchAppCommand",
  "stopAppCommand",
  "scrollUntilVisible",
  "eraseTextCommand",
  "takeScreenshotCommand",
  "defineVariablesCommand",
]);
const statuses = new Set(["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED", "WARNED"]);
const bounded = (value, max) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max ? value : null;
const controls = new Set([
  "input-email",
  "input-password-at-least-12-characters",
  "action-sign-in",
  "action-please-wait-",
  "action-sign-out",
  "action-open-my-week",
]);
const states = new Map([
  ["Welcome back.", "signedOut"],
  ["Loading your account…", "sessionLoading"],
  ["Loading your saved session…", "workoutLoading"],
  ["Unmatched Route", "unmatchedRoute"],
  ["Page could not be found.", "unmatchedRoute"],
  ["Hi, NativeAlpha.", "alphaDashboard"],
  ["Hi, NativeBeta.", "betaDashboard"],
]);
const errors = new Map([
  ["Invalid email or password", "invalid-credentials"],
  ["Invalid origin", "untrusted-origin"],
  ["Untrusted origin.", "untrusted-origin"],
  ["Network request failed", "network"],
  ["Failed to fetch", "network"],
  ["Too many requests", "rate-limit"],
]);

// Project numeric timing and fixed enums only. Never serialize command payloads,
// evaluated values, error messages, artifact paths or the original debug object.
export function summarizeCommands(entries, processStartedAt) {
  if (!Array.isArray(entries)) return { status: "unavailable", commands: [] };
  const commands = entries.slice(0, 500).map((entry, index) => {
    const metadata = entry?.metadata || {};
    const command = entry?.command || {};
    const kind = Object.keys(command).find((key) => kinds.has(key) && command[key] != null);
    return {
      index,
      kind: kind || "other",
      status: statuses.has(metadata.status) ? metadata.status : "UNKNOWN",
      startOffsetMs: bounded(metadata.timestamp - processStartedAt, 600000),
      durationMs: bounded(metadata.duration, 600000),
      depth: bounded(metadata.depth, 32),
    };
  });
  const starts = commands.map((c) => c.startOffsetMs).filter((n) => n !== null);
  return {
    status: "available",
    firstCommandDelayMs: starts.length ? Math.min(...starts) : null,
    commands,
  };
}

// Only fixed states/IDs and bounded fixture-comparison booleans leave this boundary.
// Input values never become output; input descendants cannot supply state labels.
export function summarizeHierarchy(root, expectedInputs) {
  const result = {
    status: "available",
    states: [],
    controls: [],
    errorCategories: [],
    authContexts: [],
    authErrorPresent: false,
    hierarchyCounts: { nodes: 0, labelledNodes: 0, skippedInputSubtrees: 0, truncated: false },
  };
  const inputValues = { email: [], password: [] };
  let nestedAuthInput = false;
  const queue = [root];
  let visited = 0;
  while (queue.length && visited++ < 10000) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;
    result.hierarchyCounts.nodes += 1;
    const attributes = node.attributes || {};
    const id = attributes["resource-id"];
    const context =
      typeof id === "string" &&
      /^auth-context-(preview|production|other)-(idle|attempted|http-[1-5]xx|http-other)$/.exec(id);
    if (context)
      result.authContexts.push({ apiDestination: context[1], requestStatus: context[2] });
    if (id === "auth-error") result.authErrorPresent = true;
    if (id === "input-email") inputValues.email.push(attributes.value);
    if (id === "input-password-at-least-12-characters") inputValues.password.push(attributes.value);
    if (
      (id === "input-email" || id === "input-password-at-least-12-characters") &&
      Array.isArray(node.children) &&
      node.children.length
    )
      nestedAuthInput = true;
    if (controls.has(id))
      result.controls.push({
        id,
        enabled: typeof node.enabled === "boolean" ? node.enabled : null,
      });
    if (
      (typeof id === "string" && id.startsWith("input-")) ||
      /TextField|SecureText|EditText|TextInput/i.test(attributes.class || "")
    ) {
      result.hierarchyCounts.skippedInputSubtrees += 1;
      continue;
    }
    // Pinned iOS driver exposes accessibilityText, but no class/type field.
    // Never inspect its text/title/value fields (they can contain input values).
    const label = attributes.accessibilityText;
    if (typeof label === "string" && label.length) result.hierarchyCounts.labelledNodes += 1;
    if (states.has(label)) result.states.push(states.get(label));
    if (errors.has(label)) result.errorCategories.push(errors.get(label));
    if (Array.isArray(node.children)) {
      const remaining = Math.max(0, 10000 - visited - queue.length);
      if (node.children.length > remaining) result.hierarchyCounts.truncated = true;
      queue.push(...node.children.slice(0, remaining));
    }
  }
  result.states = [...new Set(result.states)];
  result.errorCategories = [...new Set(result.errorCategories)];
  result.authContexts = [
    ...new Map(result.authContexts.map((context) => [JSON.stringify(context), context])).values(),
  ];
  const fields = [...inputValues.email, ...inputValues.password];
  result.emptyAuthInputs =
    !result.hierarchyCounts.truncated &&
    !nestedAuthInput &&
    inputValues.email.length === 1 &&
    inputValues.password.length === 1 &&
    fields.every((v) => typeof v === "string")
      ? fields.every((v) => v === "")
      : null;
  if (
    typeof expectedInputs?.email === "string" &&
    expectedInputs.email.endsWith("@example.invalid") &&
    expectedInputs.email.length <= 320 &&
    typeof expectedInputs.password === "string" &&
    expectedInputs.password.length >= 12 &&
    expectedInputs.password.length <= 128
  ) {
    const email =
      inputValues.email.length === 1 && typeof inputValues.email[0] === "string"
        ? inputValues.email[0]
        : null;
    const password =
      inputValues.password.length === 1 && typeof inputValues.password[0] === "string"
        ? inputValues.password[0]
        : null;
    result.inputEvidence = {
      emailMatchesFixture: email === null ? null : email === expectedInputs.email,
      passwordFieldNonEmpty: password === null ? null : password.length > 0,
      // Secure native fields may expose only bullets, which cannot prove the entered secret.
      passwordMatchesFixture:
        password === null || /^[•●*]+$/.test(password)
          ? null
          : password === expectedInputs.password,
    };
  }
  return result;
}

// This is deliberately narrower than the ordinary failure diagnostics: only the
// first signed-out assertions, before any credential-field tap or input command.
// The exact pinned command prefix must be complete and contain no unknown action.
export function readPreInputFailureImage(directory, context) {
  try {
    if (
      context?.flow !== "01-auth-and-save" ||
      context.firstFlow !== true ||
      context.hostedFreshInstall !== true ||
      context.initialInputsEmpty !== true
    )
      return null;
    const { path, entries } = readCommandFile(directory);
    if (!Array.isArray(entries) || ![3, 6, 7].includes(entries.length)) return null;
    const active = entries.map((entry) =>
      Object.entries(entry.command || {}).filter(([, value]) => value != null)
    );
    if (active.some((commands) => commands.length !== 1)) return null;
    const names = active.map(([command]) => command[0]);
    const expected = [
      "defineVariablesCommand",
      "applyConfigurationCommand",
      "assertConditionCommand",
    ];
    if (entries.length > 3) {
      expected.push("openLinkCommand", "runFlowCommand");
      if (entries.length === 7) expected.push("tapOnElement");
      expected.push("assertConditionCommand");
    }
    if (JSON.stringify(names) !== JSON.stringify(expected)) return null;
    const isOpenTap = (command) =>
      command?.tapOnElement?.selector?.textRegex === "Open" &&
      !command.tapOnElement.selector.idRegex;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i],
        name = names[i];
      const state = entry.metadata?.status;
      if (
        i === entries.length - 1
          ? state !== "FAILED"
          : state !== "COMPLETED" &&
            !(name === "runFlowCommand" && entries.length === 6 && state === "SKIPPED")
      )
        return null;
      const command = active[i][0][1];
      if (
        name === "assertConditionCommand" &&
        command.condition?.visible?.textRegex !== "Welcome back."
      )
        return null;
      if (
        name === "openLinkCommand" &&
        !/^limit:\/\/workout\/(?:\$\{MAESTRO_ALPHA_DAY\}|[a-f0-9-]{36})$/.test(command.link || "")
      )
        return null;
      if (name === "tapOnElement" && !isOpenTap(entry.command)) return null;
      if (
        name === "runFlowCommand" &&
        (command.commands?.length !== 1 ||
          !isOpenTap(command.commands[0]) ||
          Object.entries(command.commands[0]).filter(([, value]) => value != null).length !== 1)
      )
        return null;
    }
    const artifacts = entries.at(-1).metadata?.artifacts;
    if (!Array.isArray(artifacts)) return null;
    const images = artifacts.filter((item) => item?.type === "SCREENSHOT");
    const trees = artifacts.filter((item) => item?.type === "SCREEN_HIERARCHY");
    if (images.length !== 1 || trees.length !== 1) return null;
    const relative = images[0].path,
      tree = trees[0].path;
    if (
      typeof relative !== "string" ||
      typeof tree !== "string" ||
      [...(relative + tree)].some((character) => character.charCodeAt(0) < 32)
    )
      return null;
    if (!/^screenshots\/step-\d{3,}(?:-[^/\\]+)?\.png$/.test(relative)) return null;
    if (!/^screen-hierarchy\/step-\d{3,}(?:-[^/\\]+)?\.json$/.test(tree)) return null;
    if (relative.slice("screenshots/".length, -4) !== tree.slice("screen-hierarchy/".length, -5))
      return null;
    if (!lstatSync(join(dirname(path), "screenshots")).isDirectory()) return null;
    const file = join(dirname(path), relative),
      stat = lstatSync(file);
    if (!stat.isFile() || stat.size < 24 || stat.size > 8 * 1024 * 1024) return null;
    const bytes = readFileSync(file);
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return null;
    if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20);
    if (!width || !height || width > 4096 || height > 4096) return null;
    return bytes;
  } catch {
    return null;
  }
}

// Read only explicit, completed checkpoint captures from the pinned bundle layout.
// The caller publishes these only after all behavior, backend and cleanup checks pass.
export function readSuccessfulFlowImages(directory, flow, status) {
  try {
    if (status !== "passed") throw new Error();
    const flowCommands = behaviorFlows()[flow];
    const expected = flowCommands
      ?.filter((command) => command.takeScreenshot)
      .map((command) => command.takeScreenshot);
    if (!expected?.length || expected.some((name) => !/^\d{2}-[a-z-]+$/.test(name)))
      throw new Error();
    const { path, entries } = readCommandFile(directory);
    if (!Array.isArray(entries) || entries.length > 500) throw new Error();
    if (entries.some((entry) => entry.metadata?.status === "FAILED")) throw new Error();
    const commands = entries.filter((entry) => entry.command?.takeScreenshotCommand);
    if (
      commands.length !== expected.length ||
      commands.some(
        (entry, index) =>
          entry.metadata?.status !== "COMPLETED" ||
          entry.command.takeScreenshotCommand.path !== expected[index]
      )
    )
      throw new Error();
    const folder = join(dirname(path), "takeScreenshot");
    if (!lstatSync(folder).isDirectory()) throw new Error();
    return expected.map((name) => {
      const file = join(folder, name + ".png"),
        stat = lstatSync(file);
      if (!stat.isFile() || stat.size < 24 || stat.size > 8 * 1024 * 1024) throw new Error();
      const bytes = readFileSync(file);
      if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        throw new Error();
      if (bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error();
      const width = bytes.readUInt32BE(16),
        height = bytes.readUInt32BE(20);
      if (!width || !height || width > 4096 || height > 4096) throw new Error();
      return { name: name + ".png", bytes };
    });
  } catch {
    throw new Error("Native checkpoint screenshot evidence is invalid");
  }
}

function readCommandFile(directory) {
  const paths = [];
  const walk = (path, depth = 0) => {
    if (depth > 8 || paths.length > 10) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(path, entry.name), depth + 1);
      else if (entry.isFile() && /^commands(?:-\(.+\))?\.json$/.test(entry.name))
        paths.push(join(path, entry.name));
    }
  };
  if (!lstatSync(directory).isDirectory()) throw new Error("unreadable");
  walk(directory);
  if (paths.length !== 1) throw new Error("command-file-count");
  return { path: paths[0], entries: readBoundedJSON(paths[0]) };
}

function readBoundedJSON(path) {
  const stat = lstatSync(path);
  if (!stat.isFile()) throw new Error("unreadable");
  if (stat.size > 8 * 1024 * 1024) throw new Error("size-limit");
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readCommandDiagnostics(directory, startedAt) {
  try {
    return summarizeCommands(readCommandFile(directory).entries, startedAt);
  } catch (error) {
    const reason = ["command-file-count", "size-limit"].includes(error.message)
      ? error.message
      : "unreadable";
    return { status: "unavailable", reason, commands: [] };
  }
}

// Pinned Maestro captures a failed visible leaf's hierarchy before closing its
// driver. Consume that exact artifact in memory, never its screenshot or path.
export function readFailedStepHierarchy(directory, expectedInputs) {
  try {
    const { path, entries } = readCommandFile(directory);
    if (!Array.isArray(entries) || entries.length > 500) throw new Error();
    const candidates = entries.flatMap((entry, index) => {
      if (entry?.metadata?.status !== "FAILED") return [];
      const artifacts = entry.metadata.artifacts;
      if (!Array.isArray(artifacts)) return [];
      const trees = artifacts.filter((artifact) => artifact?.type === "SCREEN_HIERARCHY");
      return trees.length ? [{ index, trees }] : [];
    });
    const last = candidates.at(-1);
    if (!last || last.trees.length !== 1) throw new Error();
    const relative = last.trees[0].path;
    if (
      typeof relative !== "string" ||
      [...relative].some((character) => character.charCodeAt(0) < 32) ||
      !/^screen-hierarchy\/step-\d{3,}(?:-[^/\\]+)?\.json$/.test(relative)
    )
      throw new Error();
    const folder = join(dirname(path), "screen-hierarchy");
    if (!lstatSync(folder).isDirectory()) throw new Error();
    const tree = readBoundedJSON(join(dirname(path), relative));
    if (!tree || typeof tree !== "object" || Array.isArray(tree)) throw new Error();
    return {
      source: "failed-step-artifact",
      commandIndex: last.index,
      ...summarizeHierarchy(tree, expectedInputs),
    };
  } catch {
    return { source: "failed-step-artifact", status: "unavailable" };
  }
}

export function summarizeProcess(run, startedAt, now = Date.now()) {
  const errorCodes = new Set(["ETIMEDOUT", "ENOBUFS", "ENOENT", "EACCES", "EIO"]);
  const signals = new Set(["SIGTERM", "SIGKILL", "SIGINT", "SIGABRT"]);
  return {
    status: run.status === 0 && !run.error ? "passed" : "failed",
    elapsedMs: bounded(now - startedAt, 900000),
    exitCode: bounded(run.status, 255),
    signal: run.signal == null ? null : signals.has(run.signal) ? run.signal : "OTHER",
    errorCode: run.error ? (errorCodes.has(run.error.code) ? run.error.code : "OTHER") : null,
  };
}

// Process presence is not foreground state or route success. Raw launchctl output
// stays in memory; malformed, truncated or timed-out observations remain unknown.
export function summarizeLimitProcess(run, startedAt, now = Date.now()) {
  const outcome = summarizeProcess(run, startedAt, now);
  const result = { ...outcome, observationStatus: "unavailable", processRunning: null };
  if (outcome.status !== "passed" || typeof run.stdout !== "string") return result;
  if (run.stdout.length > 1024 * 1024) return result;
  const lines = run.stdout.trim().split(/\r?\n/);
  if (!/^PID\s+Status\s+Label$/.test(lines.shift()?.trim() || "")) return result;
  const rows = lines.map((line) => /^\s*(\d+|-)\s+-?\d+\s+(\S+)\s*$/.exec(line));
  if (rows.some((row) => !row)) return result;
  result.observationStatus = "available";
  result.processRunning = rows.some(
    (row) =>
      /^[1-9]\d*$/.test(row[1]) &&
      /^(?:UIKitApplication:)?com\.example\.limit\.simulator(?:\[[^\s]+\])?$/.test(row[2])
  );
  return result;
}
