// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const root = process.cwd();
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
  );
}
describe("production source integrity", () => {
  it("keeps regenerated platform scaffolding from shadowing TypeScript modules", () => {
    const source = files(path.join(root, "src"));
    const config = readFileSync(path.join(root, "vite.config.ts"), "utf8");
    const extensions = JSON.parse(config.match(/extensions:\s*(\[[^\]]+\])/)![1]);
    for (const file of source.filter((file) => /\.(jsx|js)$/.test(file))) {
      for (const extension of [".ts", ".tsx"]) {
        if (source.includes(file.replace(/\.(jsx|js)$/, extension))) {
          expect(extensions.indexOf(extension)).toBeGreaterThanOrEqual(0);
          expect(extensions.indexOf(extension)).toBeLessThan(
            extensions.indexOf(path.extname(file))
          );
        }
      }
    }
    expect(extensions.indexOf(".tsx")).toBeLessThan(extensions.indexOf(".jsx"));
  });
  it("ships the manifest referenced by index.html", () => {
    const manifest = JSON.parse(readFileSync(path.join(root, "public/manifest.json"), "utf8"));
    expect(manifest.name).toBe("LIMIT");
    expect(manifest.start_url).toBe("/");
    for (const icon of manifest.icons) {
      const data = readFileSync(path.join(root, "public", icon.src));
      expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(icon.sizes).toBe(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`);
      expect(icon.type).toBe("image/png");
    }
  });
  it("stores private records with owner references and restricts server mutations", () => {
    const schema = readFileSync("worker/migrations/0001_initial.sql", "utf8");
    const repo = readFileSync("worker/repository.ts", "utf8");
    expect(schema).toContain("REFERENCES user(id) ON DELETE CASCADE");
    for (const name of ["WorkoutSession", "ExerciseSet", "MuscleRatingSnapshot"])
      expect(repo).toContain(name);
    expect(repo).toContain("owner_id = ?");
  });
});
