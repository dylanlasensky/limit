const unit = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
export function aiTelemetry(
  feature: "coach" | "text-import",
  status: "success" | "provider" | "budget" | "safety-refusal",
  correlation: string,
  latencyMs: number,
  reportedUsage?: unknown
) {
  const usage =
    reportedUsage && typeof reportedUsage === "object"
      ? (reportedUsage as Record<string, unknown>)
      : {};
  const inputTokens = unit(usage.prompt_tokens),
    outputTokens = unit(usage.completion_tokens);
  return {
    event: "ai",
    provider: "workers-ai",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    feature,
    status,
    correlation,
    latencyMs: unit(latencyMs),
    inputTokens,
    outputTokens,
    neurons: unit(usage.neurons),
    estimatedCostUsd:
      inputTokens !== null && outputTokens !== null
        ? (inputTokens * 0.293 + outputTokens * 2.253) / 1e6
        : null,
    priceBasis: "2026-09-27 public model price; free quota may cover usage",
  };
}
