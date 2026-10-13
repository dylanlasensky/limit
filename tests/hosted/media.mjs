import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { playCompleteVideo } from "./playback.mjs";

const origin = process.env.LIMIT_API_URL;
assert.ok(origin?.startsWith("https://"));
const manifest = readFileSync("media/manifest.json");
const rows = JSON.parse(manifest).filter((row) => row.source);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const runnerSha256 = digest(
  Buffer.concat(
    ["tests/hosted/media.mjs", "tests/hosted/playback.mjs"].map((path) => readFileSync(path))
  )
);
const runId = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`;
mkdirSync("release-evidence", { recursive: true });
const evidencePath = `release-evidence/media-${runId}.jsonl`;
writeFileSync(evidencePath, "", { flag: "wx" });
const record = (event) => {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...event });
  appendFileSync(evidencePath, line + "\n");
  console.log(line);
};
const health = async () => {
  const response = await fetch(`${origin}/api/health`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, "health HTTP status");
  return response.json();
};
let browser;
let current = { stage: "health", catalogKey: null };
try {
  const before = await health();
  assert.equal(before.sourceRevision, process.env.LIMIT_EXPECT_SOURCE_REVISION || sourceRevision);
  if (process.env.LIMIT_EXPECT_WORKER_VERSION)
    assert.equal(before.version, process.env.LIMIT_EXPECT_WORKER_VERSION);
  record({
    event: "started",
    runId,
    origin,
    sourceRevision,
    runnerSha256,
    manifestSha256: digest(manifest),
    health: before,
    total: rows.length,
  });
  for (const [index, row] of rows.entries()) {
    current = { stage: "checksum-and-range", catalogKey: row.catalogKey };
    const response = await fetch(`${origin}/api/media/${row.catalogKey}`, {
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, `${row.catalogKey}: metadata HTTP status`);
    const info = await response.json();
    assert.equal(info.videoSha256, row.videoSha256, `${row.catalogKey}: manifest checksum`);
    const url = `${origin}/api/media/${row.catalogKey}/${row.version}/video`;
    const full = await fetch(url, { signal: AbortSignal.timeout(15000) });
    assert.equal(full.status, 200, `${row.catalogKey}: full HTTP status`);
    assert.equal(
      digest(new Uint8Array(await full.arrayBuffer())),
      row.videoSha256,
      `${row.catalogKey}: bytes checksum`
    );
    const range = await fetch(url, {
      headers: { range: "bytes=0-63" },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(range.status, 206, `${row.catalogKey}: range HTTP status`);
    assert.equal((await range.arrayBuffer()).byteLength, 64, `${row.catalogKey}: range length`);
    assert.match(range.headers.get("content-range"), /^bytes 0-63\//);
    record({
      event: "checksum-passed",
      index: index + 1,
      total: rows.length,
      catalogKey: row.catalogKey,
    });
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  current = { stage: "public-pages", catalogKey: null };
  for (const route of [
    "/privacy",
    "/terms",
    "/support",
    "/data-export",
    "/account-deletion",
    "/ai-disclosure",
  ]) {
    const response = await page.goto(origin + route);
    assert.equal(response.status(), 200, route);
    assert.ok(await page.locator("h1").textContent(), route);
  }
  current = { stage: "exercise-library-playback", catalogKey: "bodyweight-squat" };
  await page.goto(origin + "/exercises");
  await page
    .getByRole("textbox", { name: "Search exercises", exact: true })
    .fill("Bodyweight Squat");
  await page.getByRole("button", { name: /^Bodyweight Squat / }).click();
  const video = page.locator("video");
  await video.waitFor();
  assert.equal(await video.evaluate((v) => v.paused && !v.autoplay), true);
  await video.evaluate((v) => v.play());
  await page.waitForFunction(() => document.querySelector("video")?.currentTime > 0);
  await video.evaluate((v) => v.pause());
  for (const [index, row] of rows.entries()) {
    current = { stage: "full-playback", catalogKey: row.catalogKey };
    record({ event: "playback-started", index: index + 1, total: rows.length, ...current });
    const result = await playCompleteVideo(
      page,
      row,
      `${origin}/api/media/${row.catalogKey}/${row.version}/video`
    );
    record({ event: "playback-passed", index: index + 1, total: rows.length, ...result });
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  current = { stage: "final-health", catalogKey: null };
  const after = await health();
  assert.equal(after.sourceRevision, before.sourceRevision, "source changed during acceptance");
  assert.equal(after.version, before.version, "Worker version changed during acceptance");
  record({
    event: "passed",
    mediaChecksums: rows.length,
    completePlaybacks: rows.length,
    publicPages: 6,
    health: after,
  });
} catch (error) {
  record({ event: "failed", ...current, message: error.message });
  throw error;
} finally {
  await browser?.close();
}
