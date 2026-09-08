import { Plane, Vector3 } from "three";
import type { AnatomyStudyView } from "./anatomyStudyViews";

// Skin overlays the opaque muscle on the same midline; never alter geometry.
export const ILLUSTRATED_SKIN_OPACITY = .4;
export const anatomyIllustratedView: AnatomyStudyView = {
  id: "illustrated", label: "Vista ilustrada", group: "Combinações",
  layers: { surface: ILLUSTRATED_SKIN_OPACITY, muscular: 1, skeletal: 1, organs: 1, vascular: 1 },
};

export function createAnatomyIllustrationPlanes() {
  return {
    surface: new Plane(new Vector3(-1, 0, 0), 0),
    muscular: new Plane(new Vector3(-1, 0, 0), 0),
  };
}
