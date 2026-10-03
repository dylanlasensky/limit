import assert from "node:assert/strict";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Replay a bounded slice sequentially. The output is checksum-bound so a
// later run can distinguish a regenerated clip from the clip it tested.
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index < 0 ? fallback : args[index + 1];
};
const start = Number(value("--start", "0"));
const count = Number(value("--count", "25"));
const output = value("--out", "media-output/browser-playback.jsonl");
assert.ok(Number.isInteger(start) && start >= 0);
assert.ok(Number.isInteger(count) && count > 0 && count <= 25);
const rows = JSON.parse(readFileSync("media/manifest.json", "utf8")).filter((row) => row.reviewStatus === "technical");
const selected = rows.slice(start, start + count);
assert.ok(selected.length > 0);
const moduleUrl = process.env.LIMIT_PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.LIMIT_PLAYWRIGHT_MODULE)).href
  : "@playwright/test";
const { chromium } = await import(moduleUrl);
writeFileSync("media-output/playback.html", "<!doctype html><title>Local media playback check</title>");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve("media-output/playback.html")).href);
  for (const row of selected) {
    const url = pathToFileURL(resolve("media-output", row.catalogKey, "movement.mp4")).href;
    const result = await page.evaluate(async (src) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      document.body.appendChild(video);
      video.src = src;
      try {
        await video.play();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Playback timeout")), 20000);
          video.addEventListener("ended", () => { clearTimeout(timeout); resolve(); }, { once: true });
          video.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Video error")); }, { once: true });
        });
        return { duration: video.duration, currentTime: video.currentTime,
          frames: video.getVideoPlaybackQuality().totalVideoFrames,
          width: video.videoWidth, height: video.videoHeight };
      } finally { video.remove(); }
    }, url);
    assert.equal(result.duration, 8);
    assert.equal(result.currentTime, 8);
    assert.equal(result.width, 960);
    assert.equal(result.height, 540);
    assert.ok(result.frames >= 180, `${row.catalogKey}: fewer than 180 rendered frames`);
    const observation = { catalogKey: row.catalogKey, videoSha256: row.videoSha256, ...result };
    appendFileSync(output, JSON.stringify(observation) + "\n");
    console.log(JSON.stringify(observation));
  }
} finally {
  await browser.close();
}
