import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { Image } from "@/components/ui/image";
import {
  analyzeFoodImage,
  conflictsFor,
  uploadFoodImage,
  type FoodScanResult,
  type ScanMode,
} from "@/components/limit/foodImageAnalysis";
import type { DietaryProfile } from "@/components/limit/data";
import ScannedFoodEditor from "@/components/limit/ScannedFoodEditor";
import ScannedMealEditor from "@/components/limit/ScannedMealEditor";
import AiConsent, { AI_CONSENT_VERSION } from "@/components/limit/AiConsent";
interface FoodPhotoScannerProps {
  mode: ScanMode;
  dietaryProfile?: DietaryProfile | null;
  onDone: () => void;
  onManual: () => void;
  initialMealType?: string;
}
export default function FoodPhotoScanner({
  mode,
  dietaryProfile,
  onDone,
  onManual,
  initialMealType,
}: FoodPhotoScannerProps) {
  const pending = useRef<AbortController>();
  useEffect(() => () => pending.current?.abort(), []);
  const [url, setUrl] = useState(""),
    [fileUri, setFileUri] = useState(""),
    [result, setResult] = useState<FoodScanResult | undefined>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [answer, setAnswer] = useState("");
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );
  const analyze = async (
    fileUri: string,
    clarification?: string,
    uploadRequest?: AbortController
  ) => {
    if (!consent || uploadRequest?.signal.aborted) return;
    if (!uploadRequest) pending.current?.abort();
    const request = uploadRequest || new AbortController();
    pending.current = request;
    setLoading(true);
    setError("");
    try {
      const next = await analyzeFoodImage({
        fileUri,
        scanMode: mode,
        dietaryProfile,
        clarification,
        aiConsent: AI_CONSENT_VERSION,
      });
      if (request.signal.aborted) return;
      if (clarification) next.clarifyingQuestion = "";
      setResult(next);
    } catch (e: any) {
      if (request.signal.aborted) return;
      setError(e.message || "We could not analyze this photo.");
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  };
  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !consent) return;
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setLoading(true);
    try {
      const upload = await uploadFoodImage(file, AI_CONSENT_VERSION);
      if (request.signal.aborted) {
        URL.revokeObjectURL(upload.previewUrl);
        return;
      }
      setFileUri(upload.fileUri);
      setUrl(upload.previewUrl);
      await analyze(upload.fileUri, undefined, request);
    } catch (err: any) {
      if (request.signal.aborted) return;
      setError(err.message || "Upload failed.");
      setLoading(false);
    }
  };
  const reset = () => {
    pending.current?.abort();
    if (url) URL.revokeObjectURL(url);
    setUrl("");
    setFileUri("");
    setResult(undefined);
    setError("");
  };
  if (result?.clarifyingQuestion && mode === "meal")
    return (
      <div className="space-y-3">
        <AiConsent
          checked={consent}
          onChange={setConsent}
          disabled={loading}
          purpose="refine the food estimate"
          dataDescription="the selected food photo, saved allergies, and your clarification"
        />
        <p className="font-bold">One quick question</p>
        <p className="text-sm text-muted-foreground">{result.clarifyingQuestion}</p>
        <input
          value={answer}
          aria-label="Clarifying answer"
          onChange={(e) => setAnswer(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3"
        />
        <button
          onClick={() => analyze(fileUri, answer)}
          disabled={!answer || loading || !consent}
          className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
        >
          Refine estimate
        </button>
        <button
          onClick={() => setResult({ ...result, clarifyingQuestion: "" })}
          className="h-10 w-full text-sm text-muted-foreground"
        >
          Use current estimate
        </button>
      </div>
    );
  if (result && mode === "food" && !result.reliable)
    return (
      <div className="space-y-4">
        <p className="text-xs font-medium text-primary">Nutrition not verified</p>
        <h3 className="text-xl font-semibold">
          {[result.brand, result.title, result.variant].filter(Boolean).join(" ")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {result.message ||
            "We couldn't verify the nutrition information. Scan the Nutrition Facts label for a more accurate result."}
        </p>
        <button
          onClick={reset}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Scan nutrition label
        </button>
      </div>
    );
  if (result)
    return mode === "meal" ? (
      <ScannedMealEditor
        initialMealType={initialMealType}
        result={result}
        conflicts={conflictsFor(result, dietaryProfile)}
        onDone={onDone}
      />
    ) : (
      <ScannedFoodEditor initialMealType={initialMealType} result={result} onDone={onDone} />
    );
  return (
    <div className="space-y-4">
      <AiConsent
        checked={consent}
        onChange={setConsent}
        disabled={loading}
        purpose="estimate food nutrition"
        dataDescription="the food photo you choose, saved allergies, and any clarification you enter"
      />
      {url && (
        <Image
          src={url}
          alt="Selected food"
          className="h-48 w-full rounded-2xl"
          fittingType="fill"
        />
      )}
      {loading ? (
        <div className="grid min-h-40 place-items-center text-center">
          <div>
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
            <p className="mt-3 text-sm">Analyzing photo…</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {mode === "meal"
              ? "Photograph the full plate in good lighting."
              : "Photograph a Nutrition Facts label or the front of the package."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid h-24 cursor-pointer place-items-center rounded-xl border border-border bg-secondary text-sm font-semibold focus-within:ring-2 focus-within:ring-primary">
              <span className="text-center">
                <Camera className="mx-auto mb-2" />
                Camera
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={choose}
                disabled={!consent}
                className="sr-only"
              />
            </label>
            <label className="grid h-24 cursor-pointer place-items-center rounded-xl border border-border bg-secondary text-sm font-semibold focus-within:ring-2 focus-within:ring-primary">
              <span className="text-center">
                <ImagePlus className="mx-auto mb-2" />
                Photo Library
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={choose}
                disabled={!consent}
                className="sr-only"
              />
            </label>
          </div>
        </>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>{error}</p>
          <div className="mt-3 flex gap-3">
            <button
              disabled={!consent}
              onClick={() => fileUri && analyze(fileUri)}
              className="min-h-10 font-bold"
            >
              Try again
            </button>
            <button onClick={onManual} className="min-h-10 font-bold text-primary">
              Enter manually
            </button>
          </div>
        </div>
      )}
      {!loading && (
        <button onClick={onManual} className="min-h-11 w-full text-sm font-semibold text-primary">
          Enter food manually instead
        </button>
      )}
    </div>
  );
}
