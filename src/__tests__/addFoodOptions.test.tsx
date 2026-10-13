import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddFoodFlow from "@/components/limit/AddFoodFlow";
import { foodSourceLabel } from "@/lib/food-diary";

vi.mock("@/api/client", () => ({ limitApi: { entities: { FoodEntry: { list: vi.fn() } } } }));

describe("add food options", () => {
  it("hides the restaurant entry path while retaining the other ways to log food", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddFoodFlow onDone={() => {}} />
      </QueryClientProvider>
    );
    expect(screen.queryByRole("button", { name: /restaurant meal/i })).not.toBeInTheDocument();
    for (const name of [
      "Recent foods",
      "Saved meals",
      "Nutrition label",
      "Plate photo",
      "Manual entry",
    ])
      expect(screen.getByRole("button", { name: new RegExp(name, "i") })).toBeInTheDocument();
  });

  it("keeps historical restaurant diary entries identified", () => {
    expect(foodSourceLabel({ entryMethod: "restaurant", estimated: true })).toBe(
      "Restaurant entry · Estimated"
    );
  });
});
