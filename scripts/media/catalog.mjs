import { exerciseCatalog } from "../../packages/domain/exerciseCatalog.js";
import { mkdirSync, writeFileSync } from "node:fs";
const output = process.argv[2] || "media-output";
mkdirSync(output, { recursive: true });
writeFileSync(output + "/catalog.json", JSON.stringify(exerciseCatalog, null, 2));
