export const REQUEST_DEADLINE_MS = 30_000;
export class RequestDeadlineError extends Error {
  constructor() {
    super("The request took too long. Your connection may be interrupted.");
    this.name = "RequestDeadlineError";
  }
}
// One deadline includes response-body consumption. It never retries a mutation.
export async function withRequestDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal | null
): Promise<T> {
  const cancelled = () =>
    parent?.reason ?? Object.assign(new Error("Request cancelled."), { name: "AbortError" });
  if (parent?.aborted) throw cancelled();
  const controller = new AbortController();
  let rejectDeadline!: (reason: unknown) => void;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });
  const abort = () => {
    rejectDeadline(cancelled());
    controller.abort();
  };
  const timer = setTimeout(() => {
    rejectDeadline(new RequestDeadlineError());
    controller.abort();
  }, REQUEST_DEADLINE_MS);
  parent?.addEventListener("abort", abort, { once: true });
  try {
    return await Promise.race([
      Promise.resolve().then(() => (controller.signal.aborted ? deadline : run(controller.signal))),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", abort);
  }
}
