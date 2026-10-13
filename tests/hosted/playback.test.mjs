import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { playAndPauseVideo, playCompleteVideo } from "./playback.mjs";

test("hosted playback completes valid media and identifies broken, mismatched and stalled clips", async () => {
  const bytes = readFileSync("tests/fixtures/generated-squat.mp4");
  const server = createServer((request, response) => {
    if (request.url === "/valid.mp4") {
      response.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": bytes.length });
      response.end(bytes);
    } else if (request.url !== "/stalled.mp4") {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const row = { catalogKey: "bodyweight-squat", duration: 8, width: 960, height: 540 };
    const result = await playCompleteVideo(page, row, origin + "/valid.mp4");
    assert.equal(result.currentTime, 8);
    await assert.rejects(
      playCompleteVideo(page, { ...row, catalogKey: "broken-exercise" }, origin + "/missing.mp4"),
      /broken-exercise: full playback failed.*(Media error|NotSupportedError)/
    );
    await assert.rejects(
      playCompleteVideo(
        page,
        { ...row, catalogKey: "stalled-exercise" },
        origin + "/stalled.mp4",
        100
      ),
      /stalled-exercise: full playback failed.*Playback timeout/
    );
    await assert.rejects(
      playCompleteVideo(page, { ...row, width: 10 }, origin + "/valid.mp4"),
      /bodyweight-squat: full playback failed.*width/
    );
    assert.equal(await page.locator("video").count(), 0);
    await page.setContent(`<video muted playsinline src="${origin}/valid.mp4"></video>`);
    const video = page.locator("video");
    await playAndPauseVideo(video, "library-squat");
    assert.equal(await video.evaluate((v) => v.paused && v.currentTime > 0), true);
    await video.evaluate((v, url) => {
      v.src = url;
    }, origin + "/stalled.mp4");
    await assert.rejects(
      playAndPauseVideo(video, "library-stalled", 100),
      /library-stalled: library playback failed.*Playback timeout.*networkState/
    );
    assert.equal(await video.evaluate((v) => v.paused), true);
    await video.evaluate((v) => {
      v.autoplay = true;
    });
    await assert.rejects(playAndPauseVideo(video, "library-autoplay"), /unexpected autoplay/);
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
