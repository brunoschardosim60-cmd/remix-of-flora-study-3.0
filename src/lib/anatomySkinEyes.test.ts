import { describe, expect, it } from "vitest";
import { Box3, BufferAttribute, BufferGeometry, Color, FrontSide, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { prepareAnatomySkinEyes, type AnatomySkinEyeRole } from "./anatomySkinEyes";

function part(role: AnatomySkinEyeRole, x = 0, reflected = false) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([0,0,0, .01,0,0, 0,.01,0]), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array([1,0,0, 1,0,0, 1,0,0]), 3));
  geometry.setIndex([0,1,2]);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: role === "eyeInterior" ? "#120e0b" : "#aebdcc" }));
  mesh.userData.anatomySurfaceMaterial = role;
  mesh.userData.anatomyName = role;
  mesh.position.set(x, 1.59, .065);
  if (reflected) mesh.scale.x = -1;
  return mesh;
}

describe("skin eye preparation", () => {
  it("keeps the body's existing alignment and leaves cached geometry/material unchanged", () => {
    const source = new Object3D();
    const original = part("sclera", .03);
    source.add(original);
    source.scale.setScalar(5);
    source.position.set(0, -4.3, -.05);
    source.updateMatrixWorld(true);
    const before = new Box3().setFromObject(source);
    const result = prepareAnatomySkinEyes(source);
    const after = new Box3().setFromObject(result);
    expect(after.min.distanceTo(before.min)).toBeLessThan(.000001);
    expect(after.max.distanceTo(before.max)).toBeLessThan(.000001);
    expect(result.position.toArray()).toEqual([0,0,0]);
    expect(original.geometry.getAttribute("position").getX(0)).toBe(0);
    expect(original.geometry.getAttribute("color")).toBeDefined();
    expect(original.material.color.equals(new Color("#aebdcc"))).toBe(true);
  });

  it("bakes reflected triangles so the left eye has the same lighting orientation", () => {
    const source = new Object3D();
    source.add(part("iris", -.03), part("iris", .03, true));
    const prepared = prepareAnatomySkinEyes(source);
    const mesh = prepared.children[0] as Mesh;
    const geometry = mesh.geometry, indices = geometry.index!, positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
    for (let face = 0; face < indices.count; face += 3) {
      const ids = [0,1,2].map((offset) => indices.getX(face + offset));
      const [a,b,c] = ids.map((id) => new Vector3().fromBufferAttribute(positions,id));
      expect(b.sub(a).cross(c.sub(a)).normalize().dot(new Vector3().fromBufferAttribute(normals,ids[0]))).toBeCloseTo(1);
    }
  });

  it("batches bilateral eyes into four materials, not eight draw calls", () => {
    const source = new Object3D();
    for (const role of ["sclera", "iris", "cornea", "eyeInterior"] as const) source.add(part(role, -.03), part(role, .03, true));
    const prepared = prepareAnatomySkinEyes(source);
    expect(prepared.children).toHaveLength(4);
    for (const child of prepared.children as Mesh[]) {
      expect(child.material).toBeInstanceOf(MeshPhysicalMaterial);
      expect(child.geometry.index?.count).toBe(6);
      expect(child.geometry.getAttribute("color")).toBeUndefined();
      expect(child.userData.anatomySourceNames).toHaveLength(2);
    }
  });

  it("does not turn the cornea into an opaque/depth-writing layer or add costly transmission", () => {
    const source = new Object3D();
    source.add(part("cornea"));
    const material = (prepareAnatomySkinEyes(source).children[0] as Mesh).material as MeshPhysicalMaterial;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(.08);
    expect(material.depthWrite).toBe(false);
    expect(material.depthTest).toBe(true);
    expect(material.side).toBe(FrontSide);
    expect(material.transmission).toBe(0);
  });

  it("keeps the other eye tissues opaque and preserves the GLTF palette", () => {
    const source = new Object3D();
    source.add(part("sclera"), part("iris"), part("eyeInterior"));
    for (const mesh of prepareAnatomySkinEyes(source).children as Mesh[]) {
      const material = mesh.material as MeshPhysicalMaterial;
      expect(material.transparent).toBe(false);
      expect(material.depthWrite).toBe(true);
      expect(material.opacity).toBe(1);
      expect(material.color.equals(new Color(mesh.userData.anatomySurfaceMaterial === "eyeInterior" ? "#120e0b" : "#aebdcc"))).toBe(true);
    }
  });

  it("does not accidentally render unrelated nervous structures as eye tissue", () => {
    const source = new Object3D();
    const unrelated = part("sclera");
    unrelated.userData.anatomySurfaceMaterial = "brain";
    source.add(unrelated);
    expect(prepareAnatomySkinEyes(source).children).toHaveLength(0);
  });
});
