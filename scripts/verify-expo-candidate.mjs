import { readFileSync } from "node:fs";

export function verifyExpoCandidate(config, env) {
  if (
    config?.ios?.bundleIdentifier !== env.LIMIT_BUNDLE_IDENTIFIER ||
    config?.ios?.appleTeamId !== env.LIMIT_APPLE_TEAM_ID ||
    config?.ios?.buildNumber !== env.LIMIT_NATIVE_BUILD ||
    config?.extra?.sourceRevision !== env.LIMIT_SOURCE_REVISION ||
    config?.extra?.eas?.projectId !== env.LIMIT_EAS_PROJECT_ID
  )
    throw new Error(
      "Expo candidate configuration does not match the tested source and owner values"
    );
  return true;
}

if (process.argv[1]?.endsWith("verify-expo-candidate.mjs")) {
  const config = JSON.parse(readFileSync(process.argv[2], "utf8"));
  verifyExpoCandidate(config, process.env);
  console.log("Expo release config matches the exact candidate and existing EAS project.");
}
