// Fixed categories only: neither matching lines nor raw tool output leave this boundary.
const failurePatterns = [
  ["driver-startup-timeout", /iOS driver not ready in time|IOSDriverTimeoutException/i],
  ["connection-refused", /Connection refused|ConnectException/i],
  ["driver-unreachable", /Transport unreachable|XCUITestServerError[.$]Unreachable/i],
  ["socket-timeout", /SocketTimeoutException|Read timed out/i],
  ["xctest-failure", /xcodebuild: error:|\*\* TEST (?:EXECUTE )?FAILED \*\*/i],
  ["application-unavailable", /Lost connection to the application|Error getting main window/i],
  ["java-runtime", /UnsupportedClassVersionError|NoClassDefFoundError/i],
];

export function classifyDriverOutput(stdout, stderr) {
  const output = [stdout, stderr].filter((value) => typeof value === "string").join("\n");
  return failurePatterns
    .filter(([, pattern]) => pattern.test(output))
    .map(([category]) => category);
}

export function summarizeStockHierarchy(output) {
  try {
    const root = JSON.parse(output);
    if (!root || typeof root !== "object" || Array.isArray(root)) throw new Error();
    const queue = [root];
    let visited = 0;
    let settingsVisible = false;
    while (queue.length && visited++ < 10000) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      // Never examine text, title, value, URLs or arbitrary label contents.
      if (node.attributes?.accessibilityText === "Settings") settingsVisible = true;
      if (Array.isArray(node.children)) queue.push(...node.children);
    }
    return { parsedHierarchy: true, stockSettingsVisible: settingsVisible };
  } catch {
    return { parsedHierarchy: false, stockSettingsVisible: false };
  }
}

// Only known toolchain/model formats are retained; arbitrary names/paths are omitted.
export function summarizeProbeEnvironment(env, xcode, device, runtime) {
  const match = (value, pattern) =>
    typeof value === "string" && pattern.test(value) ? value : null;
  return {
    runnerImage: match(env.ImageOS, /^macos\d+(?:-arm64)?$/),
    runnerImageVersion: match(env.ImageVersion, /^\d{8}\.\d{1,5}\.\d{1,3}$/),
    runnerArch: match(env.RUNNER_ARCH, /^(?:ARM64|X64)$/),
    xcodeVersion: /^Xcode (\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)$/m.exec(xcode)?.[1] || null,
    xcodeBuild: /^Build version ([A-Z0-9]{4,12})$/m.exec(xcode)?.[1] || null,
    deviceModel: match(device?.name, /^iPhone \d{1,2}(?: (?:Pro|Max|Plus|mini|Air|e)){0,2}$/),
    runtime: match(
      runtime,
      /^com\.apple\.CoreSimulator\.SimRuntime\.iOS-\d{1,2}-\d{1,2}(?:-\d{1,2})?$/
    ),
  };
}

export function summarizeDeviceState(inventory, udid) {
  const entry = Object.values(inventory?.devices || {})
    .flat()
    .find((d) => d?.udid === udid);
  return new Set(["Shutdown", "Booting", "Booted", "Shutting Down"]).has(entry?.state)
    ? entry.state
    : "unavailable";
}

export function createBootProgress() {
  let pending = "";
  let discarding = false;
  const result = { events: [], lastProgress: null, linesObserved: 0, oversizedLines: 0 };
  const categories = [
    ["backboard", /Waiting on BackBoard/i],
    ["data-migration", /Waiting on Data Migration/i],
    ["system-app", /Waiting on System App/i],
    ["boot-finished", /Finished|Booted successfully/i],
  ];
  const accept = (line, elapsedMs) => {
    result.linesObserved++;
    const category = categories.find(([, pattern]) => pattern.test(line))?.[0];
    const status = /\bStatus: (\d{1,3})\b/.exec(line);
    const elapsed = /\bTotal Elapsed: (\d{1,3}):(\d{2})\b/.exec(line);
    if (!category && !status && !elapsed) return;
    const event = {
      receivedAtMs: Math.max(0, Math.min(900000, Math.floor(elapsedMs))),
      category: category || "status",
      statusCode: status ? Number(status[1]) : null,
      reportedElapsedSeconds:
        elapsed && Number(elapsed[2]) < 60 ? Number(elapsed[1]) * 60 + Number(elapsed[2]) : null,
    };
    result.lastProgress = event;
    result.events.push(event);
    if (result.events.length > 32) result.events.shift();
  };
  return {
    result,
    consume(chunk, elapsedMs) {
      // Bound retained raw text even when a process emits a line without a newline.
      for (const part of String(chunk).split(/(?<=\n)/)) {
        if (!discarding && pending.length + part.length <= 4096) pending += part;
        else if (!discarding) {
          pending = "";
          discarding = true;
          result.oversizedLines++;
        }
        if (part.endsWith("\n")) {
          if (!discarding) accept(pending, elapsedMs);
          pending = "";
          discarding = false;
        }
      }
    },
    finish(elapsedMs) {
      if (pending && !discarding) accept(pending, elapsedMs);
      pending = "";
    },
  };
}
