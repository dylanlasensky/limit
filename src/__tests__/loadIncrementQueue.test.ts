import { describe, expect, it, vi } from "vitest";
import { LoadIncrementQueue } from "../lib/training/loadIncrementQueue";

describe("load increment writes", () => {
  it("sends only the changed key after a lost response, leaving the server to merge other tabs", async () => {
    const update = vi
      .fn()
      .mockRejectedValueOnce(new Error("Response lost"))
      .mockResolvedValueOnce({ a: 2.5, b: 1.25 });
    const saved = vi.fn(),
      queue = new LoadIncrementQueue();
    await expect(queue.save("owner", "a", 2.5, () => true, update, saved)).rejects.toThrow(
      "Response lost"
    );
    await queue.save("owner", "b", 1.25, () => true, update, saved);
    expect(update.mock.calls).toEqual([
      ["a", 2.5],
      ["b", 1.25],
    ]);
    expect(saved).toHaveBeenCalledWith({ a: 2.5, b: 1.25 });
  });
  it("keeps both quick saves when the first response is delayed", async () => {
    let release!: (values: Record<string, number>) => void;
    const firstResponse = new Promise<Record<string, number>>((resolve) => (release = resolve));
    const update = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValue({ existing: 5, "exercise-a": 2.5, "exercise-b": 1.25 });
    const saved = vi.fn();
    const queue = new LoadIncrementQueue();
    const current = (owner: string) => owner === "owner-a";
    const first = queue.save("owner-a", "exercise-a", 2.5, current, update, saved);
    const second = queue.save("owner-a", "exercise-b", 1.25, current, update, saved);
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenNthCalledWith(1, "exercise-a", 2.5);
    release({ existing: 5, "exercise-a": 2.5 });
    await Promise.all([first, second]);
    expect(update).toHaveBeenNthCalledWith(2, "exercise-b", 1.25);
    expect(saved).toHaveBeenLastCalledWith({
      existing: 5,
      "exercise-a": 2.5,
      "exercise-b": 1.25,
    });
  });

  it("does not send an old account's queued write after switching accounts", async () => {
    let release!: (values: Record<string, number>) => void;
    const update = vi
      .fn()
      .mockReturnValueOnce(new Promise<Record<string, number>>((resolve) => (release = resolve)));
    const queue = new LoadIncrementQueue();
    let activeOwner = "owner-a";
    const current = (owner: string) => owner === activeOwner;
    const first = queue.save("owner-a", "a", 2, current, update, vi.fn());
    const second = queue.save("owner-a", "b", 3, current, update, vi.fn());
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    activeOwner = "owner-b";
    release({ existing: 5, "exercise-a": 2.5 });
    await first;
    await expect(second).rejects.toThrow("Your account changed");
    expect(update).toHaveBeenCalledTimes(1);
  });
});
