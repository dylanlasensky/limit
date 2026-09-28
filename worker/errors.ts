export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "INVALID_REQUEST"
  ) {
    super(message);
  }
}
export async function readJson(request: Request, max = 128 * 1024): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError("Use JSON for this request.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new ApiError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError("Invalid JSON.");
  }
}
