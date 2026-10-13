import { describe, expect, it, vi } from "vitest";
import { ownerOperations } from "./owner-ops";
import { ownerOpsSchema } from "../packages/contracts/ownerOps";

function fixture() {
  const inspectBudget = vi.fn(async () => ({
    period: "2026-10",
    count: 14,
    bytes: 300,
    objects: 2,
  }));
  const inspectEmailBudget = vi.fn(async () => null);
  const all = vi.fn(async () => ({
    results: [{ day: "2026-10-07", stage: "dispatch", count: 2 }],
  }));
  const env = {
    OWNER_USER_ID: "owner-id",
    ENVIRONMENT: "preview",
    SOURCE_REVISION: "abc123",
    CF_VERSION_METADATA: { id: "worker-version" },
    EMAIL_ENABLED: "false",
    EMAIL_FROM: "",
    RESEND_API_KEY: "",
    ACCOUNT_COORDINATOR: { getByName: vi.fn(() => ({ inspectBudget, inspectEmailBudget })) },
    DB: { prepare: vi.fn(() => ({ bind: vi.fn(() => ({ all })) })) },
  };
  return { env, inspectBudget, all };
}

describe("owner operations", () => {
  it("fails closed before reading private status when owner identity is unset or differs", async () => {
    const { env, inspectBudget, all } = fixture();
    await expect(ownerOperations(env as unknown as Env, "other-id")).rejects.toMatchObject({
      status: 404,
    });
    env.OWNER_USER_ID = "";
    await expect(ownerOperations(env as unknown as Env, "owner-id")).rejects.toMatchObject({
      status: 404,
    });
    expect(inspectBudget).not.toHaveBeenCalled();
    expect(all).not.toHaveBeenCalled();
  });

  it("shows bounded operational aggregates without identity or member records", async () => {
    const { env } = fixture();
    const response = await ownerOperations(env as unknown as Env, "owner-id");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = ownerOpsSchema.parse(await response.json());
    expect(body.environment).toBe("preview");
    expect(body.storage.uploadedBytesLifetime).toEqual({ used: 300, limit: 268435456 });
    expect(body.errors).toEqual([{ day: "2026-10-07", stage: "dispatch", count: 2 }]);
    expect(JSON.stringify(body)).not.toContain("owner-id");
    expect(JSON.stringify(body)).not.toContain("RESEND_API_KEY");
  });
});
