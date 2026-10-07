import { describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(async () => ({ user: { id: "member-1" } })),
}));
vi.mock("./auth", () => ({ authFor: () => ({ api: auth }) }));
vi.mock("./rate-limit", () => ({ rateLimit: vi.fn(async () => {}) }));
vi.mock("./coordinator", () => ({ AccountCoordinator: class {} }));
vi.mock("./coach", () => ({ LimitCoach: class {} }));

import worker from "./index";

function fixture(result: { data: unknown; status: number } | Error) {
  const inserted: Array<[string, string]> = [];
  const pending: Promise<unknown>[] = [];
  const execute = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return JSON.stringify(result);
  });
  const env = {
    APP_ORIGIN: "https://limit.example",
    ACCOUNT_COORDINATOR: { getByName: vi.fn(() => ({ execute })) },
    DB: {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            if (sql.startsWith("INSERT INTO operational_error_count"))
              inserted.push(args as [string, string]);
          },
        }),
      })),
    },
  };
  const ctx = { waitUntil: (task: Promise<unknown>) => pending.push(task) };
  const finish = async () => Promise.all(pending);
  return { env, ctx, execute, inserted, finish };
}

describe("final Worker error accounting", () => {
  it.each([
    ["entity coordinator", "/api/entities/WorkoutSession", "entity-response"],
    ["workout command", "/api/functions/workoutCommand", "dispatch"],
  ])("counts a returned 500 from %s once", async (_name, path, stage) => {
    const { env, ctx, inserted, finish } = fixture({ data: { error: "failed" }, status: 500 });
    const response = await worker.fetch(
      new Request("https://limit.example" + path, {
        method: "POST",
        headers: { Origin: "https://limit.example", "Content-Type": "application/json" },
        body: "{}",
      }),
      env as unknown as Env,
      ctx as unknown as ExecutionContext
    );
    await finish();
    expect(response.status).toBe(500);
    expect(inserted).toEqual([[expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), stage]]);
  });

  it("counts a thrown failure once and does not count a returned 400", async () => {
    const failed = fixture(new Error("private failure"));
    const request = () =>
      new Request("https://limit.example/api/functions/workoutCommand", {
        method: "POST",
        headers: { Origin: "https://limit.example", "Content-Type": "application/json" },
        body: "{}",
      });
    const response = await worker.fetch(
      request() as Parameters<typeof worker.fetch>[0],
      failed.env as unknown as Env,
      failed.ctx as unknown as ExecutionContext
    );
    await failed.finish();
    expect(response.status).toBe(500);
    expect(failed.inserted).toHaveLength(1);
    expect(JSON.stringify(await response.json())).not.toContain("private failure");

    const rejected = fixture({ data: { error: "invalid" }, status: 400 });
    const badResponse = await worker.fetch(
      request() as Parameters<typeof worker.fetch>[0],
      rejected.env as unknown as Env,
      rejected.ctx as unknown as ExecutionContext
    );
    await rejected.finish();
    expect(badResponse.status).toBe(400);
    expect(rejected.inserted).toHaveLength(0);
  });
});
