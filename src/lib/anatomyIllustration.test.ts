import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { anatomyIllustratedView, createAnatomyIllustrationPlanes } from "./anatomyIllustration";
import { layersForStudyView } from "./anatomyStudyViews";

describe("illustrated anatomical presentation", () => {
  it("makes only the skin translucent and keeps internal systems opaque", () => {
    const layers = layersForStudyView(anatomyIllustratedView);
    expect(Object.values(layers).filter(layer => layer.visible)).toHaveLength(5);
    expect(layers.surface.opacity).toBe(.4);
    expect(Object.entries(layers).filter(([name]) => name !== "surface").every(([, layer]) => layer.opacity === 1)).toBe(true);
    expect(layers.nervous.visible).toBe(false);
  });
  it("aligns both outer layers on the same central plane and leaves internal systems uncut", () => {
    const planes = createAnatomyIllustrationPlanes();
    expect(Object.keys(planes)).toEqual(["surface", "muscular"]);
    expect(planes.surface.equals(planes.muscular)).toBe(true);
    for (const height of [-4, 0, 4]) {
      expect(planes.surface.distanceToPoint(new Vector3(0, height, 0))).toBe(0);
    }
    expect(planes.surface.distanceToPoint(new Vector3(-1, 0, 0))).toBeGreaterThan(0);
    expect(planes.muscular.distanceToPoint(new Vector3(1, 0, 0))).toBeLessThan(0);
  });
});
