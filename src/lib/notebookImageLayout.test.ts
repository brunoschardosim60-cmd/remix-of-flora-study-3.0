import { describe, expect, it } from "vitest";
import { notebookImageLayout } from "./notebookImageLayout";
const defaults = { naturalRatio: 1, rotation: 0, cropEnabled: true, cropAspect: "1:1", cropX: 50, cropY: 50, cropZoom: 1 };

describe("reversible notebook image layout", () => {
  it("allows both crop sliders to move a zoomed square image", () => {
    const layout = notebookImageLayout({ ...defaults, cropZoom: 2, cropX: 100, cropY: 0 });
    expect(layout.imageStyle).toMatchObject({ width: "200%", height: "200%", left: "0%", top: "100%" });
  });
  it("uses viewport axes even when the image is rotated", () => {
    const layout = notebookImageLayout({ ...defaults, naturalRatio: 2, rotation: 90, cropY: 100 });
    expect(layout.imageStyle).toMatchObject({ width: "200%", height: "100%", left: "50%", top: "0%" });
  });
  it("restores the entire rotated image without distorting its proportions", () => {
    const layout = notebookImageLayout({ ...defaults, naturalRatio: 2, rotation: 90, cropEnabled: false, cropZoom: 3 });
    expect(layout.aspectRatio).toBe(.5);
    expect(layout.imageStyle).toMatchObject({ width: "200%", height: "50%", left: "50%", top: "50%" });
  });
  it("handles corrupt persisted numbers without invalid CSS", () => {
    const layout = notebookImageLayout({ ...defaults, naturalRatio: NaN, cropZoom: Infinity, cropX: NaN });
    expect(layout.imageStyle.width).toBe("100%");
    expect(layout.imageStyle.left).toBe("50%");
  });
});
