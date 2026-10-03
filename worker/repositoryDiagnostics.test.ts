// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { Repository } from "./repository";

afterEach(() => vi.restoreAllMocks());

describe("entity update diagnostics", () => {
  it("records only a fixed stage when the ownership-scoped read fails unexpectedly", async () => {
    const privateMessage = "PRIVATE-D1-DETAIL";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => {
            throw new Error(privateMessage);
          },
        }),
      }),
    } as unknown as ConstructorParameters<typeof Repository>[0];
    const repository = new Repository(db, "private-owner-id");
    await expect(
      repository.entity("UserProfile").update("foreign-id", { name: "Stolen" })
    ).rejects.toThrow(privateMessage);
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: "entity_update_failure",
        entity: "UserProfile",
        stage: "read-before-write",
      })
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateMessage);
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-owner-id");
    expect(JSON.stringify(log.mock.calls)).not.toContain("foreign-id");
  });

  it("keeps a missing foreign record as a 404 without an unexpected-failure log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = {
      prepare: () => ({ bind: () => ({ first: async () => null }) }),
    } as unknown as ConstructorParameters<typeof Repository>[0];
    const repository = new Repository(db, "owner-id");
    await expect(
      repository.entity("UserProfile").update("foreign-id", { name: "Stolen" })
    ).rejects.toMatchObject({ status: 404 });
    expect(log).not.toHaveBeenCalled();
  });
});
