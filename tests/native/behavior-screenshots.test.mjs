import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSuccessfulFlowImages } from "../../scripts/native-behavior-diagnostics.mjs";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=",
  "base64"
);
const names = ["01-alpha-account", "02-saved-set"];
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "limit-checkpoint-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const flow = join(root, ".maestro", "tests", "2026-10-13_222000", "01-auth-and-save");
  const images = join(flow, "takeScreenshot");
  mkdirSync(images, { recursive: true });
  const entries = names.map((path) => ({
    command: { takeScreenshotCommand: { path } },
    metadata: { status: "COMPLETED" },
  }));
  const save = () => writeFileSync(join(flow, "commands.json"), JSON.stringify(entries));
  save();
  for (const name of names) writeFileSync(join(images, name + ".png"), png);
  return { root, flow, images, entries, save };
}
const read = (f, status = "passed") => readSuccessfulFlowImages(f.root, "01-auth-and-save", status);

test("only named completed checkpoint PNGs are collected, never raw or failed-step artifacts", (t) => {
  const f = fixture(t);
  mkdirSync(join(f.flow, "screenshots"));
  writeFileSync(join(f.flow, "screenshots", "final.png"), "private failure image");
  writeFileSync(join(f.images, "unexpected.png"), "private extra image");
  writeFileSync(join(f.flow, "manifest.json"), "private metadata");
  const images = read(f);
  assert.deepEqual(
    images.map((image) => image.name),
    names.map((name) => name + ".png")
  );
  for (const image of images) assert.deepEqual(image.bytes, png);
});

test("failed process or screenshot metadata cannot produce checkpoint evidence", (t) => {
  const f = fixture(t);
  for (const status of ["failed", "pending", undefined])
    assert.throws(() => readSuccessfulFlowImages(f.root, "01-auth-and-save", status));
  for (const status of ["FAILED", "SKIPPED", "RUNNING", undefined]) {
    f.entries[0].metadata.status = status;
    f.save();
    assert.throws(() => read(f));
  }
});

test("unknown flows, paths, missing or duplicate capture metadata are rejected", (t) => {
  const f = fixture(t);
  assert.throws(() => readSuccessfulFlowImages(f.root, "unknown", "passed"));
  for (const path of [
    "../01-alpha-account",
    "/tmp/01-alpha-account",
    "undefined",
    "02-saved-set",
  ]) {
    f.entries[0].command.takeScreenshotCommand.path = path;
    f.save();
    assert.throws(() => read(f));
  }
  f.entries[0].command.takeScreenshotCommand.path = names[0];
  f.entries.push(f.entries[0]);
  f.save();
  assert.throws(() => read(f));
  f.entries.splice(0, 2);
  f.save();
  assert.throws(() => read(f));
});

test("symlinked screenshot files, folders and ambiguous bundles are rejected", (t) => {
  const f = fixture(t),
    file = join(f.images, names[0] + ".png");
  const outside = join(f.root, "outside.png");
  writeFileSync(outside, png);
  rmSync(file);
  symlinkSync(outside, file);
  assert.throws(() => read(f));
  rmSync(file);
  writeFileSync(file, png);
  const target = join(f.root, "other-images");
  mkdirSync(target);
  rmSync(f.images, { recursive: true });
  symlinkSync(target, f.images);
  assert.throws(() => read(f));
  rmSync(f.images);
  mkdirSync(f.images);
  for (const name of names) writeFileSync(join(f.images, name + ".png"), png);
  writeFileSync(join(f.root, "commands.json"), "[]");
  assert.throws(() => read(f));
});

test("missing, malformed, oversized and excessive-dimension images fail closed", (t) => {
  const f = fixture(t),
    file = join(f.images, names[0] + ".png");
  rmSync(file);
  assert.throws(() => read(f));
  for (const bytes of [Buffer.from("not a png"), Buffer.alloc(8 * 1024 * 1024 + 1)]) {
    writeFileSync(file, bytes);
    assert.throws(() => read(f));
  }
  for (const dimension of [0, 4097]) {
    const bytes = Buffer.from(png);
    bytes.writeUInt32BE(dimension, 16);
    writeFileSync(file, bytes);
    assert.throws(() => read(f));
  }
});
