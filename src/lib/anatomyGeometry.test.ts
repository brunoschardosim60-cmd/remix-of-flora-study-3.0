import { describe, expect, it } from "vitest";
import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from "three";
import { bakeAnatomyGeometry } from "./anatomyGeometry";

function triangle(indexed: boolean) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([0,0,0, 1,0,0, 0,1,0]), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array([0,0, 1,0, 0,1]), 2));
  if (indexed) geometry.setIndex([0,1,2]);
  geometry.computeVertexNormals();
  return geometry;
}
function facing(geometry: BufferGeometry) {
  const p = geometry.getAttribute("position"), n = geometry.getAttribute("normal");
  const ids = geometry.index ? [0,1,2].map((i) => geometry.index!.getX(i)) : [0,1,2];
  const [a,b,c] = ids.map((i) => new Vector3().fromBufferAttribute(p,i));
  return b.sub(a).cross(c.sub(a)).normalize().dot(new Vector3().fromBufferAttribute(n,ids[0]));
}
describe("mirrored anatomical geometry", () => {
  for (const indexed of [true, false]) {
    it(`preserves front-facing normals after reflection (${indexed ? "indexed" : "nonindexed"})`, () => {
      const source = triangle(indexed);
      const baked = bakeAnatomyGeometry(source, new Matrix4().makeScale(-1,1,1));
      expect(facing(baked)).toBeCloseTo(1);
      expect(facing(source)).toBeCloseTo(1);
      expect(source.getAttribute("position").getX(1)).toBe(1);
      expect(baked.getAttribute("position").count).toBe(3);
    });
  }
  it("does not reverse an unmirrored transform", () => {
    expect(facing(bakeAnatomyGeometry(triangle(true), new Matrix4().makeScale(2,3,4)))).toBeCloseTo(1);
  });
  it("preserves the orientation when two parent reflections cancel out", () => {
    const transform = new Matrix4().makeScale(-1,1,1).multiply(new Matrix4().makeScale(-1,1,1));
    expect(facing(bakeAnatomyGeometry(triangle(true), transform))).toBeCloseTo(1);
  });
  it("flips tangent handedness and keeps UVs attached to their mirrored vertices", () => {
    const source = triangle(false);
    source.setAttribute("tangent", new BufferAttribute(new Float32Array([1,0,0,1, 1,0,0,1, 1,0,0,1]), 4));
    const baked = bakeAnatomyGeometry(source, new Matrix4().makeScale(-1,1,1));
    expect(baked.getAttribute("tangent").getW(0)).toBe(-1);
    expect(source.getAttribute("tangent").getW(0)).toBe(1);
    expect(baked.getAttribute("uv").getY(1)).toBe(1);
    expect(baked.getAttribute("position").getY(1)).toBe(1);
  });
});
