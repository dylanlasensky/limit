import { exerciseCatalog } from "../packages/domain/exerciseCatalog.js";
import { writeFileSync } from "node:fs";
const escape = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
writeFileSync(
  "docs/exercise-media-checklist.csv",
  [
    "catalog_key,name,equipment,media_status,license,reviewer,review_evidence",
    ...exerciseCatalog.map((e) =>
      [e.catalogKey, e.name, e.equipment, "missing", "", "", ""].map(escape).join(",")
    ),
  ].join("\n") + "\n"
);
