import { limitApi } from "@/api/client";
import { readExercisePages, enrichExercise } from "../../../packages/domain/exerciseLibrary.js";
export { exerciseSearch } from "../../../packages/domain/exerciseLibrary.js";

export async function listExercises(): Promise<any[]> {
  const rows = await readExercisePages(limitApi.entities.Exercise);
  return rows.map(enrichExercise).sort((a, b) => a.name.localeCompare(b.name));
}
