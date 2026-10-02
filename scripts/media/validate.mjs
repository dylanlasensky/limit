import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { exerciseCatalog } from "../../packages/domain/exerciseCatalog.js";
const rows = JSON.parse(readFileSync("media/manifest.json"));
assert.equal(rows.length, exerciseCatalog.length);
assert.equal(new Set(rows.map((r) => r.catalogKey)).size, rows.length);
const byKey = new Map(exerciseCatalog.map((e) => [e.catalogKey, e]));
let bytes = 0;
const videos = new Set();
for (const row of rows) {
  const exercise = byKey.get(row.catalogKey);
  assert.ok(exercise);
  assert.equal(row.name, exercise.name);
  assert.ok(["technical", "blocked", "approved", "draft"].includes(row.reviewStatus));
  assert.equal(row.generated, true);
  assert.deepEqual(row.textFallback, exercise.instructions || []);
  assert.ok(row.posterSha256?.match(/^[a-f0-9]{64}$/));
  bytes += row.bytes;
  if (row.source) {
    assert.ok(row.source.startsWith(`exercises/${row.catalogKey}/v${row.version}/`));
    assert.equal(row.width, 960);
    assert.equal(row.height, 540);
    assert.equal(row.duration, 8);
    assert.equal(row.fps, 24);
    assert.ok(row.technicalChecks.includes("full-decode"));
    assert.ok(!videos.has(row.videoSha256), "Duplicate video identity");
    videos.add(row.videoSha256);
  } else {
    assert.equal(row.reviewStatus, "blocked");
    assert.ok(row.blockReason.includes(row.name));
  }
  if (["approved", "draft"].includes(row.reviewStatus)) {
    assert.ok(row.reviewer);
    assert.ok(/^media\/reviews\/[a-f0-9]{64}\.json$/.test(row.reviewEvidence));
    const evidence = JSON.parse(readFileSync(row.reviewEvidence));
    assert.equal(
      row.reviewEvidence,
      `media/reviews/${createHash("sha256").update(JSON.stringify(evidence)).digest("hex")}.json`
    );
    assert.equal(evidence.reviewer, row.reviewer);
    assert.ok(
      Number.isFinite(Date.parse(evidence.reviewedAt)) &&
        Date.parse(evidence.reviewedAt) <= Date.now()
    );
    assert.ok(
      evidence.decisions.some(
        (decision) =>
          decision.catalogKey === row.catalogKey &&
          decision.videoSha256 === row.videoSha256 &&
          decision.decision === (row.reviewStatus === "approved" ? "approve" : "reject") &&
          decision.notes?.trim().length >= 20
      )
    );
  } else assert.equal(row.reviewer, null);
  for (const [name, checksum] of [
    ["poster.png", row.posterSha256],
    ["movement.mp4", row.videoSha256],
  ]) {
    if (!checksum) continue;
    const path = `media-output/${row.catalogKey}/${name}`;
    if (process.argv.includes("--files")) assert.ok(existsSync(path), `Missing ${path}`);
    if (existsSync(path))
      assert.equal(
        createHash("sha256").update(readFileSync(path)).digest("hex"),
        checksum,
        `Changed asset ${path}; increment its immutable version`
      );
  }
}
assert.ok(bytes < 500 * 1024 * 1024, "Media exceeds per-environment free-tier allocation");
console.log(
  JSON.stringify({
    catalog: rows.length,
    technical: rows.filter((r) => r.reviewStatus === "technical").length,
    humanApproved: rows.filter((r) => r.reviewStatus === "approved").length,
    blocked: rows.filter((r) => r.reviewStatus === "blocked").length,
    bytes,
  })
);
