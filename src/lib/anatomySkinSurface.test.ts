import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshPhysicalMaterial } from "three";
import { buildAnatomySkinSurface } from "./anatomySkinSurface";

function surfacePart(name: string, x = 0) {
  const mesh = new Mesh(new BoxGeometry(.2, .3, .1));
  mesh.name = "ZAHD__surface__generated";
  mesh.userData.anatomyName = name;
  mesh.position.x = x;
  return mesh;
}

describe("batched anatomical surface", () => {
  it("uses at most four tissue draws, not one clay material or 256 separate draws", () => {
    const source = new Group();
    source.add(surfacePart("Frontal region.r"), surfacePart("Frontal region.l"),
      surfacePart("Hairs of head"), surfacePart("Hairs of eyebrow.r"),
      surfacePart("Nail plate.r"), surfacePart("Tubercle of upper lip.l"));
    const result = buildAnatomySkinSurface(source);
    expect(result.children).toHaveLength(4);
    expect(result.children.map((mesh) => mesh.userData.anatomySkinRegion).sort()).toEqual(["hair", "lip", "nail", "skin"]);
    const hair = result.children.find((mesh) => mesh.userData.anatomySkinRegion === "hair") as Mesh;
    const skin = result.children.find((mesh) => mesh.userData.anatomySkinRegion === "skin") as Mesh;
    expect(hair.geometry.getAttribute("color").getX(0)).toBeLessThan(skin.geometry.getAttribute("color").getX(0));
    expect((hair.material as MeshPhysicalMaterial).roughness).toBeGreaterThan((skin.material as MeshPhysicalMaterial).roughness);
  });

  it("preserves source attributes, mirrored geometry and matching bilateral skin color", () => {
    const source = new Group();
    const left = surfacePart("Frontal region.l", -.4);
    const right = surfacePart("Frontal region.r", .4);
    right.scale.x = -1;
    const original = Array.from(right.geometry.getAttribute("position").array);
    source.add(left, right);
    const result = buildAnatomySkinSurface(source);
    const geometry = (result.children[0] as Mesh).geometry;
    expect(Array.from(right.geometry.getAttribute("position").array)).toEqual(original);
    expect(right.geometry.getAttribute("color")).toBeUndefined();
    expect(geometry.boundingBox!.min.x).toBeCloseTo(-.5);
    expect(geometry.boundingBox!.max.x).toBeCloseTo(.5);
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    const lookup = new Map<string, number>();
    for (let i = 0; i < position.count; i++) {
      const key = [Math.abs(position.getX(i)), position.getY(i), position.getZ(i)].map((n) => n.toFixed(5)).join();
      if (lookup.has(key)) expect(color.getX(i)).toBeCloseTo(lookup.get(key)!, 6);
      lookup.set(key, color.getX(i));
    }
  });
});
