import { exerciseCatalog, normalizeExerciseName } from "../base44/shared/exerciseCatalog.js";
import { readExercisePages, syncExerciseCatalog } from "../base44/shared/exerciseLibrary.js";

// Emits a self-contained server-side script, consumed by the authenticated Base44 CLI.
// No credentials are read or embedded here. Production deploys are serialized by CI.
console.log(`
${normalizeExerciseName.toString()}
${readExercisePages.toString()}
${syncExerciseCatalog.toString()}
const catalog = ${JSON.stringify(exerciseCatalog)};
const entity = base44.entities.Exercise;
const before = await readExercisePages(entity);
const result = await syncExerciseCatalog(entity, catalog, before);
const after = await readExercisePages(entity);
const keys = new Set(after.map(row => row.catalogKey));
const missing = catalog.filter(row => !keys.has(row.catalogKey));
if (missing.length) throw new Error("Exercise verification failed: " + missing.length + " missing entries.");
console.log(JSON.stringify({ ...result, total: after.length, curated: catalog.length, verified: true }));
`);
