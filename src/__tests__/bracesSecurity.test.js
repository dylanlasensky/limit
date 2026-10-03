// @vitest-environment node
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const braces = require("braces");
const micromatch = require("micromatch");

function nestedAst(depth) {
  let node = { type: "text", value: "a" };
  for (let index = 0; index < depth; index++) node = { type: "brace", nodes: [node] };
  return { type: "root", nodes: [node] };
}

describe("first-party braces depth guard", () => {
  it("resolves the reviewed local fork while retaining normal glob behavior", () => {
    expect(realpathSync(require.resolve("braces"))).toContain("/vendor/braces/index.js");
    expect(require("braces/package.json").version).toBe("3.0.4-limit.1");
    expect(braces.expand("{a,b}")).toEqual(["a", "b"]);
    expect(micromatch(["a.ts", "b.js"], "*.ts")).toEqual(["a.ts"]);
  });

  it("rejects deeply nested string patterns before exhausting the stack", () => {
    const bracesInput = "{".repeat(101) + "a,b" + "}".repeat(101);
    const parenthesesInput = "(".repeat(101) + ")".repeat(101);
    expect(() => braces.parse(bracesInput)).toThrow(/exceeds max depth/);
    expect(() => braces.parse(parenthesesInput)).toThrow(/exceeds max depth/);
    expect(() => braces.parse("{{a,b},c}", { maxDepth: 1 })).toThrow(/exceeds max depth/);
    expect(() => braces.parse("{{a,b},c}", { maxDepth: 2 })).not.toThrow();
  });

  it("guards each direct AST entry point and preserves the 100-level boundary", () => {
    for (const operation of ["compile", "expand", "stringify"]) {
      expect(() => braces[operation](nestedAst(100))).not.toThrow();
      expect(() => braces[operation](nestedAst(101))).toThrow(/exceeds max depth/);
      expect(() => braces[operation](nestedAst(101), { maxDepth: 1000 })).toThrow(
        /exceeds max depth/
      );
    }
  });
});
