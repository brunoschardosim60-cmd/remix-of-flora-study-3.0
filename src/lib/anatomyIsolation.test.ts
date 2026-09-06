import { describe, expect, it } from "vitest";
import { Box3, BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { frameAnatomyBounds, isolateAnatomyGeometry } from "./anatomyIsolation";

function fixture(indexed = true) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 8, 0, 0, 9, 0, 0, 8, 1, 0], 3));
  geometry.setAttribute("anatomyStructureId", new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 1));
  geometry.setAttribute("color", new Float32BufferAttribute(Array(18).fill(.5), 3));
  if (indexed) geometry.setIndex([0, 1, 2, 3, 4, 5]);
  return geometry;
}

describe("anatomical piece isolation", () => {
  it("fits wide pieces to the actual canvas aspect rather than the full body's height", () => {
    const bounds = new Box3(new Vector3(-2, -.3, -.2), new Vector3(2, .3, .2));
    const wide = frameAnatomyBounds(bounds, 2);
    const narrow = frameAnatomyBounds(bounds, .7);
    expect(wide.focus).toEqual([0, 0, 0]);
    expect(wide.distance).toBeLessThan(narrow.distance);
    expect(wide.distance).toBeGreaterThan(3);
  });
  it.each([true, false])("isolates real triangles and fits only the selected piece (indexed=%s)", (indexed) => {
    const source = fixture(indexed);
    const part = isolateAnatomyGeometry(source, new Set([1]))!;
    expect(part.getAttribute("position").count).toBe(3);
    expect(Array.from(part.getIndex()!.array)).toEqual([0, 1, 2]);
    expect(part.boundingBox!.min.x).toBe(8);
    expect(part.boundingBox!.max.x).toBe(9);
    expect(part.getAttribute("anatomyStructureId").getX(0)).toBe(1);
    part.getAttribute("color").setX(0, 0);
    expect(source.getAttribute("color").getX(3)).toBe(.5);
    expect(source.getAttribute("position").count).toBe(6);
  });
  it("keeps a multi-piece group without joining its disconnected surfaces", () => {
    expect(isolateAnatomyGeometry(fixture(), new Set([0, 1]))!.getIndex()!.count).toBe(6);
  });
  it("fails closed on absent pieces or missing identity attributes", () => {
    expect(isolateAnatomyGeometry(fixture(), new Set([99]))).toBeNull();
    expect(isolateAnatomyGeometry(new BufferGeometry(), new Set([0]))).toBeNull();
  });
});
