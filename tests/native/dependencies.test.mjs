import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../apps/mobile/package.json", import.meta.url));
const query = require("query-string");
test("Expo deep links retain Unicode and tolerate malformed encodings with the patched decoder", () => {
  assert.equal(query.parse("q=caf%C3%A9").q, "café");
  const input = "%FE%FF".repeat(1000),
    start = performance.now();
  assert.equal(typeof query.parse("q=" + input).q, "string");
  assert.ok(
    performance.now() - start < 1000,
    "Malformed input should not trigger exponential decoding"
  );
  assert.equal(query.stringify({ workout: "a b", set: 2 }), "set=2&workout=a%20b");
});
test("the native project generator retains compatible UUID output", () => {
  const folder = mkdtempSync(join(tmpdir(), "limit-xcode-"));
  try {
    const path = join(folder, "project.pbxproj");
    writeFileSync(
      path,
      "{archiveVersion = 1; classes = {}; objectVersion = 56; objects = {}; rootObject = 000000000000000000000001;}\n"
    );
    const project = require("xcode").project(path);
    project.parseSync();
    assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
  } finally {
    rmSync(folder, { recursive: true });
  }
});
