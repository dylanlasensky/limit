import assert from "node:assert/strict";

export async function playAndPauseVideo(video, catalogKey, timeoutMs = 20000) {
  try {
    assert.equal(await video.evaluate((v) => v.paused && !v.autoplay), true, "unexpected autoplay");
    await video.evaluate(async (v, timeoutMs) => {
      const diagnostic = () =>
        JSON.stringify({
          code: v.error?.code ?? null,
          message: v.error?.message ?? null,
          networkState: v.networkState,
          readyState: v.readyState,
          currentTime: v.currentTime,
        });
      let timer;
      let onProgress;
      let onError;
      try {
        await new Promise((resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Playback timeout: ${diagnostic()}`)),
            timeoutMs
          );
          onProgress = () => {
            if (v.currentTime > 0) resolve();
          };
          onError = () => reject(new Error(`Media error: ${diagnostic()}`));
          v.addEventListener("timeupdate", onProgress);
          v.addEventListener("error", onError);
          v.play().catch((error) =>
            reject(new Error(`${error.name}: ${error.message}; ${diagnostic()}`))
          );
        });
      } finally {
        clearTimeout(timer);
        v.removeEventListener("timeupdate", onProgress);
        v.removeEventListener("error", onError);
        v.pause();
      }
    }, timeoutMs);
  } catch (error) {
    throw new Error(`${catalogKey}: library playback failed: ${error.message}`, { cause: error });
  }
}

export async function playCompleteVideo(page, row, url, timeoutMs = 20000) {
  try {
    const result = await page.evaluate(
      async ({ url, timeoutMs }) => {
        const video = document.createElement("video");
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        video.style.width = "320px";
        document.body.appendChild(video);
        const diagnostic = () =>
          JSON.stringify({
            code: video.error?.code ?? null,
            message: video.error?.message ?? null,
            networkState: video.networkState,
            readyState: video.readyState,
            currentTime: video.currentTime,
          });
        let timer;
        try {
          await new Promise((resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error(`Playback timeout: ${diagnostic()}`)),
              timeoutMs
            );
            video.addEventListener("ended", resolve, { once: true });
            video.addEventListener(
              "error",
              () => reject(new Error(`Media error: ${diagnostic()}`)),
              { once: true }
            );
            video.src = url;
            video
              .play()
              .catch((error) =>
                reject(new Error(`${error.name}: ${error.message}; ${diagnostic()}`))
              );
          });
          return {
            duration: video.duration,
            currentTime: video.currentTime,
            frames: video.getVideoPlaybackQuality().totalVideoFrames,
            width: video.videoWidth,
            height: video.videoHeight,
          };
        } finally {
          clearTimeout(timer);
          video.pause();
          video.removeAttribute("src");
          video.load();
          video.remove();
        }
      },
      { url, timeoutMs }
    );
    assert.equal(result.duration, row.duration, "duration");
    assert.equal(result.currentTime, row.duration, "incomplete playback");
    assert.equal(result.width, row.width, "width");
    assert.equal(result.height, row.height, "height");
    assert.ok(result.frames >= 100, `too few decoded frames (${result.frames})`);
    return { catalogKey: row.catalogKey, ...result };
  } catch (error) {
    throw new Error(`${row.catalogKey}: full playback failed for ${url}: ${error.message}`, {
      cause: error,
    });
  }
}
