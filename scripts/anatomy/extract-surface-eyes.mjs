/**
 * Reproduce the small, body-aligned eye supplement without re-encoding Draco.
 * Run from any directory: node scripts/anatomy/extract-surface-eyes.mjs
 * The original topology and local transforms remain byte-for-byte unchanged.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Box3, Color, Matrix4, Quaternion, Vector3 } from "three";

const sourceUrl = new URL("../../public/medicine/models/zanatomy-nervous-hd-v2.glb", import.meta.url);
const outputUrl = new URL("../../public/medicine/models/zanatomy-surface-eyes-v1.glb", import.meta.url);
const sourceBytes = readFileSync(sourceUrl);
assert.equal(sourceBytes.readUInt32LE(0), 0x46546c67, "Expected a GLB source");
assert.equal(sourceBytes.readUInt32LE(4), 2, "Only GLB v2 is supported");
const jsonLength = sourceBytes.readUInt32LE(12);
const source = JSON.parse(sourceBytes.subarray(20, 20 + jsonLength).toString("utf8"));
const binOffset = 20 + jsonLength;
assert.equal(sourceBytes.readUInt32LE(binOffset + 4), 0x004e4942, "Expected binary GLB chunk");
const binary = sourceBytes.subarray(binOffset + 8, binOffset + 8 + sourceBytes.readUInt32LE(binOffset));

// The posterior segment is the existing dark interior seen through the pupil;
// it is not relabelled as a newly invented anatomical pupil mesh.
const roles = [
  ["Sclera", "sclera", "#e9e6dc", .28, 1],
  ["Posterior segment of eyeball", "eyeInterior", "#120e0b", .6, 1],
  ["Iris", "iris", "#6f5638", .4, 1],
  ["Cornea", "cornea", "#ffffff", .05, .08],
];
const selected = source.nodes.filter((node) => roles.some(([name]) => new RegExp(`^${name}\\.[rl]$`).test(node.extras?.anatomyName)));
assert.equal(selected.length, 8, "Expected bilateral sclera, posterior segment, iris and cornea");
const sourceScene = new Set(source.scenes[source.scene ?? 0].nodes);
for (const node of selected) {
  assert(sourceScene.has(source.nodes.indexOf(node)), "Extraction requires source nodes already at scene root");
  assert(!node.children?.length && node.mesh !== undefined && node.skin === undefined, "Unsupported eye-node hierarchy");
}

const materials = roles.map(([, role, color, roughness, alpha]) => ({
  name: `Flora eye ${role}`,
  doubleSided: true,
  ...(alpha < 1 ? { alphaMode: "BLEND" } : {}),
  pbrMetallicRoughness: {
    baseColorFactor: [...new Color(color).toArray(), alpha],
    metallicFactor: 0,
    roughnessFactor: roughness,
  },
}));
const output = {
  asset: {
    version: "2.0", generator: "Flora extract-surface-eyes.mjs",
    copyright: "Z-Anatomy contributors / BodyParts3D, DBCLS. CC BY-SA 4.0. See ATTRIBUTION.md.",
    extras: {
      source: "zanatomy-nervous-hd-v2.glb",
      sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
      license: "CC-BY-SA-4.0",
      changes: "Subset of 8 original meshes; Draco bytes and transforms preserved; differentiated surface materials.",
    },
  },
  scene: 0, scenes: [{ name: "Aligned surface eyes", nodes: [] }], nodes: [], meshes: [],
  accessors: [], bufferViews: [], buffers: [], materials,
  extensionsUsed: ["KHR_draco_mesh_compression"], extensionsRequired: ["KHR_draco_mesh_compression"],
};
const bufferMap = new Map();
const accessorMap = new Map();
const binaryParts = [];
let binaryLength = 0;

function copyBufferView(index) {
  if (bufferMap.has(index)) return bufferMap.get(index);
  const view = source.bufferViews[index];
  assert.equal(view.buffer, 0, "Only the embedded binary buffer is supported");
  const padding = (4 - binaryLength % 4) % 4;
  if (padding) { binaryParts.push(Buffer.alloc(padding)); binaryLength += padding; }
  const next = output.bufferViews.length;
  output.bufferViews.push({ ...view, buffer: 0, byteOffset: binaryLength });
  const bytes = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  assert.equal(bytes.length, view.byteLength);
  binaryParts.push(bytes);
  binaryLength += bytes.length;
  bufferMap.set(index, next);
  return next;
}

function copyAccessor(index) {
  if (accessorMap.has(index)) return accessorMap.get(index);
  const accessor = structuredClone(source.accessors[index]);
  assert(!accessor.sparse, "Sparse eye accessors need an explicit extraction path");
  if (accessor.bufferView !== undefined) accessor.bufferView = copyBufferView(accessor.bufferView);
  const next = output.accessors.length;
  output.accessors.push(accessor);
  accessorMap.set(index, next);
  return next;
}

const bounds = new Box3();
let triangles = 0;
for (const node of selected) {
  const roleIndex = roles.findIndex(([name]) => node.extras.anatomyName.startsWith(`${name}.`));
  const mesh = structuredClone(source.meshes[node.mesh]);
  for (const primitive of mesh.primitives) {
    assert.equal(primitive.mode ?? 4, 4, "Expected triangles");
    const position = source.accessors[primitive.attributes.POSITION];
    const local = new Box3(new Vector3(...position.min), new Vector3(...position.max));
    const transform = new Matrix4().compose(new Vector3(...(node.translation ?? [0, 0, 0])),
      new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
    bounds.union(local.applyMatrix4(transform));
    triangles += source.accessors[primitive.indices].count / 3;
    primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([key, index]) => [key, copyAccessor(index)]));
    primitive.indices = copyAccessor(primitive.indices);
    primitive.material = roleIndex;
    const draco = primitive.extensions.KHR_draco_mesh_compression;
    draco.bufferView = copyBufferView(draco.bufferView);
  }
  const nextNode = structuredClone(node);
  nextNode.mesh = output.meshes.length;
  nextNode.extras.anatomySurfaceMaterial = roles[roleIndex][1];
  output.scenes[0].nodes.push(output.nodes.length);
  output.nodes.push(nextNode);
  output.meshes.push(mesh);
}

assert(bounds.min.y > 1.57 && bounds.max.y < 1.61 && bounds.max.x < .045 && bounds.min.x > -.045,
  "Eye bounds must remain aligned to the Z-Anatomy head, not centered at world origin");
output.buffers.push({ byteLength: binaryLength });
const jsonBytes = Buffer.from(JSON.stringify(output));
const jsonPadded = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 0x20)]);
const binaryBytes = Buffer.concat([...binaryParts, Buffer.alloc((4 - binaryLength % 4) % 4)]);
const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binaryBytes.length, 8);
jsonHeader.writeUInt32LE(jsonPadded.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
binHeader.writeUInt32LE(binaryBytes.length); binHeader.writeUInt32LE(0x004e4942, 4);
const artifact = Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binaryBytes]);
assert(artifact.length < 128_000, "Eye supplement exceeded the small-file budget");
writeFileSync(outputUrl, artifact);
console.log(JSON.stringify({ file: fileURLToPath(outputUrl), bytes: artifact.length, meshes: selected.length,
  triangles, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  sha256: createHash("sha256").update(artifact).digest("hex") }, null, 2));
