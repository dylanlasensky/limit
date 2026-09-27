// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ACCOUNT_ENTITIES } from "../../packages/domain/accountData.js";
import { tables } from "../../packages/contracts/tables";
import { requireAiConsent } from "../../packages/domain/aiConsent.js";
describe("privacy contracts", () => {
  it("includes every private entity in export and deletion", () => {
    expect([...ACCOUNT_ENTITIES].sort()).toEqual(
      Object.keys(tables)
        .filter((x) => x !== "Exercise")
        .sort()
    );
  });
  it("rejects missing and obsolete AI consent", () => {
    expect(() => requireAiConsent({})).toThrow();
    expect(() => requireAiConsent({ consent: { accepted: true, version: "obsolete" } })).toThrow();
  });
});
