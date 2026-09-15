// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCOUNT_ENTITIES } from "../../base44/shared/accountData.js";
describe("privacy server wiring", () => {
  it("requires request consent before every AI call or file signing, and never elevates file access", () => {
    for (const name of ["askLimitCoach", "parseWorkoutRegimen", "analyzeFoodPhoto"]) {
      const source = readFileSync(`base44/functions/${name}/entry.ts`, "utf8");
      expect(source).toMatch(/req.method\s*!==\s*['"]POST['"]/);
      expect(source.indexOf("requireAiConsent(input)")).toBeLessThan(
        source.indexOf("Core.InvokeLLM")
      );
      expect(source).toMatch(/model:\s*AI_MODEL/);
      expect(source).not.toContain("asServiceRole.integrations.Core.CreateFileSignedUrl");
      if (source.includes("Core.CreateFileSignedUrl"))
        expect(source.indexOf("requireAiConsent(input)")).toBeLessThan(
          source.indexOf("Core.CreateFileSignedUrl")
        );
    }
  });
  it("accounts for every private entity and never exports unrestricted identity records", () => {
    const personal = readdirSync("base44/entities")
      .map((x) => x.replace(".jsonc", ""))
      .filter((x) => !["User", "Exercise"].includes(x));
    expect([...ACCOUNT_ENTITIES].sort()).toEqual(personal.sort());
    const source = readFileSync("base44/functions/exportAccount/entry.ts", "utf8");
    expect(source).toContain("base44.auth.me()");
    expect(source).toContain("exportAccountData(base44, user)");
    expect(source).not.toContain("req.json()");
    expect(source).toContain('"Cache-Control": "no-store"');
  });
});
