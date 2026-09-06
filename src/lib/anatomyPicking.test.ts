import { describe, expect, it } from "vitest";
import { BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Plane, Raycaster, SkinnedMesh, Vector3 } from "three";
import { anatomyStructureIndexFromHit, canHoverAnatomyPointer, collectAnatomyPickMeshes, enableAnatomyPicking, intersectAnatomyMeshes, isAnatomyClick } from "./anatomyPicking";

function twoStructures(indexed: boolean) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([
    -3, -1, 0, -1, -1, 0, -2, 1, 0,
    1, -1, 0, 3, -1, 0, 2, 1, 0,
  ]), 3));
  geometry.setAttribute("anatomyStructureId", new BufferAttribute(new Float32Array([37, 37, 37, 82, 82, 82]), 1));
  if (indexed) geometry.setIndex([3, 4, 5, 0, 1, 2]);
  return new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
}
function rayAt(x: number, z = 5) {
  return new Raycaster(new Vector3(x, 0, z), new Vector3(0, 0, -1));
}

describe("accelerated anatomical picking", () => {
  for (const indexed of [true, false]) {
    it(`preserves original geometry and structure/face IDs (${indexed ? "indexed" : "nonindexed"})`, () => {
      const mesh = twoStructures(indexed);
      const geometry = mesh.geometry;
      const index = geometry.index;
      const indices = index?.array.slice();
      const positions = geometry.getAttribute("position");
      const ids = geometry.getAttribute("anatomyStructureId");
      const before = rayAt(-2).intersectObject(mesh)[0];
      const release = enableAnatomyPicking(mesh, { minTriangles: 1 });
      expect(mesh.raycast).not.toBe(Mesh.prototype.raycast);
      expect(geometry.index).toBe(index);
      expect(geometry.index?.array).toEqual(indices);
      expect(geometry.getAttribute("position")).toBe(positions);
      expect(geometry.getAttribute("anatomyStructureId")).toBe(ids);
      const after = intersectAnatomyMeshes(rayAt(-2), [mesh]);
      expect(after?.faceIndex).toBe(before.faceIndex);
      expect([after?.face?.a, after?.face?.b, after?.face?.c, after?.face?.materialIndex])
        .toEqual([before.face.a, before.face.b, before.face.c, before.face.materialIndex]);
      expect(after?.face?.normal.toArray()).toEqual(before.face.normal.toArray());
      expect(anatomyStructureIndexFromHit(after)).toBe(37);
      expect(anatomyStructureIndexFromHit(intersectAnatomyMeshes(rayAt(2), [mesh]))).toBe(82);
      expect(after?.distance).toBeCloseTo(before.distance);
      release();
      expect(mesh.raycast).toBe(Mesh.prototype.raycast);
      expect(geometry.boundsTree).toBeUndefined();
    });
  }

  it("does not mutate the global Three raycast and releases shared geometry safely", () => {
    const original = Mesh.prototype.raycast;
    const a = twoStructures(true);
    const b = new Mesh(a.geometry, a.material);
    const releaseA = enableAnatomyPicking(a, { minTriangles: 1 });
    const releaseB = enableAnatomyPicking(b, { minTriangles: 1 });
    const tree = a.geometry.boundsTree;
    expect(Mesh.prototype.raycast).toBe(original);
    releaseA();
    expect(a.raycast).toBe(original);
    expect(b.geometry.boundsTree).toBe(tree);
    expect(anatomyStructureIndexFromHit(intersectAnatomyMeshes(rayAt(2), [b]))).toBe(82);
    releaseA(); // idempotent cleanup must not release B's geometry.
    releaseB();
    expect(b.geometry.boundsTree).toBeUndefined();
    const enableAgain = enableAnatomyPicking(a, { minTriangles: 1 });
    expect(a.geometry.boundsTree).toBe(tree); // cached, no second expensive rebuild.
    enableAgain();
  });

  it("reference counts two component owners of the same mesh", () => {
    const mesh = twoStructures(true);
    const releaseA = enableAnatomyPicking(mesh, { minTriangles: 1 });
    const releaseB = enableAnatomyPicking(mesh, { minTriangles: 1 });
    releaseA();
    expect(mesh.raycast).not.toBe(Mesh.prototype.raycast);
    releaseB();
    expect(mesh.raycast).toBe(Mesh.prototype.raycast);
  });

  it("keeps native fallback for small, animated and customized meshes", () => {
    const small = twoStructures(true);
    const skinned = new SkinnedMesh(small.geometry.clone(), small.material);
    const morph = twoStructures(true);
    morph.geometry.morphAttributes.position = [morph.geometry.getAttribute("position").clone()];
    const custom = twoStructures(true);
    const specialRaycast = () => {};
    custom.raycast = specialRaycast;
    const smallRelease = enableAnatomyPicking(small);
    const skinRelease = enableAnatomyPicking(skinned, { minTriangles: 1 });
    const morphRelease = enableAnatomyPicking(morph, { minTriangles: 1 });
    const customRelease = enableAnatomyPicking(custom, { minTriangles: 1 });
    expect(small.raycast).toBe(Mesh.prototype.raycast);
    expect(skinned.raycast).toBe(SkinnedMesh.prototype.raycast);
    expect(morph.raycast).toBe(Mesh.prototype.raycast);
    expect(custom.raycast).toBe(specialRaycast);
    [smallRelease, skinRelease, morphRelease, customRelease].forEach((release) => release());
  });

  it("does not replace a raycast installed by another owner during its lifetime", () => {
    const mesh = twoStructures(true);
    const release = enableAnatomyPicking(mesh, { minTriangles: 1 });
    const replacement = () => {};
    mesh.raycast = replacement;
    release();
    expect(mesh.raycast).toBe(replacement);
  });

  it("falls back to native if the draw range or positions change after BVH creation", () => {
    const mesh = twoStructures(true);
    const release = enableAnatomyPicking(mesh, { minTriangles: 1 });
    mesh.geometry.setDrawRange(0, 3);
    expect(intersectAnatomyMeshes(rayAt(-2), [mesh])).toBeNull();
    expect(anatomyStructureIndexFromHit(intersectAnatomyMeshes(rayAt(2), [mesh]))).toBe(82);
    mesh.geometry.setDrawRange(0, Infinity);
    const position = mesh.geometry.getAttribute("position") as BufferAttribute;
    for (let index = 0; index < position.count; index += 1) position.setZ(index, 1);
    position.needsUpdate = true;
    mesh.geometry.computeBoundingSphere();
    expect(intersectAnatomyMeshes(rayAt(2), [mesh])?.distance).toBeCloseTo(4);
    release();
  });

  it("uses world transforms, near/far and Raycaster layers correctly", () => {
    const mesh = twoStructures(true);
    mesh.position.z = 1;
    mesh.scale.set(2, 1, 2);
    mesh.updateMatrixWorld(true);
    const release = enableAnatomyPicking(mesh, { minTriangles: 1 });
    const raycaster = rayAt(4);
    expect(intersectAnatomyMeshes(raycaster, [mesh])?.distance).toBeCloseTo(4);
    raycaster.far = 3;
    expect(intersectAnatomyMeshes(raycaster, [mesh])).toBeNull();
    raycaster.far = Infinity;
    mesh.layers.set(1);
    expect(intersectAnatomyMeshes(raycaster, [mesh])).toBeNull();
    release();
  });

  it("skips hidden ancestors and fully transparent materials before intersecting", () => {
    const root = new Group();
    const front = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const back = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    front.position.z = 2;
    root.add(front);
    root.updateMatrixWorld(true);
    const meshes = [...collectAnatomyPickMeshes(root), back];
    expect(intersectAnatomyMeshes(rayAt(0), meshes)?.object).toBe(front);
    root.visible = false;
    expect(intersectAnatomyMeshes(rayAt(0), meshes)?.object).toBe(back);
    root.visible = true;
    front.material.opacity = 0;
    expect(intersectAnatomyMeshes(rayAt(0), meshes)?.object).toBe(back);
  });

  it("selects the surface behind a clipped first triangle and restores raycaster settings", () => {
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial({
      side: DoubleSide,
      clippingPlanes: [new Plane(new Vector3(0, 0, -1), 0)],
    }));
    const release = enableAnatomyPicking(mesh, { minTriangles: 1 });
    const raycaster = rayAt(0);
    raycaster.firstHitOnly = true;
    const hit = intersectAnatomyMeshes(raycaster, [mesh]);
    expect(hit?.point.z).toBeCloseTo(-1);
    expect(raycaster.firstHitOnly).toBe(true);
    delete raycaster.firstHitOnly;
    intersectAnatomyMeshes(raycaster, [mesh]);
    expect(Object.prototype.hasOwnProperty.call(raycaster, "firstHitOnly")).toBe(false);
    release();
  });

  it("returns null for hits without anatomical ID metadata", () => {
    const mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    expect(anatomyStructureIndexFromHit(intersectAnatomyMeshes(rayAt(0), [mesh]))).toBeNull();
    expect(anatomyStructureIndexFromHit(null)).toBeNull();
  });
});

describe("anatomy pointer policy", () => {
  it("does not hover while dragging or on touch gestures", () => {
    expect(canHoverAnatomyPointer({ buttons: 0, pointerType: "mouse" })).toBe(true);
    expect(canHoverAnatomyPointer({ buttons: 1, pointerType: "mouse" })).toBe(false);
    expect(canHoverAnatomyPointer({ buttons: 2, pointerType: "mouse" })).toBe(false);
    expect(canHoverAnatomyPointer({ buttons: 0, pointerType: "touch" })).toBe(false);
  });
  it("does not select after a drag returns to its starting point", () => {
    const end = { pointerId: 1, clientX: 20, clientY: 30, button: 0 };
    const start = { id: 1, x: 20, y: 30, moved: false };
    expect(isAnatomyClick(start, end)).toBe(true);
    expect(isAnatomyClick({ ...start, moved: true }, end)).toBe(false);
    expect(isAnatomyClick(start, { ...end, clientX: 30 })).toBe(false);
    expect(isAnatomyClick(start, { ...end, button: 2 })).toBe(false);
    expect(isAnatomyClick(start, { ...end, pointerId: 2 })).toBe(false);
    expect(isAnatomyClick(null, end)).toBe(false);
  });
});
