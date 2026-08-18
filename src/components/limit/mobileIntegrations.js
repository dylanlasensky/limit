export const mobileCapabilities={camera:false,barcodeDatabase:false,nutritionLabelOCR:false,mealVision:false,healthKit:false,pushNotifications:false};
export async function requestCameraFile(input){return input?.files?.[0]||null}
export async function lookupBarcode(){throw new Error('Connect a nutrition database to enable barcode lookup.')}
export async function analyzeNutritionLabel(){throw new Error('Connect an OCR service to analyze nutrition labels.')}
export async function analyzeMealPhoto(){throw new Error('Connect an image analysis service to estimate a meal.')}
export async function syncHealthKit(){throw new Error('HealthKit becomes available after native iOS packaging.')}