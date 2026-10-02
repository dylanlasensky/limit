import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

export function probeVideo(path, ffmpeg = process.env.FFMPEG || "ffmpeg") {
  const run = spawnSync(
    ffmpeg,
    ["-hide_banner", "-i", path, "-f", "null", "-", "-progress", "pipe:1"],
    { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }
  );
  assert.equal(run.status, 0, `${path}: full video decode failed: ${run.stderr}`);
  const metadata = run.stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const stream = run.stderr.match(
    /Stream #0:\d+[^\n]*Video: (h264)[^\n]*?, (yuv420p)[^\n]*?, (\d+)x(\d+)[^\n]*?, (\d+(?:\.\d+)?) fps/
  );
  const progress = [...run.stdout.matchAll(/^frame=(\d+)$/gm)].at(-1);
  const elapsed = [...run.stdout.matchAll(/^out_time_us=(\d+)$/gm)].at(-1);
  assert.ok(metadata && stream && progress && elapsed, `${path}: incomplete probe metadata`);
  return {
    duration: Number(metadata[1]) * 3600 + Number(metadata[2]) * 60 + Number(metadata[3]),
    codec: stream[1],
    pixelFormat: stream[2],
    width: Number(stream[3]),
    height: Number(stream[4]),
    fps: Number(stream[5]),
    frames: Number(progress[1]),
    decodedMicros: Number(elapsed[1]),
    audio: /Stream #0:\d+[^\n]*Audio:/.test(run.stderr),
  };
}

if (process.argv[1]?.endsWith("/probe.mjs")) {
  assert.ok(process.argv.includes("--write"), "Use --write to refresh technical evidence");
  const rows = JSON.parse(readFileSync("media/manifest.json"));
  const evidence = rows
    .filter((row) => row.source)
    .map((row) => {
      const path = `media-output/${row.catalogKey}/movement.mp4`;
      const videoSha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
      assert.equal(videoSha256, row.videoSha256, `${row.catalogKey}: manifest checksum mismatch`);
      return { catalogKey: row.catalogKey, videoSha256, ...probeVideo(path) };
    });
  writeFileSync("media/technical-evidence.json", JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify({ probed: evidence.length, decodedFrames: evidence.reduce((n, e) => n + e.frames, 0) }));
}
