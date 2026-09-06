import { describe, expect, it } from "vitest";
import { anatomy3DStructures } from "./anatomy3DModel";
import { anatomyStudyViews, layersForStudyView } from "./anatomyStudyViews";

describe("anatomical study views", () => {
  it("only links to available guided organs", () => {
    for (const view of anatomyStudyViews.filter((item) => item.structureId)) {
      expect(anatomy3DStructures.find((item) => item.id === view.structureId)?.layer).toBe("organs");
    }
  });
  it("resets all previous layers and keeps combinations within two systems", () => {
    for (const view of anatomyStudyViews) {
      const states = Object.values(layersForStudyView(view));
      expect(states).toHaveLength(6);
      expect(states.filter((item) => item.visible).length).toBeGreaterThan(0);
      expect(states.filter((item) => item.visible).length).toBeLessThanOrEqual(2);
      expect(states.every((item) => item.opacity > 0 && item.opacity <= 1)).toBe(true);
    }
  });
  it("exposes the bones through muscles without enabling skin or clipping", () => {
    const layers = layersForStudyView(anatomyStudyViews.find((item) => item.id === "locomotor")!);
    expect(layers.muscular).toEqual({ visible: true, opacity: .42 });
    expect(layers.skeletal).toEqual({ visible: true, opacity: 1 });
    expect(layers.surface.visible).toBe(false);
  });
});
