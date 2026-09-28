import { modelChoiceSchema } from "./proposals";
export async function guidanceChoice(
  question: string,
  hasLimitations: boolean,
  provider?: () => Promise<unknown>
) {
  let emphasis: "consistency" | "technique" | "recovery" | "nutrition" =
    /food|diet|nutrition|calorie|allerg/i.test(question)
      ? "nutrition"
      : /pain|injur|recover|sore/i.test(question)
        ? "recovery"
        : "consistency";
  let source: "workers-ai" | "deterministic" = "deterministic";
  if (provider)
    try {
      const value = await provider();
      const parsed = modelChoiceSchema.safeParse(
        typeof value === "string" ? JSON.parse(value) : value
      );
      if (parsed.success) {
        emphasis = parsed.data.emphasis;
        source = "workers-ai";
      }
    } catch {
      /* Outages, exhausted free quota and malformed output use the same fallback. */
    }
  if (hasLimitations || /pain|injur|recover|sore/i.test(question)) emphasis = "recovery";
  return { emphasis, source };
}
