import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const fail = (message) => {
  throw new Error(`TestFlight preflight: ${message}`);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

export function checkTestFlightCandidate({ env, head, main, clean, easConfig, nodeForgePresent }) {
  if (
    !/^[a-f0-9]{40}$/.test(env.LIMIT_SOURCE_REVISION || "") ||
    env.LIMIT_SOURCE_REVISION !== head ||
    head !== main
  )
    fail("the selected revision must be the exact current main commit");
  if (!clean) fail("the source checkout must be clean");
  if (env.LIMIT_NATIVE_RELEASE !== "true") fail("native release mode is required");
  if (env.EXPO_PUBLIC_API_URL !== "https://limit.limit-dylanlasensky.workers.dev")
    fail("the native API origin must be production HTTPS");
  if (
    !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(env.LIMIT_BUNDLE_IDENTIFIER || "") ||
    /example|placeholder/.test(env.LIMIT_BUNDLE_IDENTIFIER || "")
  )
    fail("an owner-approved bundle identifier is required");
  if (!/^[A-Z0-9]{10}$/.test(env.LIMIT_APPLE_TEAM_ID || ""))
    fail("an owned Apple team ID is required");
  if (!/^[1-9][0-9]*$/.test(env.LIMIT_NATIVE_BUILD || ""))
    fail("a positive native build number is required");
  if (
    easConfig?.build?.production?.env?.EXPO_PUBLIC_API_URL !== env.EXPO_PUBLIC_API_URL ||
    easConfig?.build?.production?.env?.LIMIT_NATIVE_RELEASE !== "true"
  )
    fail("the EAS production profile must pin release mode and the production origin");
  if (
    !env.EXPO_TOKEN ||
    !env.LIMIT_EAS_PROJECT_ID ||
    !/^[0-9a-f-]{36}$/i.test(env.LIMIT_EAS_PROJECT_ID)
  )
    fail("owner-controlled Expo access and an existing EAS project ID are required");
  if (!/^[1-9][0-9]*$/.test(env.LIMIT_ASC_APP_ID || ""))
    fail("the verified existing App Store Connect app ID is required");
  if (!env.LIMIT_UNSIGNED_NATIVE_CHECK_NAME || !env.LIMIT_MOBILE_API_CHECK_NAME)
    fail("named exact-source native launch and mobile API compatibility checks are required");
  if (nodeForgePresent) fail("the node-forge tooling advisory blocks signed native builds");
  return true;
}

if (process.argv[1]?.endsWith("native-testflight-preflight.mjs")) {
  const head = git("rev-parse", "HEAD");
  const main = git("rev-parse", "origin/main");
  const clean = git("status", "--porcelain") === "";
  const easConfig = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const nodeForgePresent = Object.keys(lock.packages || {}).some((name) =>
    name.endsWith("/node-forge")
  );
  checkTestFlightCandidate({ env: process.env, head, main, clean, easConfig, nodeForgePresent });
  console.log(`TestFlight source preflight passed for ${head}`);
}
