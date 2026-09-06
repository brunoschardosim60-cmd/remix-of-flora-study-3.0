import { Box3, BufferAttribute, BufferGeometry, Vector3 } from "three";

export function frameAnatomyBounds(bounds: Box3, aspect: number, fov = 36) {
  const size = bounds.getSize(new Vector3());
  const tangent = Math.tan(fov * Math.PI / 360);
  const distance = Math.max(size.y / (2 * tangent), size.x / (2 * tangent * Math.max(.25, aspect))) + size.z / 2;
  return { focus: bounds.getCenter(new Vector3()).toArray() as [number, number, number], distance: Math.max(.85, distance * 1.2) };
}

/** A compact, independent subset; neither source indices nor vertex attributes are mutated. */
export function isolateAnatomyGeometry(source: BufferGeometry, structureIds: ReadonlySet<number>, baseColors?: Float32Array): BufferGeometry | null {
  const ids = source.getAttribute("anatomyStructureId");
  const positions = source.getAttribute("position");
  if (!ids || !positions || !structureIds.size) return null;
  const sourceIndex = source.getIndex();
  const count = sourceIndex?.count ?? positions.count;
  const vertices = new Map<number, number>();
  const indices: number[] = [];
  for (let i = 0; i + 2 < count; i += 3) {
    const triangle = [0, 1, 2].map((offset) => sourceIndex ? sourceIndex.getX(i + offset) : i + offset);
    // Never fabricate a bridge between different anatomical structures.
    if (!triangle.every((vertex) => structureIds.has(Math.round(ids.getX(vertex))))) continue;
    for (const vertex of triangle) {
      if (!vertices.has(vertex)) vertices.set(vertex, vertices.size);
      indices.push(vertices.get(vertex)!);
    }
  }
  if (!indices.length) return null;
  const geometry = new BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    // getComponent reads normalized/interleaved values correctly; export actual values as floats.
    const values = new Float32Array(vertices.size * attribute.itemSize);
    for (const [sourceVertex, targetVertex] of vertices) {
      for (let component = 0; component < attribute.itemSize; component++) {
        values[targetVertex * attribute.itemSize + component] = name === "color" && baseColors
          ? baseColors[sourceVertex * attribute.itemSize + component]
          : attribute.getComponent(sourceVertex, component);
      }
    }
    geometry.setAttribute(name, new BufferAttribute(values, attribute.itemSize));
  }
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
