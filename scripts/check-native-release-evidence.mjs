const productionOrigin = "https://limit.limit-dylanlasensky.workers.dev";

export function checkNativeReleaseEvidence({
  revision,
  health,
  checkRuns,
  nativeCheckName,
  apiCheckName,
}) {
  if (!/^[a-f0-9]{40}$/.test(revision || "")) throw new Error("Invalid candidate revision");
  if (
    health?.status !== "ok" ||
    health?.environment !== "production" ||
    health?.sourceRevision !== revision ||
    !health?.version ||
    health.version === "local"
  )
    throw new Error(
      "Production API health, source revision, or deployed version does not match this candidate"
    );
  if (!nativeCheckName || !apiCheckName || nativeCheckName === apiCheckName)
    throw new Error(
      "Distinct native launch and old-client API compatibility check names are required"
    );
  for (const name of [nativeCheckName, apiCheckName]) {
    const matches = (checkRuns || []).filter(
      (run) =>
        run.name === name &&
        run.head_sha === revision &&
        run.status === "completed" &&
        run.conclusion === "success"
    );
    if (!matches.length) throw new Error(`Missing successful exact-source evidence: ${name}`);
  }
  return true;
}

if (process.argv[1]?.endsWith("check-native-release-evidence.mjs")) {
  const revision = process.env.LIMIT_SOURCE_REVISION;
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (repo !== "dylanlasensky/limit" || !token || !/^[a-f0-9]{40}$/.test(revision || ""))
    throw new Error("Expected LIMIT repository, GitHub token, and exact candidate revision");
  const getJson = async (url, headers = {}) => {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Release evidence request failed: ${response.status}`);
    return response.json();
  };
  const health = await getJson(`${productionOrigin}/api/health`);
  const checks = await getJson(
    `https://api.github.com/repos/${repo}/commits/${revision}/check-runs?per_page=100`,
    {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }
  );
  if (checks.total_count > 100)
    throw new Error("Check-run evidence exceeds one page; refusing incomplete verification");
  checkNativeReleaseEvidence({
    revision,
    health,
    checkRuns: checks.check_runs,
    nativeCheckName: process.env.LIMIT_UNSIGNED_NATIVE_CHECK_NAME,
    apiCheckName: process.env.LIMIT_MOBILE_API_CHECK_NAME,
  });
  console.log(
    `Exact-source native launch, old-client compatibility and production API revision verified: ${revision}`
  );
}
