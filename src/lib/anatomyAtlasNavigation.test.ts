import { describe, expect, it } from "vitest";
import { findAtlasSnapTarget } from "./anatomyAtlasNavigation";

const points = [
  { id: "heart", x: 50, y: 34 },
  { id: "liver", x: 47, y: 46 },
  { id: "brain", x: 50, y: 9 },
];

describe("findAtlasSnapTarget", () => {
  it("keeps the focused structure locked when it is under the reticle", () => {
    expect(findAtlasSnapTarget({
      points,
      focusedPoint: points[0],
      pan: { x: 0, y: 0 },
      imageSize: { width: 900, height: 1500 },
    })?.id).toBe("heart");
  });

  it("identifies a different structure after the image is dragged over the reticle", () => {
    expect(findAtlasSnapTarget({
      points,
      focusedPoint: points[0],
      pan: { x: 27, y: -180 },
      imageSize: { width: 900, height: 1500 },
      threshold: 10,
    })?.id).toBe("liver");
  });

  it("does not snap when no marker is close enough", () => {
    expect(findAtlasSnapTarget({
      points,
      focusedPoint: points[0],
      pan: { x: 220, y: 260 },
      imageSize: { width: 900, height: 1500 },
      threshold: 30,
    })).toBeNull();
  });
});
