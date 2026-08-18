import {analyzeFoodImage} from '@/components/limit/foodImageAnalysis';
export const mobileCapabilities={camera:true,barcodeDatabase:false,nutritionLabelOCR:true,mealVision:true,healthKit:false,pushNotifications:false};
export async function requestCameraFile(input){return input?.files?.[0]||null}
export async function lookupBarcode(){throw new Error('No verified product nutrition database is connected. Scan the Nutrition Facts label instead.')}
export async function analyzeNutritionLabel(fileUrl,dietaryProfile){return analyzeFoodImage({fileUrl,scanMode:'food',dietaryProfile})}
export async function analyzeMealPhoto(fileUrl,dietaryProfile,clarification){return analyzeFoodImage({fileUrl,scanMode:'meal',dietaryProfile,clarification})}
export async function syncHealthKit(){throw new Error('HealthKit becomes available after native iOS packaging.')}