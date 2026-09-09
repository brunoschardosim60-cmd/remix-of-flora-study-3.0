import { BufferGeometry, Vector3 } from "three";

/** Keep cavities attached to their parent bone; never count them as extra bones. */
export function boneAssemblyKey(name: string) {
  return name.toLowerCase().replace(/^sinus of /, "").replace(/^(anterior|middle|posterior) cells of ethmoid bone\.[lr]$/, "ethmoid bone").replace(/\.\d+$/, "").trim();
}

/** Rigid translation per anatomical piece, preserving original topology and source geometry. */
export function expandBoneGeometry(source: BufferGeometry, names: string[], amount: number) {
  const result = source.clone();
  const positions = result.getAttribute("position");
  const ids = result.getAttribute("anatomyStructureId");
  if (!positions || !ids || amount <= 0) return result;
  const groups = new Map<string, { center: Vector3; count: number }>();
  const keys = names.map(boneAssemblyKey);
  const keyFor = (index: number) => keys[Math.round(ids.getX(index))] ?? String(ids.getX(index));
  const point = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    const key = keyFor(i);
    const group = groups.get(key) ?? { center: new Vector3(), count: 0 };
    group.center.add(point.fromBufferAttribute(positions, i)); group.count++;
    groups.set(key, group);
  }
  const center = new Vector3();
  groups.forEach((group) => { group.center.divideScalar(group.count); center.add(group.center); });
  center.divideScalar(Math.max(1, groups.size));
  const offsets = new Map<string, Vector3>();
  groups.forEach((group, key) => {
    const offset = group.center.clone().sub(center);
    // Extra radial spacing opens the skull; vertical scale keeps body regions readable.
    const radial = new Vector3(offset.x, offset.y * .25, offset.z);
    if (radial.lengthSq() > .000001) radial.normalize().multiplyScalar(.65);
    offsets.set(key, offset.multiplyScalar(.6).add(radial).multiplyScalar(amount));
  });
  for (let i = 0; i < positions.count; i++) {
    const delta = offsets.get(keyFor(i))!;
    positions.setXYZ(i, positions.getX(i) + delta.x, positions.getY(i) + delta.y, positions.getZ(i) + delta.z);
  }
  positions.needsUpdate = true;
  result.computeBoundingBox(); result.computeBoundingSphere();
  return result;
}
