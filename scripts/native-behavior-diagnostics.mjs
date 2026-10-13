import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

// Only fixed form/dashboard states and known control IDs leave this boundary.
// Text fields (and their descendants) are never inspected for text/value flags.
export function summarizeHierarchy(root) {
  const result = { status: "available", states: [], controls: [], errorCategories: [] };
  const queue = [root];
  let visited = 0;
  while (queue.length && visited++ < 10000) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    const attributes = node.attributes || {};
    const id = attributes["resource-id"];
    if (controls.has(id))
      result.controls.push({
        id,
        enabled: typeof node.enabled === "boolean" ? node.enabled : null,
      });
    if (
      (typeof id === "string" && id.startsWith("input-")) ||
      /TextField|SecureText|EditText|TextInput/i.test(attributes.class || "")
    )
      continue;
    // Pinned iOS driver exposes accessibilityText, but no class/type field.
    // Never inspect its text/title/value fields (they can contain input values).
    const label = attributes.accessibilityText;
    if (states.has(label)) result.states.push(states.get(label));
    if (errors.has(label)) result.errorCategories.push(errors.get(label));
    if (Array.isArray(node.children)) queue.push(...node.children);
  }
  result.states = [...new Set(result.states)];
  result.errorCategories = [...new Set(result.errorCategories)];
  return result;
}

export function readCommandDiagnostics(directory, startedAt) {
  const paths = [];
  const walk = (path, depth = 0) => {
    if (depth > 8 || paths.length > 10) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(path, entry.name), depth + 1);
      else if (entry.isFile() && /^commands(?:-\(.+\))?\.json$/.test(entry.name))
        paths.push(join(path, entry.name));
    }
  };
  try {
    walk(directory);
    if (paths.length !== 1)
      return { status: "unavailable", reason: "command-file-count", commands: [] };
    const raw = readFileSync(paths[0]);
    if (raw.length > 8 * 1024 * 1024)
      return { status: "unavailable", reason: "size-limit", commands: [] };
    return summarizeCommands(JSON.parse(raw.toString("utf8")), startedAt);
  } catch {
    return { status: "unavailable", reason: "unreadable", commands: [] };
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
