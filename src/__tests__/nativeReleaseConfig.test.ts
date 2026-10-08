import { afterEach, describe, expect, it } from "vitest";
import nativeConfig from "../../apps/mobile/app.config";

const variables = [
  "LIMIT_NATIVE_RELEASE",
  "LIMIT_BUNDLE_IDENTIFIER",
  "LIMIT_APPLE_TEAM_ID",
  "LIMIT_NATIVE_BUILD",
  "LIMIT_SOURCE_REVISION",
  "EXPO_PUBLIC_API_URL",
] as const;
const original = Object.fromEntries(variables.map((key) => [key, process.env[key]]));
const configContext = { config: { name: "LIMIT", slug: "limit" } } as Parameters<
  typeof nativeConfig
>[0];
const productionOrigin = "https://limit.limit-dylanlasensky.workers.dev";

afterEach(() => {
  for (const key of variables) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("native release API origin", () => {
  it.each([
    undefined,
    "",
    "http://limit.limit-dylanlasensky.workers.dev",
    "https://limit-preview.limit-dylanlasensky.workers.dev",
    `${productionOrigin}/`,
    "https://attacker.example",
  ])("rejects an unsafe release API origin: %s", (origin) => {
    process.env.LIMIT_NATIVE_RELEASE = "true";
    process.env.LIMIT_BUNDLE_IDENTIFIER = "com.limit.fitness";
    process.env.LIMIT_APPLE_TEAM_ID = "ABCDEFGHIJ";
    process.env.LIMIT_NATIVE_BUILD = "1";
    process.env.LIMIT_SOURCE_REVISION = "a".repeat(40);
    if (origin === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = origin;
    expect(() => nativeConfig(configContext)).toThrow("EXPO_PUBLIC_API_URL");
  });

  it("accepts the exact production origin for a release", () => {
    process.env.LIMIT_NATIVE_RELEASE = "true";
    process.env.EXPO_PUBLIC_API_URL = productionOrigin;
    process.env.LIMIT_BUNDLE_IDENTIFIER = "com.limit.fitness";
    process.env.LIMIT_APPLE_TEAM_ID = "ABCDEFGHIJ";
    process.env.LIMIT_NATIVE_BUILD = "1";
    process.env.LIMIT_SOURCE_REVISION = "a".repeat(40);
    expect(nativeConfig(configContext).extra?.sourceRevision).toBe("a".repeat(40));
  });

  it("allows preview for development", () => {
    delete process.env.LIMIT_NATIVE_RELEASE;
    process.env.EXPO_PUBLIC_API_URL = "https://limit-preview.limit-dylanlasensky.workers.dev";
    expect(nativeConfig(configContext).slug).toBe("limit");
  });
});
