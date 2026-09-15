import { base44 } from "@/api/base44Client";
import { readExercisePages, enrichExercise } from "../../../base44/shared/exerciseLibrary.js";
export { exerciseSearch } from "../../../base44/shared/exerciseLibrary.js";

export async function listExercises(): Promise<any[]> {
  const rows = await readExercisePages(base44.entities.Exercise);
  return rows.map(enrichExercise).sort((a, b) => a.name.localeCompare(b.name));
}
