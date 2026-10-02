import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const evidence = JSON.parse(readFileSync(process.argv[2]));
assert.ok(evidence.reviewer?.trim());
assert.ok(Number.isFinite(Date.parse(evidence.reviewedAt)));
assert.ok(evidence.decisions?.length);
const rows = JSON.parse(readFileSync("media/manifest.json"));
const digest = createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
const path = `media/reviews/${digest}.json`;
for (const decision of evidence.decisions) {
  const row = rows.find((r) => r.catalogKey === decision.catalogKey);
  assert.ok(row?.source);
  assert.equal(row.videoSha256, decision.videoSha256);
  assert.ok(decision.notes?.trim().length >= 20);
  assert.ok(["approve", "reject"].includes(decision.decision));
  row.reviewStatus = decision.decision === "approve" ? "approved" : "draft";
  row.reviewer = evidence.reviewer;
  row.reviewEvidence = path;
}
mkdirSync("media/reviews", { recursive: true });
writeFileSync(path, JSON.stringify(evidence, null, 2) + "\n");
writeFileSync("media/manifest.json", JSON.stringify(rows, null, 2) + "\n");
console.log(
  "Recorded supplied human decisions against exact checksums. Review and commit the evidence before republishing."
);

const cell = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
const catalog = JSON.parse(readFileSync("media-output/catalog.json"));
writeFileSync(
  "docs/exercise-media-checklist.csv",
  [
    "catalog_key,name,equipment,media_status,license,reviewer,review_evidence,block_reason",
    ...rows.map((r) =>
      [
        r.catalogKey,
        r.name,
        catalog.find((e) => e.catalogKey === r.catalogKey)?.equipment,
        r.reviewStatus,
        r.license,
        r.reviewer,
        r.reviewEvidence,
        r.blockReason,
      ]
        .map(cell)
        .join(",")
    ),
  ].join("\n") + "\n"
);
