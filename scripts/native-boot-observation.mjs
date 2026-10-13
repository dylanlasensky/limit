import { spawn } from "node:child_process";
import { createBootProgress } from "./native-driver-probe-support.mjs";
import { summarizeProcess } from "./native-behavior-diagnostics.mjs";

// Observe one boot command. Stream only fixed progress fields; never retain raw output.
export async function observeBoot(command, args, env, timeoutMs, onProgress = () => {}) {
  const startedAt = Date.now();
  const stdout = createBootProgress();
  const stderr = createBootProgress();
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let error;
  let timedOut = false;
  let forceKill;
  const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  const snapshot = () => ({
    stdout: stdout.result,
    stderr: stderr.result,
    elapsedMs: Date.now() - startedAt,
    stdoutBytes,
    stderrBytes,
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBytes += Buffer.byteLength(chunk);
    stdout.consume(chunk, Date.now() - startedAt);
    onProgress(snapshot());
  });
  child.stderr.on("data", (chunk) => {
    stderrBytes += Buffer.byteLength(chunk);
    stderr.consume(chunk, Date.now() - startedAt);
    onProgress(snapshot());
  });
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    forceKill = setTimeout(() => child.kill("SIGKILL"), 5000);
  }, timeoutMs);
  child.on("error", (failure) => {
    error = failure;
  });
  const exit = await new Promise((resolve) =>
    child.on("close", (status, signal) => resolve({ status, signal }))
  );
  clearTimeout(timeout);
  clearTimeout(forceKill);
  stdout.finish(Date.now() - startedAt);
  stderr.finish(Date.now() - startedAt);
  return {
    ...summarizeProcess({ ...exit, error: timedOut ? { code: "ETIMEDOUT" } : error }, startedAt),
    progress: snapshot(),
  };
}
