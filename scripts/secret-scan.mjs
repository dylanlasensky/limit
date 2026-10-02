import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/,
  /\bre_[A-Za-z0-9]{28,}\b/,
  /(?:RESEND_API_KEY|BETTER_AUTH_SECRET|CLOUDFLARE_API_TOKEN)\s*[=:]\s*["'][A-Za-z0-9_/-]{28,}["']/,
];
const files = [
  ...new Set(
    execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean)
  ),
];
let failed = false;
for (const file of files) {
  let data;
  try {
    data = readFileSync(file);
  } catch {
    continue;
  }
  if (data.includes(0)) continue;
  for (const [index, line] of data.toString().split("\n").entries())
    if (patterns.some((p) => p.test(line))) {
      console.error(`Possible credential: ${file}:${index + 1}`);
      failed = true;
    }
}
console.log(
  `Credential-pattern scan checked ${files.length} files; secret values are never printed.`
);
if (failed) process.exitCode = 1;
