import { analyzeFoodImage, type FoodScanResult } from "@/components/limit/foodImageAnalysis";
import type { DietaryProfile } from "@/components/limit/data";
export const mobileCapabilities = {
  camera: true,
  barcodeDatabase: false,
  nutritionLabelOCR: true,
  mealVision: true,
  healthKit: false,
  pushNotifications: false,
};
export async function requestCameraFile(input?: HTMLInputElement | null): Promise<File | null> {
  return input?.files?.[0] || null;
}
export async function lookupBarcode(): Promise<never> {
  throw new Error(
    "No verified product nutrition database is connected. Scan the Nutrition Facts label instead."
  );
}
export async function analyzeNutritionLabel(
  fileUrl: string,
  dietaryProfile?: DietaryProfile | null
): Promise<FoodScanResult> {
  return analyzeFoodImage({ fileUri: fileUrl, scanMode: "food", dietaryProfile });
}
export async function analyzeMealPhoto(
  fileUrl: string,
  dietaryProfile?: DietaryProfile | null,
  clarification?: string
): Promise<FoodScanResult> {
  return analyzeFoodImage({
    fileUri: fileUrl,
    scanMode: "meal",
    dietaryProfile,
    clarification,
  });
}
export async function syncHealthKit(): Promise<never> {
  throw new Error("HealthKit becomes available after native iOS packaging.");
}
