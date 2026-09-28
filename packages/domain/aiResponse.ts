// Workers AI JSON mode can return a parsed object or JSON text in response.
// Keep the value unknown until the caller validates its exact domain schema.
export function aiResponse(result: unknown): unknown {
  const value =
    result && typeof result === "object" && "response" in result ? result.response : result;
  return typeof value === "string" ? JSON.parse(value) : value;
}
