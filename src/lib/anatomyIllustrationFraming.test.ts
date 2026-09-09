import { describe, expect, it } from "vitest";
import { ILLUSTRATION_BODY_BOUNDS, ILLUSTRATION_BODY_FOCUS, illustrationFitDistance, regionalFitDistance } from "./anatomyIllustrationFraming";

describe("regional camera framing", () => {
  it("preserves desktop distance and backs away for portrait viewports", () => {
    expect(regionalFitDistance(6.2, 800, 500)).toBe(6.2);
    expect(regionalFitDistance(6.2, 350, 700)).toBe(12.4);
  });
  it("handles hidden canvases and bounds extreme ratios", () => {
    expect(regionalFitDistance(6.2, 0, 700)).toBe(6.2);
    expect(regionalFitDistance(6.2, NaN, 700)).toBe(6.2);
    expect(regionalFitDistance(6.2, 1, 700)).toBeCloseTo(18.6);
  });
  it("preserves proportional manual zoom", () => {
    expect(regionalFitDistance(3.1, 350, 700)).toBe(regionalFitDistance(6.2, 350, 700) / 2);
  });
});

describe("illustrated body camera framing", () => {
  it.each([[1280, 600], [900, 520], [375, 480], [320, 800], [844, 350], [1024, 768]])(
    "fits the conservative figure in a %i by %i canvas",
    (width, height) => {
      const distance = illustrationFitDistance(width, height);
      const [bodyWidth, bodyHeight, bodyDepth] = ILLUSTRATION_BODY_BOUNDS;
      const visibleHeight = 2 * (distance - bodyDepth / 2) * Math.tan(36 * Math.PI / 360);
      expect(Number.isFinite(distance)).toBe(true);
      expect(visibleHeight).toBeGreaterThan(bodyHeight);
      expect(visibleHeight * width / height).toBeGreaterThan(bodyWidth);
    },
  );

  it("preserves the central body target", () => {
    expect(ILLUSTRATION_BODY_FOCUS).toEqual([0, -.15, 0]);
  });

  it("depends on canvas aspect, not pixel density", () => {
    expect(illustrationFitDistance(375, 600)).toBe(illustrationFitDistance(750, 1200));
  });

  it("never moves closer when the viewport gets narrower", () => {
    const widths = [1200, 800, 500, 375, 240, 160];
    const distances = widths.map((width) => illustrationFitDistance(width, 800));
    distances.slice(1).forEach((distance, index) => expect(distance).toBeGreaterThanOrEqual(distances[index]));
    expect(distances.at(-1)).toBeGreaterThan(distances[0]);
  });

  it.each([[0, 600], [400, 0], [-1, 600], [400, -1], [NaN, 600], [400, NaN], [Infinity, 600], [400, Infinity]])(
    "uses a finite square fallback for invalid dimensions %s by %s",
    (width, height) => {
      expect(illustrationFitDistance(width, height)).toBe(illustrationFitDistance(1, 1));
    },
  );

  it.each([NaN, Infinity, -Infinity, 0, -1, 179, 180])("uses the standard FOV when %s is invalid", (fov) => {
    expect(illustrationFitDistance(375, 800, fov)).toBe(illustrationFitDistance(375, 800, 36));
  });

  it("remains finite for extreme positive dimensions and valid FOV limits", () => {
    for (const [width, height] of [[Number.MAX_VALUE, Number.MIN_VALUE], [Number.MIN_VALUE, Number.MAX_VALUE]]) {
      for (const fov of [1, 178]) {
        const distance = illustrationFitDistance(width, height, fov);
        expect(Number.isFinite(distance)).toBe(true);
        expect(distance).toBeGreaterThan(0);
      }
    }
  });

  it("moves farther away for a narrower camera field of view", () => {
    expect(illustrationFitDistance(375, 800, 30)).toBeGreaterThan(illustrationFitDistance(375, 800, 36));
    expect(illustrationFitDistance(375, 800, 36)).toBeGreaterThan(illustrationFitDistance(375, 800, 50));
  });
});
