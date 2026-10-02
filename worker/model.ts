import { aiTelemetry } from "../packages/domain/aiTelemetry";
import { aiBudget } from "./budget";
const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as const;
type Input = {
  messages: { role: string; content: string }[];
  max_tokens: number;
  response_format?: { type: "json_object" };
};
export async function runModel(env: Env, feature: "coach" | "text-import", input: Input) {
  const started = Date.now(),
    correlation = crypto.randomUUID();
  try {
    await aiBudget(env);
    const output = await env.AI.run(model, input);
    const usage = (
      output as { usage?: { prompt_tokens?: number; completion_tokens?: number; neurons?: number } }
    ).usage;
    console.log(
      JSON.stringify(aiTelemetry(feature, "success", correlation, Date.now() - started, usage))
    );
    return output;
  } catch (error) {
    const category =
      error && typeof error === "object" && "code" in error && error.code === "FREE_LIMIT_REACHED"
        ? "budget"
        : "provider";
    console.log(JSON.stringify(aiTelemetry(feature, category, correlation, Date.now() - started)));
    throw error;
  }
}
