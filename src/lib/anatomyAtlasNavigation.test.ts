import { describe, expect, it } from "vitest";
import { atlasCoordinateAtReticle, findAtlasSnapTarget, preserveAtlasSnapPan } from "./anatomyAtlasNavigation";

const points = [
  { id: "heart", x: 50, y: 34 },
  { id: "liver", x: 47, y: 46 },
  { id: "brain", x: 50, y: 9 },
];

describe("findAtlasSnapTarget", () => {
  it("tracks the anatomical point underneath the reticle while the image moves", () => {
    expect(atlasCoordinateAtReticle({
      focusedPoint: { id: "humerus", x: 26, y: 31 },
      pan: { x: 0, y: 120 },
      imageSize: { width: 900, height: 1500 },
    })).toEqual({ x: 26, y: 23 });
  });

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

  it("preserves the visual image position before smoothly centering a snapped structure", () => {
    const pan = { x: 27, y: -180 };
    const imageSize = { width: 900, height: 1500 };
    const preserved = preserveAtlasSnapPan({
      pan,
      fromPoint: points[0],
      toPoint: points[1],
      imageSize,
    });

    expect(preserved).toEqual({ x: 0, y: 0 });
    expect(preserved.x - imageSize.width * (points[1].x / 100)).toBeCloseTo(pan.x - imageSize.width * (points[0].x / 100));
    expect(preserved.y - imageSize.height * (points[1].y / 100)).toBeCloseTo(pan.y - imageSize.height * (points[0].y / 100));
  });
});
