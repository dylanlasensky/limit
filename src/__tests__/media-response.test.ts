// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { mediaAsset } from "../../worker/files";
import manifest from "../../media/manifest.json";

vi.mock("../../worker/budget", () => ({ storageBudget: vi.fn() }));
vi.mock("../../worker/repository", () => ({ Repository: vi.fn() }));

describe("R2 media HTTP range semantics", () => {
  it.each([false, true])(
    "returns the correct full or partial response (range=%s)",
    async (partial) => {
      const media = manifest.find((row) => row.source)!;
      const bytes = new Uint8Array(partial ? 64 : 128).fill(42);
      const get = vi.fn(async () => ({
        body: bytes,
        size: 128,
        // Hosted R2 can supply range metadata even for a complete object.
        range: { offset: 0, length: bytes.length },
        httpEtag: '"test-etag"',
        writeHttpMetadata: (headers: Headers) => headers.set("Content-Type", "video/mp4"),
      }));
      const env = {
        DB: {
          prepare: () => ({
            bind: () => ({ first: async () => ({ data: JSON.stringify(media) }) }),
          }),
        },
        MEDIA: { get },
      } as unknown as Env;
      const request = new Request("https://limit.example/api/media/video", {
        headers: partial ? { Range: "bytes=0-63" } : {},
      });
      const response = await mediaAsset(request, env, media.catalogKey, media.version, "video");
      expect(response.status).toBe(partial ? 206 : 200);
      expect(response.headers.get("content-range")).toBe(partial ? "bytes 0-63/128" : null);
      expect(response.headers.get("content-length")).toBe(String(bytes.length));
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
      expect(get).toHaveBeenCalledWith(
        media.source,
        partial ? { range: request.headers } : undefined
      );
    }
  );
});
