import assert from "node:assert/strict";

export function deployedWorkerVersion(output) {
  const version = output.match(/Current Version ID:\s*([0-9a-f-]{36})/i)?.[1];
  assert.ok(version, "Wrangler did not report a Worker version ID");
  return version;
}

export function assertHostedVersion(health, sourceRevision, expectedVersion) {
  assert.equal(health.sourceRevision, sourceRevision, "Hosted revision must match release source");
  if (expectedVersion)
    assert.equal(health.version, expectedVersion, "Hosted Worker version must match this deploy");
}
