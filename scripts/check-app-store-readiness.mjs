import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// These are evidence requirements, not checks that this script can perform remotely.
export const REQUIRED_EVIDENCE = {
  developerOwnership: "Apple account ownership, agreements and matching bundle identity",
  nativePackage: "Generated signed IPA, version/build and release source identified",
  nativeSDK: "Generated IPA built with iOS SDK 26 or newer; upload validation passes",
  nativePermissionsPrivacy: "IPA permission strings, SDK manifests and privacy report reviewed",
  legalAndDataPractices: "Approved legal pages, data inventory, retention and privacy labels",
  supportAndOperations: "Working support, monitoring, rate limits and backup/restore exercise",
  nativeAuthentication:
    "Packaged sign-up, login, reset, logout and Apple-equivalent login verified",
  accountIsolation: "Two ordinary test accounts cannot access each other's records or files",
  accountDeletion:
    "Disposable-account deletion, uploaded-file handling and provider revocation verified",
  uploadsAndAI: "Camera denial/upload, AI consent, safety and cost controls verified on device",
  workoutsAndRecovery: "Real-device sleep, reconnect, conflicting saves and completion verified",
  deviceAccessibility: "VoiceOver, text size, keyboard, safe areas and both themes on device",
  commercialModel: "Explicit release commerce decision; StoreKit lifecycle if digital purchases",
  storeMetadata: "Accurate screenshots, icon, age rating, reviewer access and metadata complete",
  testFlight: "Release-candidate TestFlight test on physical iPhone completed",
  releaseTests: "Passing unit, browser, type, build and security checks for the release revision",
};

export function validPublicUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !["localhost", "example.com", "example.org", "example.net"].includes(url.hostname) &&
      !/^(\d|\[)/.test(url.hostname) &&
      !/\.(localhost|local|test|invalid|example)$/.test(url.hostname) &&
      !/\.example\.(com|org|net)$/.test(url.hostname) &&
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

export function evaluateReadiness({ config, sourceChecks, revision, now = new Date() }) {
  const blockers = [];
  const requireValue = (condition, message) => {
    if (!condition) blockers.push(message);
  };
  requireValue(
    config?.schemaVersion === 1 && config?.platform === "ios" && config?.packaging === "base44",
    "Release configuration must identify schema version 1 and the Base44 iOS package."
  );
  const candidate = config?.candidate || {};
  const revisionValid =
    /^[a-f0-9]{40}$/.test(candidate.sourceRevision || "") && candidate.sourceRevision === revision;
  requireValue(
    revisionValid,
    "Pin sourceRevision to a tested commit with unchanged checked-out content (only the evidence ledger may differ)."
  );
  requireValue(
    /^\d+\.\d+\.\d+$/.test(candidate.appVersion || ""),
    "Record the native app version."
  );
  requireValue(
    /^\d+(\.\d+){0,2}$/.test(String(candidate.buildNumber ?? "")),
    "Record the native build number."
  );
  requireValue(
    /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+){2,}$/.test(candidate.bundleIdentifier || "") &&
      !/example|placeholder|yourcompany/i.test(candidate.bundleIdentifier || ""),
    "Record the actual owned bundle identifier."
  );
  requireValue(
    /^[A-Z0-9]{10}$/.test(candidate.developerTeamId || ""),
    "Record the actual Apple developer team ID (not a signing key)."
  );
  requireValue(validPublicUrl(candidate.publishedUrl), "Record the production HTTPS app URL.");
  requireValue(
    typeof config?.legal?.businessName === "string" && config.legal.businessName.trim().length > 1,
    "Record the verified business/publisher name for the legal documents."
  );
  for (const field of ["privacyUrl", "termsUrl", "supportUrl"]) {
    requireValue(
      validPublicUrl(config?.legal?.[field]),
      `Record the approved public HTTPS ${field}.`
    );
  }
  requireValue(
    ["no-paid-features", "storekit"].includes(config?.commerce?.mode),
    "Commerce remains unconfigured: approve no paid features or implement and verify StoreKit before selling digital access."
  );
  for (const [id, description] of Object.entries(REQUIRED_EVIDENCE)) {
    const check = config?.checks?.[id];
    const checkedAt = Date.parse(check?.checkedAt || "");
    const age = now.getTime() - checkedAt;
    const valid =
      check?.status === "verified" &&
      revisionValid &&
      check.sourceRevision === candidate.sourceRevision &&
      typeof check.reviewedBy === "string" &&
      check.reviewedBy.trim().length > 1 &&
      validPublicUrl(check.evidenceUrl) &&
      Number.isFinite(age) &&
      age >= 0 &&
      age <= 30 * 24 * 60 * 60 * 1000;
    requireValue(
      valid,
      `${id}: ${description}. Attach current, revision-matched evidence; unverified/expired checks block release.`
    );
  }
  const codeReady = sourceChecks.length > 0 && sourceChecks.every((check) => check.passed);
  return {
    codeReady,
    storeReady: codeReady && blockers.length === 0,
    sourceChecks,
    blockers,
    scope:
      "Static source guards plus an evidence ledger. This does not independently verify attestations, replace device testing, or guarantee App Review approval.",
  };
}

export function inspectSource(read) {
  const checks = [];
  const check = (id, test) => {
    try {
      checks.push({ id, passed: Boolean(test()) });
    } catch {
      checks.push({ id, passed: false });
    }
  };
  check("safe-area-and-zoom", () => {
    const html = read("index.html");
    return (
      html.includes("viewport-fit=cover") &&
      !/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1\b/i.test(html)
    );
  });
  check("app-identity", () => JSON.parse(read("public/manifest.json")).name === "LIMIT");
  check("honest-native-capabilities", () => {
    const source = read("src/components/limit/mobileIntegrations.ts");
    return (
      ["healthKit", "pushNotifications", "fullOfflineMode", "nativePurchases"].every((name) =>
        new RegExp(`${name}:\\s*false`).test(source)
      ) && !source.includes("after native iOS packaging")
    );
  });
  check(
    "no-placeholder-reminder-toggle",
    () => !read("src/components/limit/AppPreferences.tsx").includes("limit-reminders")
  );
  check("account-deletion-entrypoint", () =>
    read("base44/functions/deleteAccount/entry.ts").includes("auth.me")
  );
  check("public-info-configuration", () => {
    const source = read("src/lib/public-info.ts");
    return ["VITE_LIMIT_PRIVACY_URL", "VITE_LIMIT_TERMS_URL", "VITE_LIMIT_SUPPORT_URL"].every(
      (name) => source.includes(name)
    );
  });
  check("public-info-entry-links", () => {
    const links = read("src/components/limit/PublicLinks.tsx");
    return (
      ["/privacy", "/terms", "/support"].every((route) => links.includes(`to="${route}"`)) &&
      read("src/components/AuthLayout.tsx").includes("<PublicLinks") &&
      read("src/pages/Profile.tsx").includes("<PublicLinks")
    );
  });
  return checks;
}

// Evidence is recorded after tests, so the ledger itself need not be part of the
// tested commit. Every other tracked file must still match; new application files
// also invalidate evidence. Synced local skill installations are not app source.
export function releaseRevision(root, candidateRevision) {
  if (!/^[a-f0-9]{40}$/.test(candidateRevision || "")) return "";
  try {
    execFileSync("git", ["cat-file", "-e", `${candidateRevision}^{commit}`], {
      cwd: root,
      stdio: "ignore",
    });
    execFileSync(
      "git",
      ["diff", "--quiet", candidateRevision, "--", ".", ":(exclude)release/app-store.json"],
      { cwd: root, stdio: "ignore" }
    );
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
    });
    if (
      untracked
        .split("\n")
        .some(
          (file) =>
            file &&
            file !== "release/app-store.json" &&
            file !== "skills-lock.json" &&
            !file.startsWith(".agents/")
        )
    )
      return "";
    return candidateRevision;
  } catch {
    return "";
  }
}

export function main(args = process.argv.slice(2)) {
  if (args.some((arg) => !["--code-only", "--json"].includes(arg))) {
    console.error("Usage: node scripts/check-app-store-readiness.mjs [--code-only] [--json]");
    return 2;
  }
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const read = (file) => readFileSync(resolve(root, file), "utf8");
  try {
    const config = JSON.parse(read("release/app-store.json"));
    const revision = releaseRevision(root, config?.candidate?.sourceRevision);
    const result = evaluateReadiness({ config, sourceChecks: inspectSource(read), revision });
    if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(
        `Source guards: ${result.codeReady ? "PASS" : "FAIL"}. App Store release: ${result.storeReady ? "EVIDENCE COMPLETE" : "NOT READY"}.`
      );
      for (const check of result.sourceChecks)
        console.log(`${check.passed ? "PASS" : "FAIL"} ${check.id}`);
      for (const blocker of result.blockers) console.log(`BLOCKED ${blocker}`);
      console.log(result.scope);
    }
    return (args.includes("--code-only") ? result.codeReady : result.storeReady) ? 0 : 1;
  } catch (error) {
    console.error(`Readiness check failed closed: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main();
}
