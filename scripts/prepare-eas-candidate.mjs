import { readFileSync, writeFileSync } from "node:fs";

export function prepareEasCandidate(config, env) {
  const required = [
    "LIMIT_SOURCE_REVISION",
    "LIMIT_BUNDLE_IDENTIFIER",
    "LIMIT_APPLE_TEAM_ID",
    "LIMIT_NATIVE_BUILD",
    "LIMIT_EAS_PROJECT_ID",
    "LIMIT_ASC_APP_ID",
  ];
  for (const name of required) if (!env[name]) throw new Error(`Missing ${name}`);
  if (config?.build?.production?.env?.LIMIT_NATIVE_RELEASE !== "true")
    throw new Error("Production EAS profile must enable native release mode");
  const productionOrigin = "https://limit.limit-dylanlasensky.workers.dev";
  if (
    config.build.production.env.EXPO_PUBLIC_API_URL !== productionOrigin ||
    env.EXPO_PUBLIC_API_URL !== productionOrigin
  )
    throw new Error("Production EAS profile and candidate must use the approved API origin");
  return {
    ...config,
    build: {
      ...config.build,
      production: {
        ...config.build.production,
        env: {
          ...config.build.production.env,
          ...Object.fromEntries(
            required.filter((name) => name !== "LIMIT_ASC_APP_ID").map((name) => [name, env[name]])
          ),
        },
      },
    },
    submit: {
      ...config.submit,
      production: {
        ...config.submit?.production,
        ios: { ...config.submit?.production?.ios, ascAppId: env.LIMIT_ASC_APP_ID },
      },
    },
  };
}

if (process.argv[1]?.endsWith("prepare-eas-candidate.mjs")) {
  const path = "apps/mobile/eas.json";
  const prepared = prepareEasCandidate(JSON.parse(readFileSync(path, "utf8")), process.env);
  writeFileSync(path, `${JSON.stringify(prepared, null, 2)}\n`);
  console.log("Prepared EAS production environment and existing App Store Connect app target.");
}
