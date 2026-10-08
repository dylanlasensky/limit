import type { ConfigContext, ExpoConfig } from "expo/config";
const productionApiOrigin = "https://limit.limit-dylanlasensky.workers.dev";
export default ({ config }: ConfigContext): ExpoConfig => {
  const bundle = process.env.LIMIT_BUNDLE_IDENTIFIER;
  const team = process.env.LIMIT_APPLE_TEAM_ID;
  const build = process.env.LIMIT_NATIVE_BUILD;
  const revision = process.env.LIMIT_SOURCE_REVISION;
  if (process.env.LIMIT_NATIVE_RELEASE === "true") {
    if (process.env.EXPO_PUBLIC_API_URL !== productionApiOrigin)
      throw new Error(`Set EXPO_PUBLIC_API_URL to ${productionApiOrigin} for a native release.`);
    if (
      !bundle ||
      !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(bundle) ||
      /example|placeholder/.test(bundle)
    )
      throw new Error("Set an owner-approved LIMIT_BUNDLE_IDENTIFIER.");
    if (!team || !/^[A-Z0-9]{10}$/.test(team))
      throw new Error("Set the owned LIMIT_APPLE_TEAM_ID.");
    if (!build || !/^[1-9][0-9]*$/.test(build))
      throw new Error("Set a new positive LIMIT_NATIVE_BUILD.");
    if (!revision || !/^[a-f0-9]{40}$/.test(revision))
      throw new Error("Pin LIMIT_SOURCE_REVISION to the tested commit.");
  }
  return {
    ...config,
    name: "LIMIT",
    slug: "limit",
    ios: {
      ...config.ios,
      ...(bundle ? { bundleIdentifier: bundle } : {}),
      ...(team ? { appleTeamId: team } : {}),
      ...(build ? { buildNumber: build } : {}),
    },
    android: {
      ...config.android,
      ...(bundle ? { package: bundle } : {}),
      ...(build ? { versionCode: Number(build) } : {}),
    },
    extra: { ...config.extra, sourceRevision: revision || "development" },
  };
};
