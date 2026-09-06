import { BufferAttribute, Color, DoubleSide, Group, Mesh, MeshPhysicalMaterial, type Object3D } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bakeAnatomyGeometry } from "./anatomyGeometry";
import { anatomySurfaceSourceName, classifyAnatomySkinRegion, type AnatomySkinRegion } from "./anatomySkinRegions";

export const ANATOMY_SKIN_TONE = "#c99c83";
export const anatomySurfaceFinishes = {
  skin: { color: ANATOMY_SKIN_TONE, roughness: .62, specularIntensity: .46, sheen: .12 },
  hair: { color: "#33241f", roughness: .83, specularIntensity: .28, sheen: .2 },
  lip: { color: "#ac6d65", roughness: .5, specularIntensity: .5, sheen: .06 },
  nail: { color: "#d5b4a2", roughness: .36, specularIntensity: .5, sheen: .02 },
} satisfies Record<AnatomySkinRegion, { color: string; roughness: number; specularIntensity: number; sheen: number }>;

/** Batch by tissue, not by atlas object. Keep source geometry and normals intact. */
export function buildAnatomySkinSurface(alignedSource: Object3D): Group {
  alignedSource.updateMatrixWorld(true);
  const batches = new Map<AnatomySkinRegion, Mesh["geometry"][]>();
  alignedSource.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const region = classifyAnatomySkinRegion(anatomySurfaceSourceName(object));
    const geometry = bakeAnatomyGeometry(object.geometry, object.matrixWorld);
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== "position" && name !== "normal") geometry.deleteAttribute(name);
    }
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const base = new Color(anatomySurfaceFinishes[region].color);
    const tone = new Color();
    for (let i = 0; i < positions.count; i++) {
      // Low-amplitude, continuous variation. abs(X) gives both halves the same
      // finish; never tint mirrored source objects independently.
      const x = Math.abs(positions.getX(i));
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const variation = Math.sin(x * 9.7 + y * 6.3 + z * 8.1) * .004;
      tone.copy(base).offsetHSL(0, 0, region === "skin" ? variation : 0);
      colors.set([tone.r, tone.g, tone.b], i * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    const batch = batches.get(region) ?? [];
    batch.push(geometry);
    batches.set(region, batch);
  });

  const root = new Group();
  root.name = "superficie-corporal-natural";
  for (const [region, geometries] of batches) {
    const combined = mergeGeometries(geometries, false);
    if (!combined) throw new Error(`Não foi possível preparar o acabamento: ${region}.`);
    const geometry = mergeVertices(combined, .000001);
    combined.dispose();
    geometries.forEach((part) => part.dispose());
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const finish = anatomySurfaceFinishes[region];
    const material = new MeshPhysicalMaterial({
      ...finish, color: "#ffffff", vertexColors: true, metalness: 0,
      clearcoat: 0, ior: 1.4, side: DoubleSide,
    });
    const mesh = new Mesh(geometry, material);
    mesh.name = `superficie-${region}`;
    mesh.userData.anatomySkinRegion = region;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    root.add(mesh);
  }
  return root;
}
