import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { summarizeProcess } from "./native-behavior-diagnostics.mjs";
import { observeBoot } from "./native-boot-observation.mjs";
import {
  classifyDriverOutput,
  summarizeStockHierarchy,
  summarizeProbeEnvironment,
  summarizeDeviceState,
} from "./native-driver-probe-support.mjs";

assert.equal(process.platform, "darwin");
assert.equal(process.env.GITHUB_ACTIONS, "true");
assert.equal(process.env.RUNNER_ENVIRONMENT, "github-hosted");
assert.equal(process.env.GITHUB_EVENT_NAME, "workflow_dispatch");
assert.equal(process.env.LIMIT_DRIVER_PROBE, "true");
assert.ok(process.env.RUNNER_TEMP);
assert.match(process.env.GITHUB_SHA || "", /^[a-f0-9]{40}$/);

const temporary = mkdtempSync(join(process.env.RUNNER_TEMP, "limit-driver-probe-"));
const evidence = resolve("release-evidence/native-driver-probe");
mkdirSync(evidence, { recursive: true });
const result = {
  sourceRevision: process.env.GITHUB_SHA,
  scope: "Stock simulator accessibility driver only; no LIMIT build, accounts or native acceptance",
  status: "pending",
  stages: [],
};
const save = () =>
  writeFileSync(join(evidence, "result.json"), JSON.stringify(result, null, 2) + "\n");
let env = {
  ...process.env,
  MAESTRO_CLI_NO_ANALYTICS: "1",
  MAESTRO_API_URL: "http://127.0.0.1:9",
  XDG_STATE_HOME: join(temporary, "maestro-state"),
};
let device;
const run = (name, command, args, timeout = 30000, hierarchy = false) => {
  const startedAt = Date.now();
  const child = spawnSync(command, args, {
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  const stage = {
    name,
    ...summarizeProcess(child, startedAt),
    failureCategories: classifyDriverOutput(child.stdout, child.stderr),
    stdoutBytes: Buffer.byteLength(child.stdout || ""),
    stderrBytes: Buffer.byteLength(child.stderr || ""),
    ...(hierarchy ? summarizeStockHierarchy(child.stdout) : {}),
  };
  result.stages.push(stage);
  save();
  if (stage.status !== "passed") throw new Error("probe-stage-failed");
  return { output: child.stdout, stage };
};

save();
try {
  const java = run("java-home", "/usr/libexec/java_home", ["-v", "17"]).output.trim();
  env = { ...env, JAVA_HOME: java };
  const xcode = run("xcode-version", "xcodebuild", ["-version"]).output;
  const inventory = JSON.parse(
    run("simulator-inventory", "xcrun", ["simctl", "list", "devices", "available", "--json"]).output
  );
  device = Object.entries(inventory.devices)
    .filter(([runtime]) => runtime.includes("iOS"))
    .flatMap(([runtime, devices]) => devices.map((entry) => ({ ...entry, runtime })))
    .find(
      (entry) => entry.isAvailable && entry.name.startsWith("iPhone") && entry.state === "Shutdown"
    );
  if (!device) throw new Error("simulator-unavailable");
  result.environment = summarizeProbeEnvironment(process.env, xcode, device, device.runtime);
  save();
  run("simulator-boot", "xcrun", ["simctl", "boot", device.udid]);
  const boot = await observeBoot(
    "xcrun",
    ["simctl", "bootstatus", device.udid, "-b"],
    env,
    600000,
    (progress) => {
      result.bootProgress = progress;
      save();
    }
  );
  const { progress, ...bootStage } = boot;
  result.bootProgress = progress;
  result.stages.push({ name: "simulator-boot-ready", ...bootStage });
  save();
  if (boot.status !== "passed") throw new Error("probe-stage-failed");
  run("stock-app-launch", "xcrun", ["simctl", "launch", device.udid, "com.apple.Preferences"]);
  const maestro = join(process.env.RUNNER_TEMP, "maestro/bin/maestro");
  const version = run("maestro-version", maestro, ["--version"]).output.trim();
  if (version !== "2.11.0") throw new Error("unexpected-driver-version");
  const cold = run("cold-hierarchy", maestro, ["--device", device.udid, "hierarchy"], 240000, true);
  if (!cold.stage.parsedHierarchy) throw new Error("invalid-hierarchy");
  // A separate warm invocation observes the stock screen, not a retry of a failed cold probe.
  run("stock-app-relaunch", "xcrun", ["simctl", "launch", device.udid, "com.apple.Preferences"]);
  const warm = run(
    "warm-hierarchy",
    maestro,
    ["--device", device.udid, "hierarchy", "--no-reinstall-driver"],
    240000,
    true
  );
  if (!warm.stage.parsedHierarchy || !warm.stage.stockSettingsVisible)
    throw new Error("stock-ui-unavailable");
  result.status = "passed";
} catch (error) {
  result.status = "failed";
  const reasons = new Set([
    "probe-stage-failed",
    "simulator-unavailable",
    "unexpected-driver-version",
    "invalid-hierarchy",
    "stock-ui-unavailable",
  ]);
  result.failureCategory = reasons.has(error.message) ? error.message : "unclassified";
  process.exitCode = 1;
} finally {
  if (device) {
    result.deviceStateBeforeCleanup = "unavailable";
    try {
      const inventory = JSON.parse(
        run("simulator-final-state", "xcrun", ["simctl", "list", "devices", "--json"]).output
      );
      result.deviceStateBeforeCleanup = summarizeDeviceState(inventory, device.udid);
    } catch {
      result.status = "failed";
      process.exitCode = 1;
    }
    save();
    try {
      run("simulator-shutdown", "xcrun", ["simctl", "shutdown", device.udid], 30000);
    } catch {
      result.status = "failed";
      process.exitCode = 1;
    }
  }
  rmSync(temporary, { recursive: true, force: true });
  save();
  console.log(JSON.stringify(result));
}
