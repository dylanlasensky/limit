// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluateReadiness,
  inspectSource,
  REQUIRED_EVIDENCE,
  validPublicUrl,
} from "../../scripts/check-app-store-readiness.mjs";

const revision = "a".repeat(40);
const now = new Date("2026-09-15T12:00:00Z");
const sourceChecks = [{ id: "synthetic-source-check", passed: true }];
// Synthetic data only; this fixture is not release evidence or a real sign-off.
function verifiedFixture(): any {
  return {
    schemaVersion: 1,
    platform: "ios",
    packaging: "base44",
    candidate: {
      sourceRevision: revision,
      appVersion: "1.0.0",
      buildNumber: "1",
      bundleIdentifier: "com.synthetic.fixture",
      developerTeamId: "TESTTEAM01",
      publishedUrl: "https://limit-55abb6d1.base44.app",
    },
    legal: {
      businessName: "Synthetic test fixture",
      privacyUrl: "https://github.com/test/privacy",
      termsUrl: "https://github.com/test/terms",
      supportUrl: "https://github.com/test/support",
    },
    commerce: { mode: "no-paid-features" },
    checks: Object.fromEntries(
      Object.keys(REQUIRED_EVIDENCE).map((id) => [
        id,
        {
          status: "verified",
          sourceRevision: revision,
          checkedAt: "2026-09-15T11:00:00Z",
          reviewedBy: "Synthetic fixture",
          evidenceUrl: "https://github.com/test/evidence",
        },
      ])
    ),
  };
}

describe("App Store readiness gate", () => {
  it("keeps the checked-in release unverified instead of inventing launch approval", () => {
    const config = JSON.parse(readFileSync("release/app-store.json", "utf8"));
    const result = evaluateReadiness({ config, revision, sourceChecks, now });
    expect(result.codeReady).toBe(true);
    expect(result.storeReady).toBe(false);
    expect(result.blockers.some((item) => item.includes("nativeAuthentication"))).toBe(true);
    expect(result.blockers.some((item) => item.includes("Commerce remains"))).toBe(true);
  });

  it("distinguishes complete evidence records from source guards", () => {
    const config = verifiedFixture();
    expect(evaluateReadiness({ config, revision, sourceChecks, now }).storeReady).toBe(true);
    const result = evaluateReadiness({
      config,
      revision,
      sourceChecks: [{ id: "broken-source", passed: false }],
      now,
    });
    expect(result.codeReady).toBe(false);
    expect(result.storeReady).toBe(false);
  });

  it.each(["unverified", "not-applicable", "pending", "passed"])(
    "does not accept %s as release verification",
    (status) => {
      const config = verifiedFixture();
      config.checks.nativePackage.status = status;
      expect(evaluateReadiness({ config, revision, sourceChecks, now }).storeReady).toBe(false);
    }
  );

  it("does not allow omitted checks to disappear from the requirements", () => {
    const config = verifiedFixture();
    delete config.checks.accountDeletion;
    expect(
      evaluateReadiness({ config, revision, sourceChecks, now }).blockers.some((item) =>
        item.startsWith("accountDeletion:")
      )
    ).toBe(true);
  });

  it.each(["2026-01-01T00:00:00Z", "2026-09-16T00:00:00Z", "not a date"])(
    "rejects expired, future or malformed evidence time %s",
    (checkedAt) => {
      const config = verifiedFixture();
      config.checks.nativeSDK.checkedAt = checkedAt;
      expect(evaluateReadiness({ config, revision, sourceChecks, now }).storeReady).toBe(false);
    }
  );

  it("rejects code or evidence from another revision", () => {
    const config = verifiedFixture();
    expect(
      evaluateReadiness({ config, revision: "b".repeat(40), sourceChecks, now }).storeReady
    ).toBe(false);
    config.checks.releaseTests.sourceRevision = "b".repeat(40);
    expect(evaluateReadiness({ config, revision, sourceChecks, now }).storeReady).toBe(false);
  });

  it.each([
    null,
    "http://github.com/test/evidence",
    "https://example.com/privacy",
    "https://192.168.0.1/privacy",
    "https://localhost/privacy",
    "https://test.local/privacy",
    "https://secret@github.com/test/evidence",
  ])("rejects missing, placeholder or unsafe public URL %s", (url) => {
    expect(validPublicUrl(url)).toBe(false);
  });

  it("fails closed when a required source file is missing", () => {
    const checks = inspectSource(() => {
      throw new Error("missing");
    });
    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((item) => !item.passed)).toBe(true);
  });
});
