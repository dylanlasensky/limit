import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import BodyMap from "@/components/limit/BodyMap";
import { bodyProportion, regions, silhouetteFor } from "@/components/limit/athleticBodyArtwork";
import { emptyRating } from "@/components/limit/muscleRating";

afterEach(cleanup);

describe("anatomical muscle chart", () => {
  it("uses the saved representation and a neutral shape for other or missing values", () => {
    expect(bodyProportion("female")).toBe("female");
    expect(bodyProportion("male")).toBe("male");
    expect(bodyProportion("other")).toBe("neutral");
    expect(bodyProportion(undefined)).toBe("neutral");
    expect(
      new Set(
        ["female", "male", "neutral"].map((value) => silhouetteFor("front", bodyProportion(value)))
      ).size
    ).toBe(3);
  });

  for (const sex of ["female", "male", "other"])
    for (const view of ["front", "back"] as const)
      it(`keeps all ${view} hit targets operable for ${sex}`, () => {
        const onSelect = vi.fn();
        const { container } = render(
          <BodyMap
            sex={sex}
            view={view}
            rating={emptyRating()}
            onSelect={onSelect}
            selected={regions[view][0][0]}
          />
        );
        expect(
          screen.getByLabelText(`${bodyProportion(sex)} ${view} muscle rating chart`)
        ).toBeInTheDocument();
        const targets = screen.getAllByRole("button");
        expect(targets).toHaveLength(regions[view].length);
        for (let index = 0; index < targets.length; index++) {
          fireEvent.click(targets[index]);
          expect(onSelect).toHaveBeenLastCalledWith(regions[view][index][0]);
        }
        fireEvent.keyDown(targets[0], { key: "Enter" });
        expect(onSelect).toHaveBeenLastCalledWith(regions[view][0][0]);
        expect(container.querySelector("[clip-path] path[stroke-opacity='0.8']")).toBeTruthy();
      });

  it("keeps compact previews decorative inside their parent link", () => {
    render(<BodyMap view="front" compact rating={emptyRating()} sex="other" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
