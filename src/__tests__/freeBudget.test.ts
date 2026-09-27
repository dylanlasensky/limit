import { describe, expect, it } from "vitest";
import { reserveBudget } from "../../packages/domain/freeBudget";

describe("free usage reservations", () => {
  const now = new Date("2026-09-27T23:59:59Z");
  it("refuses the first operation beyond the monthly storage limit", () => {
    const last = reserveBudget(
      { period: "2026-09", count: 19999, bytes: 0, objects: 0 },
      "storage",
      0,
      now
    )!;
    expect(last.count).toBe(20000);
    expect(reserveBudget(last, "storage", 0, now)).toBeNull();
  });
  it("resets monthly requests without resetting lifetime storage reservations", () => {
    const previous = { period: "2026-08", count: 20000, bytes: 256 * 1024 * 1024, objects: 32 };
    expect(reserveBudget(previous, "storage", 0, now)?.count).toBe(1);
    expect(reserveBudget(previous, "storage", 1, now)).toBeNull();
  });
  it("caps object count, even for tiny uploads", () => {
    expect(
      reserveBudget(
        { period: "2026-09", count: 1000, bytes: 1000, objects: 1000 },
        "storage",
        1,
        now
      )
    ).toBeNull();
  });
  it("bounds AI calls by UTC day", () => {
    const previous = { period: "2026-09-27", count: 10, bytes: 0, objects: 0 };
    expect(reserveBudget(previous, "ai", 0, now)).toBeNull();
    expect(reserveBudget(previous, "ai", 0, new Date("2026-09-28T00:00:00Z"))?.count).toBe(1);
  });
  it.each([-1, NaN, Infinity, 0.5, 8 * 1024 * 1024 + 1])(
    "rejects invalid upload size %s",
    (bytes) => {
      expect(reserveBudget(undefined, "storage", bytes, now)).toBeNull();
    }
  );
});
