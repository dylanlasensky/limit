import { promisify } from "node:util";
import { execFileSync, execFile } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const environment = process.argv[2];
assert.ok(["preview", "production"].includes(environment));
execFileSync(process.execPath, ["scripts/media/validate.mjs", "--files"], { stdio: "inherit" });
const rows = JSON.parse(readFileSync("media/manifest.json"));
const bucket = environment === "preview" ? "limit-preview-media" : "limit-production-media";
const progressPath = `media-output/upload-${environment}.json`;
const done = existsSync(progressPath) ? JSON.parse(readFileSync(progressPath)) : {};
const run = (args) => execFileSync("npx", ["wrangler", ...args], { stdio: "inherit" });
const info = JSON.parse(
  execFileSync("npx", ["wrangler", "r2", "bucket", "info", bucket, "--json"], { encoding: "utf8" })
);
assert.equal(info.default_storage_class, "Standard");
const size = String(info.bucket_size).match(/^([\d.]+) (B|kB|KB|MB|GB|KiB|MiB|GiB)$/);
assert.ok(size, "Unrecognized bucket size; check usage before uploading");
const unit = {
  B: 1,
  kB: 1000,
  KB: 1000,
  MB: 1e6,
  GB: 1e9,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
};
assert.ok(
  Number(size[1]) * unit[size[2]] + rows.reduce((n, r) => n + r.bytes, 0) < 500 * 1024 ** 2,
  "Conservative bucket storage budget reached"
);
const entries = rows.flatMap((row) =>
  [
    [row.poster, "poster.png", row.posterSha256, "image/png"],
    [row.source, "movement.mp4", row.videoSha256, "video/mp4"],
  ]
    .filter(([key]) => key)
    .map(([key, file, checksum, type]) => ({
      key,
      file,
      checksum,
      type,
      catalogKey: row.catalogKey,
    }))
);
assert.ok(entries.length <= 1000);
assert.ok(
  Number(info.object_count) + entries.length <= 5000,
  "Review old versions before adding more objects"
);
const execute = promisify(execFile);
let next = 0,
  completed = 0;
async function uploader() {
  while (next < entries.length) {
    const item = entries[next++];
    if (done[item.key]) {
      assert.equal(done[item.key], item.checksum);
      continue;
    }
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++)
      try {
        await execute(
          "npx",
          [
            "wrangler",
            "r2",
            "object",
            "put",
            bucket + "/" + item.key,
            "--remote",
            "--file",
            `media-output/${item.catalogKey}/${item.file}`,
            "--content-type",
            item.type,
            "--cache-control",
            "public,max-age=31536000,immutable",
          ],
          { maxBuffer: 1024 * 1024 }
        );
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    if (lastError)
      throw new Error("R2 upload failed for " + item.catalogKey + "; retry using the checkpoint");
    done[item.key] = item.checksum;
    writeFileSync(progressPath, JSON.stringify(done, null, 2));
    completed++;
    if (completed % 25 === 0) console.log("Uploaded " + completed + " assets to " + bucket);
  }
}
const results = await Promise.allSettled(Array.from({ length: 4 }, () => uploader()));
for (const result of results) if (result.status === "rejected") throw result.reason;
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
writeFileSync(
  "media-output/publish.sql",
  rows
    .map(
      (r) =>
        `INSERT INTO exercise_media(catalog_key,version,data) VALUES(${quote(r.catalogKey)},${r.version},${quote(JSON.stringify(r))}) ON CONFLICT(catalog_key) DO UPDATE SET version=excluded.version,data=excluded.data;`
    )
    .join("\n")
);
run([
  "d1",
  "execute",
  "DB",
  "--remote",
  "--env",
  environment,
  "--file",
  "media-output/publish.sql",
]);
console.log("Media manifest published after all files uploaded.");
