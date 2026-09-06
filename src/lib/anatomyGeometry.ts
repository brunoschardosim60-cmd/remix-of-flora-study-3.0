import { type BufferGeometry, type Matrix4 } from "three";

/** Bake a mesh transform without losing the front-face orientation of mirrored anatomy.
 * Three handles negative determinant objects while rendering. Once meshes are merged,
 * that object transform disappears, so reflected triangles must be reversed here.
 * Neither positions nor anatomical proportions are welded or reshaped.
 */
export function bakeAnatomyGeometry(source: BufferGeometry, worldMatrix: Matrix4): BufferGeometry {
  const geometry = source.clone();
  geometry.applyMatrix4(worldMatrix);
  if (worldMatrix.determinant() >= 0) return geometry;
  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    index.needsUpdate = true;
  } else {
    for (const attribute of Object.values(geometry.attributes)) {
      for (let i = 0; i < attribute.count; i += 3) {
        for (let component = 0; component < attribute.itemSize; component++) {
          const b = attribute.getComponent(i + 1, component);
          attribute.setComponent(i + 1, component, attribute.getComponent(i + 2, component));
          attribute.setComponent(i + 2, component, b);
        }
      }
      attribute.needsUpdate = true;
    }
  }
  // Mirroring reverses the tangent handedness as well as triangle winding.
  const tangent = geometry.getAttribute("tangent");
  if (tangent?.itemSize === 4) {
    for (let i = 0; i < tangent.count; i++) tangent.setW(i, -tangent.getW(i));
    tangent.needsUpdate = true;
  }
  return geometry;
}
