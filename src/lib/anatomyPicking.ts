import { Mesh, type BufferAttribute, type BufferGeometry, type Intersection, type Material, type Object3D, type Raycaster } from "three";
import { acceleratedRaycast, CENTER, MeshBVH, type MeshBVHOptions } from "three-mesh-bvh";

type GeometryState = {
  position: BufferGeometry["attributes"][string];
  positionVersion: number;
  index: BufferGeometry["index"];
  indexVersion: number;
  drawStart: number;
  drawCount: number;
  groups: Array<{ start: number; count: number; materialIndex?: number }>;
};
type CachedTree = { tree: MeshBVH; state: GeometryState };
type InstalledMesh = { users: number; original: Mesh["raycast"]; accelerated: Mesh["raycast"]; releaseGeometry: () => void };

const trees = new WeakMap<BufferGeometry, CachedTree>();
const installations = new WeakMap<Mesh, InstalledMesh>();
const geometryUsers = new WeakMap<BufferGeometry, { users: number; tree: MeshBVH; previous: MeshBVH | undefined }>();

function attributeVersion(attribute: BufferGeometry["attributes"][string] | null) {
  if (!attribute) return -1;
  return "data" in attribute ? attribute.data.version : (attribute as BufferAttribute).version;
}

function geometryState(geometry: BufferGeometry): GeometryState {
  return {
    position: geometry.getAttribute("position"),
    positionVersion: attributeVersion(geometry.getAttribute("position")),
    index: geometry.index,
    indexVersion: attributeVersion(geometry.index),
    drawStart: geometry.drawRange.start,
    drawCount: geometry.drawRange.count,
    groups: geometry.groups.map((group) => ({ ...group })),
  };
}

function geometryIsUnchanged(geometry: BufferGeometry, state: GeometryState) {
  return state.position === geometry.getAttribute("position")
    && state.positionVersion === attributeVersion(state.position)
    && state.index === geometry.index
    && state.indexVersion === attributeVersion(geometry.index)
    && state.drawStart === geometry.drawRange.start
    && state.drawCount === geometry.drawRange.count
    && state.groups.length === geometry.groups.length
    && state.groups.every((group, index) => {
      const current = geometry.groups[index];
      return group.start === current.start && group.count === current.count && group.materialIndex === current.materialIndex;
    });
}

function staticMeshCanAccelerate(mesh: Mesh, minTriangles: number) {
  // These subclasses deform or instance positions during their native raycast.
  // Never silently replace that behavior with a BVH of their base geometry.
  const special = mesh as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean; isBatchedMesh?: boolean };
  if (special.isSkinnedMesh || special.isInstancedMesh || special.isBatchedMesh) return false;
  const geometry = mesh.geometry;
  if (Object.values(geometry.morphAttributes).some((attributes) => attributes.length > 0)) return false;
  const position = geometry.getAttribute("position");
  return Boolean(position && (geometry.index?.count ?? position.count) / 3 >= minTriangles);
}

/** Cache only immutable topology; indirect BVHs leave vertex/triangle IDs untouched. */
function treeForGeometry(geometry: BufferGeometry) {
  const cached = trees.get(geometry);
  if (cached && geometryIsUnchanged(geometry, cached.state)) return cached;
  // 0.7.8 supports indirect at runtime, but omits it from its public option type.
  const options: MeshBVHOptions & { indirect: boolean } = {
    strategy: CENTER,
    indirect: true,
    maxLeafTris: 10,
    setBoundingBox: false,
    verbose: false,
  };
  const entry = { tree: new MeshBVH(geometry, options), state: geometryState(geometry) };
  trees.set(geometry, entry);
  if (!cached) {
    const onDispose = () => {
      trees.delete(geometry);
      geometry.removeEventListener("dispose", onDispose);
    };
    geometry.addEventListener("dispose", onDispose);
  }
  return entry;
}

function acquireGeometry(geometry: BufferGeometry, tree: MeshBVH) {
  let owner = geometryUsers.get(geometry);
  if (owner) {
    owner.users += 1;
  } else {
    owner = { users: 1, tree, previous: geometry.boundsTree };
    geometryUsers.set(geometry, owner);
    geometry.boundsTree = tree;
  }
  return () => {
    if (--owner.users !== 0) return;
    if (geometry.boundsTree === owner.tree) {
      if (owner.previous) geometry.boundsTree = owner.previous;
      else delete geometry.boundsTree;
    }
    geometryUsers.delete(geometry);
  };
}

/**
 * Opt in only the provided static meshes, never patch Three's global prototype.
 * Call after geometry preparation, then call the returned release on unmount.
 * Multiple mounted users and meshes sharing a geometry are reference counted.
 */
export function enableAnatomyPicking(root: Object3D, { minTriangles = 1024 }: { minTriangles?: number } = {}) {
  const releases: Array<() => void> = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const mesh = object;
    const existing = installations.get(mesh);
    if (existing) {
      existing.users += 1;
    } else {
      if (mesh.raycast !== Mesh.prototype.raycast || !staticMeshCanAccelerate(mesh, minTriangles)) return;
      const geometry = mesh.geometry;
      // A third-party BVH belongs to its creator. Do not overwrite it.
      if (geometry.boundsTree && !geometryUsers.has(geometry)) return;
      try {
        const entry = treeForGeometry(geometry);
        const original = mesh.raycast;
        const accelerated: Mesh["raycast"] = function (raycaster, hits) {
          if (this.geometry === geometry && geometry.boundsTree === entry.tree && geometryIsUnchanged(geometry, entry.state)) {
            acceleratedRaycast.call(this, raycaster, hits);
          } else {
            // A changed draw range/topology or animation must not use stale bounds.
            original.call(this, raycaster, hits);
          }
        };
        const releaseGeometry = acquireGeometry(geometry, entry.tree);
        mesh.raycast = accelerated;
        installations.set(mesh, { users: 1, original, accelerated, releaseGeometry });
      } catch {
        // Unsupported or malformed geometry retains native Three picking.
        return;
      }
    }
    releases.push(() => {
      const installed = installations.get(mesh);
      if (!installed || --installed.users !== 0) return;
      if (mesh.raycast === installed.accelerated) mesh.raycast = installed.original;
      installed.releaseGeometry();
      installations.delete(mesh);
    });
  });
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    releases.forEach((release) => release());
  };
}

export function collectAnatomyPickMeshes(root: Object3D) {
  const meshes: Mesh[] = [];
  root.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
  return meshes;
}

function meshIsVisible(mesh: Mesh) {
  let object: Object3D | null = mesh;
  while (object) {
    if (!object.visible) return false;
    object = object.parent;
  }
  return true;
}

function materialIsVisible(material?: Material) {
  return Boolean(material?.visible && material.opacity > .025);
}

function hitIsVisible(hit: Intersection, mesh: Mesh) {
  const material = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material;
  if (!materialIsVisible(material)) return false;
  const planes = material.clippingPlanes;
  if (!planes?.length) return true;
  const outside = (plane: (typeof planes)[number]) => plane.distanceToPoint(hit.point) < -1e-7;
  return !(material.clipIntersection ? planes.every(outside) : planes.some(outside));
}

/** Pick only visible meshes, and do not select a surface removed by a section plane. */
export function intersectAnatomyMeshes(raycaster: Raycaster, meshes: readonly Mesh[]): Intersection | null {
  const previousFirstHitOnly = raycaster.firstHitOnly;
  let nearest: Intersection | null = null;
  try {
    for (const mesh of meshes) {
      if (!meshIsVisible(mesh)) continue;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!materials.some(materialIsVisible)) continue;
      // A clipped/hidden first triangle may have a visible triangle behind it.
      raycaster.firstHitOnly = materials.every((material) => materialIsVisible(material) && !material.clippingPlanes?.length);
      const hits = raycaster.intersectObject(mesh, false);
      for (const hit of hits) {
        if (nearest && hit.distance >= nearest.distance) break;
        if (hitIsVisible(hit, mesh)) { nearest = hit; break; }
      }
    }
    return nearest;
  } finally {
    if (previousFirstHitOnly === undefined) delete raycaster.firstHitOnly;
    else raycaster.firstHitOnly = previousFirstHitOnly;
  }
}

export function anatomyStructureIndexFromHit(hit: Intersection | null) {
  if (!hit?.face || !(hit.object instanceof Mesh)) return null;
  const ids = hit.object.geometry.getAttribute("anatomyStructureId");
  if (!ids || hit.face.a < 0 || hit.face.a >= ids.count) return null;
  const index = ids.getX(hit.face.a);
  return Number.isFinite(index) && index >= 0 ? Math.round(index) : null;
}

export const ANATOMY_HOVER_INTERVAL_MS = 100;
export const ANATOMY_CLICK_SLOP_PX = 5;

export function canHoverAnatomyPointer(pointer: { buttons: number; pointerType: string }) {
  return pointer.buttons === 0 && pointer.pointerType !== "touch";
}

export function isAnatomyClick(start: { id: number; x: number; y: number; moved: boolean } | null, end: { pointerId: number; clientX: number; clientY: number; button: number }) {
  return Boolean(start && !start.moved && end.button === 0 && start.id === end.pointerId
    && Math.hypot(end.clientX - start.x, end.clientY - start.y) <= ANATOMY_CLICK_SLOP_PX);
}
