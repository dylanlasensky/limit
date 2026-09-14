import { base44 } from "@/api/base44Client";
import type { DietaryProfile } from "@/components/limit/data";

export type ScanMode = "food" | "meal";

export interface ScannedMealItem {
  name: string;
  amount?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  [key: string]: any;
}

export interface FoodScanResult {
  title?: string;
  brand?: string;
  variant?: string;
  message?: string;
  reliable?: boolean;
  servingSize?: string;
  servingsPerContainer?: number;
  nutrients?: Record<string, number>;
  items?: ScannedMealItem[];
  possibleAllergens?: string[];
  clarifyingQuestion?: string;
  [key: string]: any;
}

export interface AnalyzeFoodImageParams {
  fileUri: string;
  scanMode: ScanMode;
  dietaryProfile?: DietaryProfile | null;
  clarification?: string;
}

export async function uploadFoodImage(
  file: File
): Promise<{ fileUri: string; previewUrl: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a photo smaller than 10 MB.");
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return { fileUri: file_uri, previewUrl: URL.createObjectURL(file) };
}
export async function analyzeFoodImage({
  fileUri,
  scanMode,
  dietaryProfile,
  clarification,
}: AnalyzeFoodImageParams): Promise<FoodScanResult> {
  const { data } = await base44.functions.invoke("analyzeFoodPhoto", {
    fileUri,
    scanMode,
    allergies: dietaryProfile?.allergies || [],
    clarification,
  });
  return data as FoodScanResult;
}
export function conflictsFor(
  result: FoodScanResult,
  dietaryProfile?: DietaryProfile | null
): string[] {
  const saved = (dietaryProfile?.allergies || []).map((x) => x.toLowerCase());
  return (result.possibleAllergens || []).filter((x) =>
    saved.some((a) => x.toLowerCase().includes(a) || a.includes(x.toLowerCase()))
  );
}
