// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertHostedVersion, deployedWorkerVersion } from "../../scripts/release-version.mjs";

describe("release Worker version guard", () => {
  const source = "a".repeat(40);
  const previous = "4039104a-df79-41dc-8ae2-30fc8d3d9aed";
  const deployed = "b221ce09-b7cb-4b7e-b3a7-1591d425b57c";

  it("requires the new deployment even when the previous Worker has the same source", () => {
    expect(deployedWorkerVersion(`Uploaded LIMIT\nCurrent Version ID: ${deployed}\n`)).toBe(
      deployed
    );
    expect(() =>
      assertHostedVersion({ sourceRevision: source, version: previous }, source, deployed)
    ).toThrow("Hosted Worker version must match this deploy");
    expect(() =>
      assertHostedVersion({ sourceRevision: source, version: deployed }, source, deployed)
    ).not.toThrow();
  });

  it("rejects missing deploy metadata and a mismatched source", () => {
    expect(() => deployedWorkerVersion("Uploaded LIMIT without a version")).toThrow();
    expect(() =>
      assertHostedVersion({ sourceRevision: "old", version: deployed }, source, deployed)
    ).toThrow("Hosted revision must match release source");
  });
});
