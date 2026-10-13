import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  openSync,
  closeSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { runNativeBehavior } from "./native-behavior.mjs";
import {
  decodeSimulatorEntitlements,
  validateSimulatorSignature,
} from "./native-simulator-signature.mjs";

assert.equal(process.platform, "darwin", "An Apple simulator runner is required");
assert.equal(process.env.CI, "true", "Run only on the disposable CI runner");
assert.equal(process.env.LIMIT_NATIVE_RELEASE, "false", "This is not a signed release");
assert.equal(process.env.LIMIT_BUNDLE_IDENTIFIER, "com.example.limit.simulator");
assert.ok(!process.env.LIMIT_APPLE_TEAM_ID, "A developer team is forbidden in this job");
assert.ok(process.env.RUNNER_TEMP);
const root = process.cwd();
const evidenceDir = resolve("release-evidence/native-simulator");
mkdirSync(evidenceDir, { recursive: true });
const read = (command, args) => execFileSync(command, args, { encoding: "utf8" }).trim();
const sourceRevision = read("git", ["rev-parse", "HEAD"]);
const env = { ...process.env, LIMIT_SOURCE_REVISION: sourceRevision };
const architecture = read("uname", ["-m"]);
assert.ok(["arm64", "x86_64"].includes(architecture), "Unsupported simulator architecture");
assert.equal(
  process.arch,
  architecture === "arm64" ? "arm64" : "x64",
  "Runner architecture mismatch"
);
const evidence = {
  sourceRevision,
  scope:
    "Locally ad hoc signed simulator only; no developer identity, physical device or store acceptance",
  startedAt: new Date().toISOString(),
  status: "pending",
  xcode: read("xcodebuild", ["-version"]),
  apiOrigin: process.env.EXPO_PUBLIC_API_URL,
  architecture,
};
const run = (command, args, cwd, name) => {
  const started = performance.now();
  console.log(JSON.stringify({ event: "native.build.started", stage: name }));
  const file = join(process.env.RUNNER_TEMP, `limit-${name}.log`);
  const fd = openSync(file, "w");
  const result = spawnSync(command, args, { cwd, env, stdio: ["ignore", fd, fd] });
  closeSync(fd);
  const log = readFileSync(file);
  const compressed = gzipSync(log);
  if (compressed.length <= 8 * 1024 * 1024)
    writeFileSync(join(evidenceDir, `${name}.log.gz`), compressed);
  else writeFileSync(join(evidenceDir, `${name}-tail.log`), log.subarray(-1024 * 1024));
  if (result.status !== 0) console.error(log.toString().split("\n").slice(-100).join("\n"));
  console.log(
    JSON.stringify({
      event: "native.build.completed",
      stage: name,
      elapsedMs: Math.round(performance.now() - started),
      passed: result.status === 0,
    })
  );
  assert.equal(result.status, 0, `${name} failed`);
};
writeFileSync(join(evidenceDir, "result.json"), JSON.stringify(evidence, null, 2) + "\n");
let device;
try {
  run(
    "npx",
    [
      "expo",
      "prebuild",
      "--platform",
      "ios",
      "--no-install",
      "--skip-dependency-update",
      "react-native,react",
    ],
    join(root, "apps/mobile"),
    "prebuild"
  );
  run("pod", ["install"], join(root, "apps/mobile/ios"), "pods");
  const derived = join(process.env.RUNNER_TEMP, "limit-native-derived");
  run(
    "xcodebuild",
    [
      "-workspace",
      "LIMIT.xcworkspace",
      "-scheme",
      "LIMIT",
      "-configuration",
      "Release",
      "-sdk",
      "iphonesimulator",
      "-destination",
      "generic/platform=iOS Simulator",
      "-derivedDataPath",
      derived,
      "-jobs",
      "2",
      `ARCHS=${architecture}`,
      // Simulator Keychain requires Xcode's simulated application entitlement.
      // The SDK's local ad hoc identity needs no account, certificate or profile.
      "CODE_SIGNING_ALLOWED=YES",
      "CODE_SIGNING_REQUIRED=YES",
      "CODE_SIGN_IDENTITY=-",
      "DEVELOPMENT_TEAM=",
      "PROVISIONING_PROFILE_SPECIFIER=",
      "build",
    ],
    join(root, "apps/mobile/ios"),
    "build"
  );
  evidence.compiled = true;
  const products = join(derived, "Build/Products/Release-iphonesimulator");
  const apps = readdirSync(products).filter((name) => name.endsWith(".app"));
  assert.equal(apps.length, 1, "Expected one simulator app");
  const app = join(products, apps[0]);
  const bundle = read("/usr/libexec/PlistBuddy", [
    "-c",
    "Print :CFBundleIdentifier",
    join(app, "Info.plist"),
  ]);
  assert.equal(bundle, "com.example.limit.simulator");
  const executable = read("/usr/libexec/PlistBuddy", [
    "-c",
    "Print :CFBundleExecutable",
    join(app, "Info.plist"),
  ]);
  assert.match(executable, /^[A-Za-z0-9_-]+$/);
  execFileSync("codesign", ["--verify", "--strict", app], { timeout: 15000, maxBuffer: 65536 });
  const signature = spawnSync("codesign", ["--display", "--verbose=4", app], {
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 65536,
  });
  assert.equal(signature.status, 0, "Could not inspect simulator signature");
  const section = execFileSync(
    "xcrun",
    ["otool", "-X", "-s", "__TEXT", "__entitlements", join(app, executable)],
    {
      encoding: "utf8",
      timeout: 15000,
      maxBuffer: 65536,
    }
  );
  const entitlements = JSON.parse(
    execFileSync("plutil", ["-convert", "json", "-o", "-", "-"], {
      input: decodeSimulatorEntitlements(section),
      encoding: "utf8",
      timeout: 15000,
      maxBuffer: 65536,
    })
  );
  evidence.signature = validateSimulatorSignature({
    signature: signature.stdout + signature.stderr,
    entitlements,
    platform: read("/usr/libexec/PlistBuddy", [
      "-c",
      "Print :CFBundleSupportedPlatforms:0",
      join(app, "Info.plist"),
    ]),
    hasProfile: existsSync(join(app, "embedded.mobileprovision")),
  });
  evidence.binaryArchitecture = read("xcrun", ["lipo", "-archs", join(app, executable)]);
  assert.equal(
    evidence.binaryArchitecture,
    architecture,
    "Built binary must match the simulator host"
  );
  const inventory = JSON.parse(read("xcrun", ["simctl", "list", "devices", "available", "--json"]));
  device = Object.entries(inventory.devices)
    .filter(([runtime]) => runtime.includes("iOS"))
    .flatMap(([, devices]) => devices)
    .find(
      (entry) => entry.isAvailable && entry.name.startsWith("iPhone") && entry.state === "Shutdown"
    );
  assert.ok(device, "An installed iPhone simulator is required");
  console.log(JSON.stringify({ event: "native.simulator.boot.started" }));
  read("xcrun", ["simctl", "boot", device.udid]);
  read("xcrun", ["simctl", "bootstatus", device.udid, "-b"]);
  console.log(JSON.stringify({ event: "native.simulator.boot.completed" }));
  console.log(JSON.stringify({ event: "native.simulator.install.started" }));
  read("xcrun", ["simctl", "install", device.udid, app]);
  console.log(JSON.stringify({ event: "native.simulator.install.completed" }));
  console.log(JSON.stringify({ event: "native.simulator.launch.started" }));
  const launch = read("xcrun", ["simctl", "launch", device.udid, bundle]);
  assert.match(launch, /:\s*\d+$/);
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const processes = read("xcrun", ["simctl", "spawn", device.udid, "launchctl", "list"]);
  assert.ok(
    processes.split("\n").some((line) => /^\d+\s/.test(line) && line.includes(bundle)),
    "App must remain running after launch"
  );
  read("xcrun", ["simctl", "io", device.udid, "screenshot", join(evidenceDir, "launch.png")]);
  evidence.launched = true;
  console.log(JSON.stringify({ event: "native.simulator.launch.completed" }));
  evidence.simulator = device.name;
  if (process.env.LIMIT_NATIVE_BEHAVIOR === "true") {
    console.log(JSON.stringify({ event: "native.behavior.started" }));
    await runNativeBehavior(device, evidenceDir, { freshInstall: true });
    evidence.behavior = "passed";
    evidence.scope =
      "Locally ad hoc signed simulator compile, rendered launch and bounded synthetic-account behavior; no developer identity, physical device or store acceptance";
  }
  evidence.status = "passed";
} catch (error) {
  evidence.status = "failed";
  throw error;
} finally {
  evidence.completedAt = new Date().toISOString();
  writeFileSync(join(evidenceDir, "result.json"), JSON.stringify(evidence, null, 2) + "\n");
  if (device) spawnSync("xcrun", ["simctl", "shutdown", device.udid], { stdio: "ignore" });
}
