import assert from "node:assert/strict";

// Decode otool's little-endian words (or individual bytes) on supported simulator hosts.
// Decode only the bounded entitlement section, never arbitrary binary/log contents.
export function decodeSimulatorEntitlements(output) {
  assert.equal(typeof output, "string");
  assert.ok(
    output.length > 0 && output.length <= 65536,
    "Missing or oversized entitlement section"
  );
  const chunks = output
    .trim()
    .split("\n")
    .map((line) => {
      const [address, ...words] = line.trim().split(/\s+/);
      assert.ok(
        /^[a-fA-F0-9]{16}$/.test(address) && words.length > 0 && words.length <= 16,
        "Invalid simulator entitlement section"
      );
      return Buffer.concat(
        words.map((word) => {
          assert.ok(/^(?:[a-fA-F0-9]{2}){1,4}$/.test(word), "Invalid entitlement word");
          return Buffer.from(word, "hex").reverse();
        })
      );
    });
  const xml = Buffer.concat(chunks).toString("utf8").replace(/\0+$/, "").trim();
  assert.ok(xml.startsWith("<?xml") && xml.endsWith("</plist>"), "Missing entitlement plist");
  return xml;
}

export function validateSimulatorSignature({ signature, entitlements, platform, hasProfile }) {
  assert.equal(platform, "iPhoneSimulator", "Only simulator products are permitted");
  assert.equal(hasProfile, false, "A provisioning profile is forbidden");
  assert.ok(/^Signature=adhoc$/m.test(signature), "Only local ad hoc signing is permitted");
  assert.ok(/^TeamIdentifier=not set$/m.test(signature), "A developer team is forbidden");
  assert.ok(!/^Authority=/m.test(signature), "A signing certificate is forbidden");
  assert.ok(
    entitlements &&
      typeof entitlements === "object" &&
      Object.keys(entitlements).length === 1 &&
      entitlements["application-identifier"] === "FAKETEAMID.com.example.limit.simulator",
    "Only the disposable simulator app's own identifier is permitted"
  );
  return { kind: "simulator-ad-hoc", ownApplicationIdentifier: true, developerIdentity: false };
}
