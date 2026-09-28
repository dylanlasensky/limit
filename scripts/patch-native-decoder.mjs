// Expo Router still uses query-string 7's CommonJS import. Its patched decoder
// is ESM; normalize that one import until Router adopts the upstream fix.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../apps/mobile/package.json", import.meta.url));
const file = require.resolve("query-string");
const source = readFileSync(file, "utf8");
const before = "const decodeComponent = require('decode-uri-component');";
const after =
  "const decoderModule = require('decode-uri-component');\nconst decodeComponent = decoderModule.default || decoderModule;";
if (source.includes(before)) writeFileSync(file, source.replace(before, after));
else if (!source.includes(after))
  throw new Error("Review the Expo URL decoder compatibility patch after this dependency update.");
