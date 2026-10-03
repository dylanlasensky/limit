import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const expected = {
  "index.js": "332ea07c7b006361aad12aa994ca75dc1db8e8382b884909e2f38f10b85c88a4",
  "lib/compile.js": "b651f7715e6db8942ce61d3394357b4d81c8ece88240aa31a458ea1165edd195",
  "lib/constants.js": "f9fb688959232eee3e6ad7906a5b0e3234815db49ee857ef86983d65b917dc7c",
  "lib/expand.js": "2974d5b8763a358d81dfa5b4b804329f525239f34429c396b93a540219504809",
  "lib/parse.js": "ef9b3851f848460daaf91ff248222a43e266f97c4f2df7010cb7858e1e39a107",
  "lib/stringify.js": "645f13c68af685148e9fe8eca449ee2ebb88eee0f27de7b2125fbfc175b1584d",
  "lib/utils.js": "b5a7596aa67730412b3c029ef09e84e6b67b8e445cffd35d1d295549c89066c7",
  "package.json": "aac00677be00f2af8ebe5710232c211632945de610de32d27db2b54582f05115",
};

for (const [path, digest] of Object.entries(expected)) {
  const source = readFileSync(resolve(root, "vendor/braces", path));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    digest,
    `Vendored braces source changed: ${path}`
  );
}
assert.equal(
  realpathSync(require.resolve("braces")),
  resolve(root, "vendor/braces/index.js"),
  "The installed braces package must resolve to the reviewed local fork"
);
const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));
assert.deepEqual(
  Object.keys(lock.packages)
    .filter((path) => path.endsWith("/braces"))
    .sort(),
  ["node_modules/braces", "vendor/braces"],
  "Unexpected braces copy in the lockfile"
);
assert.equal(lock.packages["node_modules/braces"].resolved, "vendor/braces");
assert.equal(lock.packages["vendor/braces"].version, "3.0.4-limit.1");
console.log("Reviewed local braces fork, source hashes, and install path verified.");
