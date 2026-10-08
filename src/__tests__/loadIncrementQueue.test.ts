import { describe, expect, it, vi } from "vitest";
import { LoadIncrementQueue } from "../lib/training/loadIncrementQueue";

describe("load increment writes", () => {
  it("keeps both quick saves when the first response is delayed", async () => {
    let release!: () => void;
    const firstResponse = new Promise<void>((resolve) => (release = resolve));
    const update = vi.fn().mockReturnValueOnce(firstResponse).mockResolvedValue(undefined);
    const saved = vi.fn();
    const queue = new LoadIncrementQueue();
    const profile = { id: "profile-a", loadIncrements: { existing: 5 } };
    const current = (owner: string) => owner === "owner-a";
    const first = queue.save("owner-a", profile, "exercise-a", 2.5, current, update, saved);
    const second = queue.save("owner-a", profile, "exercise-b", 1.25, current, update, saved);
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenNthCalledWith(1, "profile-a", {
      existing: 5,
      "exercise-a": 2.5,
    });
    release();
    await Promise.all([first, second]);
    expect(update).toHaveBeenNthCalledWith(2, "profile-a", {
      existing: 5,
      "exercise-a": 2.5,
      "exercise-b": 1.25,
    });
    expect(saved).toHaveBeenLastCalledWith({
      existing: 5,
      "exercise-a": 2.5,
      "exercise-b": 1.25,
    });
  });

  it("does not send an old account's queued write after switching accounts", async () => {
    let release!: () => void;
    const update = vi.fn().mockReturnValueOnce(new Promise<void>((resolve) => (release = resolve)));
    const queue = new LoadIncrementQueue();
    let activeOwner = "owner-a";
    const current = (owner: string) => owner === activeOwner;
    const profile = { id: "profile-a", loadIncrements: {} };
    const first = queue.save("owner-a", profile, "a", 2, current, update, vi.fn());
    const second = queue.save("owner-a", profile, "b", 3, current, update, vi.fn());
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    activeOwner = "owner-b";
    release();
    await first;
    await expect(second).rejects.toThrow("Your account changed");
    expect(update).toHaveBeenCalledTimes(1);
  });
});
