import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import {
  previewOrigin,
  assertPreview,
  redact,
  assertOneSavedSet,
} from "./native-behavior-support.mjs";
import { behaviorFlows } from "./native-behavior-flows.mjs";
import {
  readCommandDiagnostics,
  readFailedStepHierarchy,
  summarizeHierarchy,
  summarizeProcess,
} from "./native-behavior-diagnostics.mjs";

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
    account.draftDayId = days[3].id;
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
    uncovered: [
      "Native network-loss/API-unavailability recovery; no approved app-scoped fault method",
      "Physical-device and signed/TestFlight acceptance",
      "Email/OAuth callback delivery",
    ],
    startedAt: new Date().toISOString(),
    status: "pending",
    driverStartupTimeoutMs: 180000,
    driverReadinessTimeoutMs: 360000,
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
    const maestro = join(process.env.RUNNER_TEMP, "maestro/bin/maestro");
    assert.ok(existsSync(maestro));
    const javaHome = read("/usr/libexec/java_home", ["-v", "17"]);
    const commonEnv = {
      ...process.env,
      JAVA_HOME: javaHome,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_DRIVER_STARTUP_TIMEOUT: String(result.driverStartupTimeoutMs),
      MAESTRO_API_URL: "http://127.0.0.1:9",
      XDG_STATE_HOME: join(temp, "maestro-state"),
    };
    result.maestro = execFileSync(maestro, ["--version"], {
      encoding: "utf8",
      env: commonEnv,
    }).trim();
    const readHierarchy = () => {
      const startedAt = Date.now();
      const run = spawnSync(maestro, ["--device", device.udid, "hierarchy"], {
        env: commonEnv,
        encoding: "utf8",
        timeout: result.driverReadinessTimeoutMs,
        killSignal: "SIGKILL",
        maxBuffer: 8 * 1024 * 1024,
      });
      const outcome = summarizeProcess(run, startedAt);
      let ui = { status: "unavailable" };
      if (outcome.status === "passed") {
        try {
          ui = summarizeHierarchy(JSON.parse(run.stdout));
        } catch {
          /* No raw parse error or tree output. */
        }
      }
      return { ...outcome, ui };
    };
    // Initialize/observe the pinned driver before creating any test credentials.
    // Raw hierarchy and driver logs never enter the upload directory.
    result.readiness = readHierarchy();
    save();
    assert.equal(result.readiness.status, "passed", "Native driver readiness failed");
    assert.ok(result.readiness.ui.states?.includes("signedOut"), "Signed-out screen unavailable");
    for (const id of ["input-email", "input-password-at-least-12-characters", "action-sign-in"])
      assert.ok(
        result.readiness.ui.controls?.some((control) => control.id === id),
        "Sign-in control unavailable"
      );
    accounts = await makeAccounts();
    const [alpha, beta] = accounts;
    const credentials = accounts.flatMap((a) => [a.email, a.password, a.cookie]);
    const flowEnv = {
      ...commonEnv,
      MAESTRO_ALPHA_EMAIL: alpha.email,
      MAESTRO_ALPHA_PASSWORD: alpha.password,
      MAESTRO_BETA_EMAIL: beta.email,
      MAESTRO_BETA_PASSWORD: beta.password,
      MAESTRO_ALPHA_DAY: alpha.dayId,
      MAESTRO_ALPHA_DRAFT_DAY: alpha.draftDayId,
      MAESTRO_BETA_DAY: beta.dayId,
      MAESTRO_EVIDENCE: resolve(evidenceDir),
    };
    const flows = behaviorFlows();
    const runFlow = (name) => {
      const path = join(temp, name + ".yaml");
      writeFileSync(
        path,
        "appId: " + bundle + "\n---\n" + JSON.stringify(flows[name], null, 2) + "\n",
        { mode: 0o600 }
      );
      console.log("Native behavior stage: " + name);
      const startedAt = Date.now();
      const run = spawnSync(
        maestro,
        [
          "--device",
          device.udid,
          "test",
          "--no-reinstall-driver",
          "--debug-output",
          join(temp, name + "-debug"),
          path,
        ],
        { env: flowEnv, encoding: "utf8", timeout: 240000, maxBuffer: 8 * 1024 * 1024 }
      );
      const log = redact((run.stdout || "") + (run.stderr || ""), credentials);
      writeFileSync(join(evidenceDir, name + ".log.gz"), gzipSync(log));
      if (run.status !== 0) {
        console.error(log.split("\n").slice(-60).join("\n"));
      }
      const outcome = summarizeProcess(run, startedAt);
      const stage = {
        name,
        ...outcome,
        timing: readCommandDiagnostics(join(temp, name + "-debug"), startedAt),
        completedAt: new Date().toISOString(),
      };
      result.stages.push(stage);
      save();
      if (outcome.status !== "passed") {
        stage.failureUI = readFailedStepHierarchy(join(temp, name + "-debug"));
        save();
      }
      assert.equal(outcome.status, "passed", name + " failed");
    };
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
    runFlow("03-finish");
    const { value: completed } = await api(alpha, query("WorkoutSession", { status: "completed" }));
    assert.equal(completed.length, 1, "Repeated Finish must create one completed workout");
    assert.equal(completed[0].id, alpha.sessionId);
    await checkSet(13);
    runFlow("04-prepare-private-draft");
    const draftContainer = read("xcrun", [
      "simctl",
      "get_app_container",
      device.udid,
      bundle,
      "data",
    ]);
    const retainedDraftCheck = `import pathlib, sqlite3, json, sys
paths=list(pathlib.Path(sys.argv[1]).rglob("limit-drafts.db"))
assert len(paths)==1
rows=sqlite3.connect(paths[0]).execute("SELECT payload FROM drafts WHERE owner=?", (sys.argv[2],)).fetchall()
assert any(any(str(r.get("reps"))=="17" for r in json.loads(row[0])["rows"]) for row in rows), "Alpha must have a real unfinished draft before logout"
print("Unfinished Alpha draft verified before account switch")
`;
    read("python3", ["-c", retainedDraftCheck, draftContainer, alpha.id]);
    runFlow("05-account-isolation");
    await api(beta, "/entities/WorkoutSession/" + alpha.sessionId, undefined, 404);
    await api(beta, "/entities/WorkoutDay/" + alpha.draftDayId, undefined, 404);
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
      "one completed workout",
      "latest 13 reps persisted",
      "cross-account 404s",
      "unfinished Alpha draft exists before logout",
      "native SQLite cleared on logout",
      "unchanged preview version",
    ];
    result.status = "passed";
  } catch (error) {
    originalError = error;
    result.status = "failed";
    result.failure = redact(
      error.message,
      accounts.flatMap((a) => [a.email, a.password, a.cookie])
    );
  } finally {
    try {
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
