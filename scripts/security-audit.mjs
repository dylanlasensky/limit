import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const exceptions = JSON.parse(
  readFileSync(new URL("../security/audit-exceptions.json", import.meta.url))
);
let failed = false;
for (const args of [[], ["--prefix", "worker"]]) {
  const result = spawnSync("npm", ["audit", "--json", ...args], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error("Audit did not return valid JSON");
  }
  if (result.error || report.error || ![0, 1].includes(result.status))
    throw new Error("Audit service failed; refusing to pass");
  const findings = report.vulnerabilities || {};
  const visited = new Set();
  function inspect(name) {
    if (visited.has(name)) return;
    visited.add(name);
    for (const via of findings[name]?.via || []) {
      if (typeof via === "string") {
        inspect(via);
        continue;
      }
      const id = via.url.split("/").pop(),
        rule = exceptions[id];
      const permitted =
        !args.length &&
        rule?.package === via.name &&
        new Date() < new Date(rule.expires + "T00:00:00Z");
      console.log(
        `${permitted ? "TEMPORARY EXCEPTION" : "BLOCKED"} ${id} (${via.name}, ${via.severity})${permitted ? " expires " + rule.expires : ""}`
      );
      if (!permitted) failed = true;
    }
  }
  Object.keys(findings).forEach(inspect);
  console.log(
    `${args.length ? "Worker" : "Web/native/tooling"} audit: ${report.metadata?.vulnerabilities?.total || 0} affected dependency nodes`
  );
}
if (failed) process.exitCode = 1;
