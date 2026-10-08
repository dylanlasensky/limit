import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { assertHostedVersion, deployedWorkerVersion } from "./release-version.mjs";
const environment = process.argv[2];
assert.ok(["preview", "production"].includes(environment), "Choose preview or production");
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  "",
  "Release checkout must be clean"
);
const preview = "https://limit-preview.limit-dylanlasensky.workers.dev";
const origin =
  environment === "production" ? "https://limit.limit-dylanlasensky.workers.dev" : preview;
const check = async (url, expectedVersion) => {
  const r = await fetch(url + "/api/health", { cache: "no-store" });
  assert.ok(r.ok);
  const health = await r.json();
  assertHostedVersion(health, sha, expectedVersion);
  return health;
};
if (environment === "production") {
  const previewHealth = await check(preview);
  if (!process.env.CI) {
    const tested = JSON.parse(readFileSync("release-evidence/preview.json", "utf8"));
    assert.equal(tested.status, "passed");
    assert.equal(tested.sourceRevision, sha);
    assert.equal(
      previewHealth.version,
      tested.health.version,
      "Testing Worker changed after acceptance"
    );
    assert.equal(
      execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim(),
      sha
    );
  } else assert.equal(process.env.GITHUB_REF, "refs/heads/main");
}
const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--remote", "--env", environment]);
run("npx", [
  "wrangler",
  "d1",
  "execute",
  "DB",
  "--remote",
  "--env",
  environment,
  "--file",
  "worker/seed.sql",
]);
const deployment = spawnSync(
  "npx",
  [
    "wrangler",
    "deploy",
    "--env",
    environment,
    "--var",
    "SOURCE_REVISION:" + sha,
    "--tag",
    "release-" + sha.slice(0, 7),
    "--message",
    "Git source " + sha,
  ],
  { encoding: "utf8", env: process.env, maxBuffer: 10 * 1024 * 1024 }
);
process.stdout.write(deployment.stdout || "");
process.stderr.write(deployment.stderr || "");
assert.equal(deployment.status, 0, "Wrangler deployment failed");
const deployedVersion = deployedWorkerVersion(
  (deployment.stdout || "") + (deployment.stderr || "")
);
let health;
// Wrangler can report a new version before every edge serves it. The health
// check still requires the exact source and Worker version before acceptance.
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    health = await check(origin, deployedVersion);
    break;
  } catch (error) {
    if (attempt === 29) throw error;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
mkdirSync("release-evidence", { recursive: true });
const evidence = {
  sourceRevision: sha,
  environment,
  origin,
  health,
  startedAt: new Date().toISOString(),
  status: "pending",
};
writeFileSync(`release-evidence/${environment}.json`, JSON.stringify(evidence, null, 2) + "\n");
try {
  run("npm", ["run", "test:api"], { LIMIT_API_URL: origin });
  run("node", ["tests/hosted/smoke.mjs"], {
    LIMIT_API_URL: origin,
    LIMIT_SCREENSHOTS: `release-evidence/${environment}-screenshots`,
  });
  run("node", ["tests/hosted/media.mjs"], { LIMIT_API_URL: origin });
  evidence.status = "passed";
} catch (error) {
  evidence.status = "failed";
  throw error;
} finally {
  evidence.completedAt = new Date().toISOString();
  writeFileSync(`release-evidence/${environment}.json`, JSON.stringify(evidence, null, 2) + "\n");
}
