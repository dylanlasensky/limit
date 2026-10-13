import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { gzipSync } from "node:zlib";
import {
  previewOrigin,
  assertPreview,
  redact,
  assertOneSavedSet,
} from "./native-behavior-support.mjs";
import { behaviorFlows } from "./native-behavior-flows.mjs";

const bundle = "com.example.limit.simulator";
const stateFile = () => join(process.env.RUNNER_TEMP, "limit-native-fixtures.json");
const read = (command, args) => execFileSync(command, args, { encoding: "utf8" }).trim();
async function api(account, path, body, expected = 200) {
  const response = await fetch(previewOrigin + "/api" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: previewOrigin,
      Cookie: account?.cookie || "",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, expected, path + " status");
  const value = await response.json();
  return { value, response };
}
const query = (name, filter = {}) =>
  "/entities/" + name + "?filter=" + encodeURIComponent(JSON.stringify(filter));
function persist(accounts) {
  writeFileSync(stateFile(), JSON.stringify(accounts), { mode: 0o600 });
}
export async function cleanupNativeFixtures() {
  if (!existsSync(stateFile())) return;
  const accounts = JSON.parse(readFileSync(stateFile(), "utf8"));
  const failures = [];
  for (const account of accounts) {
    try {
      const { value } = await api(account, "/functions/deleteAccount", { confirm: true });
      assert.equal(value.deleted, true);
    } catch {
      failures.push(account);
    }
  }
  if (failures.length) {
    persist(failures);
    throw new Error("Synthetic account cleanup incomplete: " + failures.length);
  }
  rmSync(stateFile());
}
function flushDNS() {
  read("sudo", ["dscacheutil", "-flushcache"]);
  read("sudo", ["killall", "-HUP", "mDNSResponder"]);
}
function restoreHosts() {
  const backup = join(process.env.RUNNER_TEMP, "limit-native-hosts-backup");
  if (!existsSync(backup)) return;
  read("sudo", ["cp", backup, "/etc/hosts"]);
  flushDNS();
  rmSync(backup);
}
async function makeAccounts() {
  const accounts = [];
  for (const name of ["NativeAlpha", "NativeBeta"]) {
    const account = {
      name,
      email: "native-" + crypto.randomUUID() + "@example.invalid",
      password: crypto.randomUUID() + "Aa1!",
      cookie: "",
    };
    const signed = await api(null, "/auth/sign-up/email", {
      name,
      email: account.email,
      password: account.password,
    });
    account.cookie = signed.response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    account.id = signed.value.user.id;
    assert.ok(account.cookie && account.id);
    accounts.push(account);
    persist(accounts);
    // Masks protect console output; raw Maestro debug files never become artifacts.
    if (process.env.GITHUB_ACTIONS === "true")
      for (const value of [account.email, account.password, account.cookie])
        console.log("::add-mask::" + value);
    await api(account, "/entities/UserProfile", {
      name,
      experienceLevel: "beginner",
      equipment: ["Bodyweight"],
      availableDays: ["Monday", "Thursday"],
      sessionLength: 30,
      onboardingComplete: true,
      units: "imperial",
    });
    const { value: catalog } = await api(account, query("Exercise"));
    const exercise = catalog.find((e) => e.catalogKey === "bird-dog" || e.id === "bird-dog");
    assert.ok(exercise, "Expected exact seeded bird-dog catalog key");
    const { value: plan } = await api(account, "/entities/WorkoutPlan", {
      name: name + " plan",
      active: false,
      daysPerWeek: 2,
    });
    const { value: days } = await api(
      account,
      "/entities/WorkoutDay/bulkCreate",
      Array.from({ length: 7 }, (_, weekday) => ({
        planId: plan.id,
        weekday,
        name: name + (weekday === 0 || weekday === 3 ? " workout" : " rest"),
        isRest: weekday !== 0 && weekday !== 3,
      }))
    );
    account.dayId = days[0].id;
    for (const day of days.filter((d) => !d.isRest)) {
      await api(account, "/entities/WorkoutExercise", {
        workoutDayId: day.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        primaryMuscle: exercise.primaryMuscle,
        order: 0,
        sets: 1,
        repMin: 8,
        repMax: 12,
        restSeconds: 30,
      });
    }
    await api(account, "/functions/workoutCommand", { action: "activatePlan", planId: plan.id });
    persist(accounts);
  }
  return accounts;
}
export async function runNativeBehavior(device, evidenceDir) {
  assert.equal(process.platform, "darwin");
  assert.equal(process.env.CI, "true");
  assert.equal(process.env.LIMIT_NATIVE_RELEASE, "false");
  assert.equal(process.env.EXPO_PUBLIC_API_URL, previewOrigin);
  assert.ok(process.env.RUNNER_TEMP);
  const { value: before } = await api(null, "/health");
  const { value: config } = await api(null, "/config");
  assertPreview(previewOrigin, before, config);
  const result = {
    sourceRevision: read("git", ["rev-parse", "HEAD"]),
    apiHealth: before,
    scope:
      "Unsigned iOS simulator UI behavior against disposable preview accounts; no physical device, signing or store acceptance",
    networkScope:
      "Only preview hostname denied on disposable runner; actual request failure required. This is API unavailability, not iOS airplane mode.",
    startedAt: new Date().toISOString(),
    status: "pending",
    stages: [],
    cleanup: "pending",
  };
  const save = () =>
    writeFileSync(join(evidenceDir, "behavior.json"), JSON.stringify(result, null, 2) + "\n");
  save();
  let accounts = [];
  let originalError;
  const temp = join(process.env.RUNNER_TEMP, "limit-native-behavior");
  mkdirSync(temp, { recursive: true });
  try {
    accounts = await makeAccounts();
    const [alpha, beta] = accounts;
    const credentials = accounts.flatMap((a) => [a.email, a.password, a.cookie]);
    const maestro = join(process.env.RUNNER_TEMP, "maestro/bin/maestro");
    assert.ok(existsSync(maestro));
    const javaHome = read("/usr/libexec/java_home", ["-v", "17"]);
    const flowEnv = {
      ...process.env,
      JAVA_HOME: javaHome,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_API_URL: "http://127.0.0.1:9",
      MAESTRO_ALPHA_EMAIL: alpha.email,
      MAESTRO_ALPHA_PASSWORD: alpha.password,
      MAESTRO_BETA_EMAIL: beta.email,
      MAESTRO_BETA_PASSWORD: beta.password,
      MAESTRO_ALPHA_DAY: alpha.dayId,
      MAESTRO_BETA_DAY: beta.dayId,
      MAESTRO_EVIDENCE: resolve(evidenceDir),
    };
    result.maestro = execFileSync(maestro, ["--version"], {
      encoding: "utf8",
      env: flowEnv,
    }).trim();
    const flows = behaviorFlows();
    const runFlow = (name) => {
      const path = join(temp, name + ".yaml");
      writeFileSync(
        path,
        "appId: " + bundle + "\n---\n" + JSON.stringify(flows[name], null, 2) + "\n",
        { mode: 0o600 }
      );
      console.log("Native behavior stage: " + name);
      const run = spawnSync(
        maestro,
        ["--device", device.udid, "test", "--debug-output", join(temp, name + "-debug"), path],
        { env: flowEnv, encoding: "utf8", timeout: 240000, maxBuffer: 8 * 1024 * 1024 }
      );
      const log = redact((run.stdout || "") + (run.stderr || ""), credentials);
      writeFileSync(join(evidenceDir, name + ".log.gz"), gzipSync(log));
      if (run.status !== 0) {
        spawnSync("xcrun", [
          "simctl",
          "io",
          device.udid,
          "screenshot",
          join(evidenceDir, name + "-failure.png"),
        ]);
        console.error(log.split("\n").slice(-60).join("\n"));
      }
      assert.equal(run.status, 0, name + " failed");
      result.stages.push({ name, status: "passed", completedAt: new Date().toISOString() });
      save();
    };
    // Official Maestro workaround for simulator Password AutoFill. No app auth behavior is changed.
    for (const suffix of [
      "data/Library/UserConfigurationProfiles/EffectiveUserSettings.plist",
      "data/Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles/UserSettings.plist",
    ]) {
      const path = join(homedir(), "Library/Developer/CoreSimulator/Devices", device.udid, suffix);
      if (existsSync(path))
        read("plutil", [
          "-replace",
          "restrictedBool.allowPasswordAutoFill.value",
          "-bool",
          "NO",
          path,
        ]);
    }
    runFlow("01-auth-and-save");
    const { value: sessions } = await api(alpha, query("WorkoutSession", { status: "active" }));
    assert.equal(sessions.length, 1);
    alpha.sessionId = sessions[0].id;
    persist(accounts);
    flowEnv.MAESTRO_ALPHA_SESSION = alpha.sessionId;
    const checkSet = async (reps) => {
      const { value: sets } = await api(
        alpha,
        query("ExerciseSet", { workoutSessionId: alpha.sessionId })
      );
      assertOneSavedSet(sets, alpha.id, alpha.sessionId, reps);
    };
    await checkSet(10);
    runFlow("02-background-relaunch");
    await checkSet(10); // Editing a saved row must remain a local draft until explicit sync.
    const backup = join(process.env.RUNNER_TEMP, "limit-native-hosts-backup");
    writeFileSync(backup, readFileSync("/etc/hosts"), { mode: 0o600 });
    const blocked = join(temp, "blocked-hosts");
    const hostname = new URL(previewOrigin).hostname;
    writeFileSync(
      blocked,
      readFileSync(backup, "utf8") + "\n127.0.0.1 " + hostname + "\n::1 " + hostname + "\n"
    );
    try {
      read("sudo", ["cp", blocked, "/etc/hosts"]);
      flushDNS();
      const probe = spawnSync("curl", [
        "--noproxy",
        "*",
        "--connect-timeout",
        "5",
        "--max-time",
        "8",
        "--fail",
        "--silent",
        previewOrigin + "/api/health",
      ]);
      assert.notEqual(
        probe.status,
        0,
        "API must actually be unreachable before offline assertions"
      );
      runFlow("03-api-unavailable");
    } finally {
      restoreHosts();
    }
    await checkSet(10);
    runFlow("04-reconnect-and-finish");
    const { value: completed } = await api(alpha, query("WorkoutSession", { status: "completed" }));
    assert.equal(completed.length, 1, "Repeated Finish must create one completed workout");
    assert.equal(completed[0].id, alpha.sessionId);
    await checkSet(13);
    runFlow("05-account-isolation");
    await api(beta, "/entities/WorkoutSession/" + alpha.sessionId, undefined, 404);
    await api(beta, "/entities/WorkoutDay/" + alpha.dayId, undefined, 404);
    const container = read("xcrun", ["simctl", "get_app_container", device.udid, bundle, "data"]);
    const sqliteCheck = `import pathlib, sqlite3, sys
paths=list(pathlib.Path(sys.argv[1]).rglob("limit-drafts.db"))
assert len(paths)==1, "Expected actual native SQLite draft database"
db=sqlite3.connect(paths[0])
assert db.execute("SELECT count(*) FROM drafts").fetchone()[0]==0, "Logout must clear native drafts"
print("Native SQLite logout cleanup passed")
`;
    read("python3", ["-c", sqliteCheck, container]);
    const { value: after } = await api(null, "/health");
    assert.deepEqual(after, before, "Preview deployment changed during native acceptance");
    result.backendAssertions = [
      "single saved set",
      "unsynced edits stay local",
      "failed Finish retains draft",
      "one completed workout",
      "latest 13 reps persisted",
      "cross-account 404s",
      "native SQLite cleared on logout",
      "unchanged preview version",
    ];
    result.status = "passed";
  } catch (error) {
    originalError = error;
    result.status = "failed";
    result.failure = error.message;
  } finally {
    try {
      restoreHosts();
      await cleanupNativeFixtures();
      result.cleanup = "passed";
    } catch (error) {
      result.cleanup = "failed";
      result.status = "failed";
      originalError ||= error;
    }
    result.completedAt = new Date().toISOString();
    save();
    rmSync(temp, { recursive: true, force: true });
  }
  if (originalError) throw originalError;
}
if (process.argv.includes("--cleanup")) {
  assert.equal(process.env.CI, "true");
  restoreHosts();
  await cleanupNativeFixtures();
}
if (process.argv.includes("--check-fixtures")) {
  assert.equal(process.env.CI, "true");
  const { value: health } = await api(null, "/health");
  const { value: config } = await api(null, "/config");
  assertPreview(process.env.EXPO_PUBLIC_API_URL, health, config);
  try {
    const accounts = await makeAccounts();
    assert.equal(accounts.length, 2);
    console.log("Two synthetic preview fixture accounts and owned plans created.");
  } finally {
    await cleanupNativeFixtures();
    console.log("Synthetic fixture cleanup passed.");
  }
}
