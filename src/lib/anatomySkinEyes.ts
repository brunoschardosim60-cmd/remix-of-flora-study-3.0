import { Color, DoubleSide, FrontSide, Mesh, MeshPhysicalMaterial, Object3D, type BufferGeometry, type Material } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bakeAnatomyGeometry } from "./anatomyGeometry";

export type AnatomySkinEyeRole = "sclera" | "iris" | "cornea" | "eyeInterior";

const eyeProfiles = {
  sclera: { color: "#e9e6dc", roughness: .28, opacity: 1 },
  iris: { color: "#6f5638", roughness: .4, opacity: 1 },
  cornea: { color: "#ffffff", roughness: .05, opacity: .08 },
  eyeInterior: { color: "#120e0b", roughness: .6, opacity: 1 },
} satisfies Record<AnatomySkinEyeRole, { color: string; roughness: number; opacity: number }>;

function eyeRole(object: Object3D): AnatomySkinEyeRole | null {
  const role = object.userData.anatomySurfaceMaterial;
  return typeof role === "string" && Object.prototype.hasOwnProperty.call(eyeProfiles, role) ? role as AnatomySkinEyeRole : null;
}

function eyeMaterial(role: AnatomySkinEyeRole, original?: Material) {
  const profile = eyeProfiles[role];
  const originalColor = original && "color" in original && original.color instanceof Color ? original.color : null;
  const material = new MeshPhysicalMaterial({
    color: originalColor ?? profile.color,
    metalness: 0,
    roughness: profile.roughness,
    opacity: profile.opacity,
    transparent: role === "cornea",
    depthWrite: role !== "cornea",
    depthTest: true,
    side: role === "cornea" ? FrontSide : DoubleSide,
    // Do not enable transmission: it adds another render target and would
    // override the cheap alpha-based, non-opaque cornea used by this atlas.
    transmission: 0,
    ior: role === "cornea" ? 1.376 : 1.4,
    specularIntensity: role === "eyeInterior" ? .08 : .45,
    clearcoat: role === "sclera" || role === "iris" ? .08 : 0,
    clearcoatRoughness: .35,
    vertexColors: false,
  });
  material.name = `surface-eye-${role}`;
  return material;
}

/**
 * The caller must apply the SAME body alignment as the skin before calling.
 * Bakes world transforms (including mirrored left eyes) into clone geometries;
 * never independently centers/scales an eyeball or modifies a cached GLTF.
 */
export function prepareAnatomySkinEyes(alignedSource: Object3D): Object3D {
  alignedSource.updateMatrixWorld(true);
  const batches = new Map<AnatomySkinEyeRole, { geometries: BufferGeometry[]; material: Material; names: string[] }>();
  alignedSource.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const role = eyeRole(object);
    if (!role) return;
    const geometry = bakeAnatomyGeometry(object.geometry, object.matrixWorld);
    // The supplement uses explicit role materials; a stale vertex color/tint
    // must not multiply the white sclera or recolor the transparent cornea.
    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== "position" && attribute !== "normal") geometry.deleteAttribute(attribute);
    }
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const originalMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
    const batch = batches.get(role) ?? { geometries: [], material: originalMaterial, names: [] };
    batch.geometries.push(geometry);
    batch.names.push(object.userData.anatomyName ?? object.name);
    batches.set(role, batch);
  });

  const root = new Object3D();
  root.name = "surface-eyes-aligned";
  for (const [role, batch] of batches) {
    // A future source may mix indexed/unindexed primitives. Normalize only in
    // that case; the current source keeps its original compact index buffers.
    const hasIndexed = batch.geometries.some((geometry) => Boolean(geometry.index));
    const hasUnindexed = batch.geometries.some((geometry) => !geometry.index);
    const geometries = hasIndexed && hasUnindexed ? batch.geometries.map((geometry) => {
      if (!geometry.index) return geometry;
      const unindexed = geometry.toNonIndexed();
      geometry.dispose();
      return unindexed;
    }) : batch.geometries;
    const combined = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!combined) throw new Error(`Não foi possível preparar a superfície ocular (${role}).`);
    combined.computeBoundingBox();
    combined.computeBoundingSphere();
    const mesh = new Mesh(combined, eyeMaterial(role, batch.material));
    mesh.name = `surface-eye-${role}`;
    mesh.userData.anatomySurfaceMaterial = role;
    mesh.userData.anatomySourceNames = batch.names;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    root.add(mesh);
  }
  return root;
}
