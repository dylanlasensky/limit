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
