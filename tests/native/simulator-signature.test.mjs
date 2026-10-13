import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decodeSimulatorEntitlements,
  validateSimulatorSignature,
} from "../../scripts/native-simulator-signature.mjs";

const valid = () => ({
  signature: "Signature=adhoc\nTeamIdentifier=not set\n",
  platform: "iPhoneSimulator",
  hasProfile: false,
  entitlements: { "application-identifier": "FAKETEAMID.com.example.limit.simulator" },
});
test("decodes an actual Xcode simulator entitlement section", () => {
  const output = readFileSync(
    new URL("./fixtures/simulator-entitlements.txt", import.meta.url),
    "utf8"
  );
  const xml = decodeSimulatorEntitlements(output);
  assert.match(xml, /<key>application-identifier<\/key>/);
  assert.match(xml, /<string>FAKETEAMID.com.example.limit.keychainprobe<\/string>/);
});
test("rejects absent, malformed, truncated and oversized entitlement sections", () => {
  for (const value of [
    "",
    "no section",
    "a".repeat(65537),
    "0000000100000000 3",
    "0000000100000000 6d783f3c",
  ])
    assert.throws(() => decodeSimulatorEntitlements(value));
});
test("allows only local simulator signing and its own synthetic application identifier", () => {
  assert.deepEqual(validateSimulatorSignature(valid()), {
    kind: "simulator-ad-hoc",
    ownApplicationIdentifier: true,
    developerIdentity: false,
  });
});
test("rejects physical-device products, profiles, developer identities and extra access groups", () => {
  const cases = [
    { platform: "iPhoneOS" },
    { hasProfile: true },
    { signature: "Signature=adhoc\nTeamIdentifier=REALTEAMID\n" },
    { signature: "Signature=adhoc\nTeamIdentifier=not set\nAuthority=Apple Development\n" },
    { signature: "Signature=developer\nTeamIdentifier=not set\n" },
    { entitlements: {} },
    { entitlements: { "application-identifier": "other.app" } },
    { entitlements: { ...valid().entitlements, "keychain-access-groups": ["other.app"] } },
  ];
  for (const override of cases)
    assert.throws(() => validateSimulatorSignature({ ...valid(), ...override }));
});
