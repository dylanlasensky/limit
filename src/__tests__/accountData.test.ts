import { describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_ENTITIES,
  accountFilter,
  readAccountRows,
  exportAccountData,
  deleteAccountData,
} from "../../base44/shared/accountData.js";

describe("account export and deletion boundaries", () => {
  it("requires an identity and keeps explicit ownership ahead of legacy creator metadata", () => {
    expect(() => accountFilter("")).toThrow();
    expect(accountFilter("me").$or[0]).toEqual({ ownerId: "me" });
    expect(JSON.stringify(accountFilter("me"))).toContain('"$exists":false');
  });
  it("exports all pages, strips internal lock data, and rejects foreign rows", async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({
      id: `${i}`,
      created_by_id: "me",
      workoutLockToken: "secret",
    }));
    const filter = vi.fn(async (_query, _sort, limit, skip) => rows.slice(skip, skip + limit));
    const result = await readAccountRows({ filter }, "me");
    expect(result).toHaveLength(501);
    expect(result[0]).not.toHaveProperty("workoutLockToken");
    expect(filter).toHaveBeenCalledTimes(2);
    await expect(
      readAccountRows(
        { filter: async () => [{ id: "foreign", ownerId: "other", created_by_id: "me" }] },
        "me"
      )
    ).rejects.toThrow("ownership");
  });
  it("never silently returns a repeated page as a complete export", async () => {
    const page = Array.from({ length: 500 }, (_, i) => ({ id: `${i}`, ownerId: "me" }));
    await expect(readAccountRows({ filter: async () => page }, "me")).rejects.toThrow("changed");
  });
  it("exports only a public allowlist of identity fields under user permissions", async () => {
    const entities = Object.fromEntries(
      ACCOUNT_ENTITIES.map((name) => [name, { filter: vi.fn().mockResolvedValue([]) }])
    );
    const result = await exportAccountData(
      { entities },
      { id: "me", email: "me@example.com", access_token: "secret", role: "admin" }
    );
    expect(Object.keys(result.entities)).toEqual(ACCOUNT_ENTITIES);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result.account).not.toHaveProperty("role");
  });
  function deletionClient() {
    const entities: Record<string, any> = Object.fromEntries(
      ACCOUNT_ENTITIES.map((name) => [
        name,
        {
          deleteMany: vi.fn().mockResolvedValue({ success: true, deleted: 2 }),
          filter: vi.fn().mockResolvedValue([]),
        },
      ])
    );
    entities.User = { delete: vi.fn().mockResolvedValue({ success: true }) };
    return { asServiceRole: { entities } };
  }
  it("verifies every personal collection before deleting only the authenticated identity", async () => {
    const client = deletionClient();
    await deleteAccountData(client, "me");
    expect(client.asServiceRole.entities.User.delete).toHaveBeenCalledWith("me");
    for (const name of ACCOUNT_ENTITIES)
      expect(client.asServiceRole.entities[name].deleteMany).toHaveBeenCalledWith(
        accountFilter("me")
      );
    expect(ACCOUNT_ENTITIES).not.toContain("Exercise");
  });
  it("keeps identity available for retry if any deletion fails or data remains", async () => {
    const client = deletionClient();
    client.asServiceRole.entities.ExerciseSet.deleteMany.mockResolvedValue({ success: false });
    await expect(deleteAccountData(client, "me")).rejects.toThrow("not confirmed");
    expect(client.asServiceRole.entities.User.delete).not.toHaveBeenCalled();
    client.asServiceRole.entities.ExerciseSet.deleteMany.mockResolvedValue({ success: true });
    client.asServiceRole.entities.ExerciseSet.filter.mockResolvedValue([{ id: "left" }]);
    await expect(deleteAccountData(client, "me")).rejects.toThrow("remains");
    expect(client.asServiceRole.entities.User.delete).not.toHaveBeenCalled();
  });
});
