import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readGlb(name: string) {
  const bytes = readFileSync(resolve(process.cwd(), "public/medicine/models", name));
  const length = bytes.readUInt32LE(12);
  return { bytes, json: JSON.parse(bytes.subarray(20, 20 + length).toString("utf8")), binary: bytes.subarray(28 + length) };
}

const source = readGlb("zanatomy-nervous-hd-v2.glb");
const eyes = readGlb("zanatomy-surface-eyes-v1.glb");

describe("body-aligned surface eye supplement", () => {
  it("includes the original bilateral sclera, iris, cornea and posterior segments", () => {
    expect(eyes.json.nodes.map((node: { extras: { anatomyName: string } }) => node.extras.anatomyName).sort()).toEqual([
      "Cornea.l", "Cornea.r", "Iris.l", "Iris.r", "Posterior segment of eyeball.l",
      "Posterior segment of eyeball.r", "Sclera.l", "Sclera.r",
    ]);
  });

  it("preserves original source transforms instead of centering both eyes on the origin", () => {
    for (const node of eyes.json.nodes) {
      const original = source.json.nodes.find((item: { extras: { anatomyName: string } }) => item.extras.anatomyName === node.extras.anatomyName);
      expect(node.translation).toEqual(original.translation);
      expect(node.rotation).toEqual(original.rotation);
      expect(node.scale).toEqual(original.scale);
      expect(node.translation[1]).toBeGreaterThan(1.59);
    }
  });

  it("keeps every Draco stream byte-for-byte identical to its licensed source", () => {
    for (const node of eyes.json.nodes) {
      const original = source.json.nodes.find((item: { extras: { anatomyName: string } }) => item.extras.anatomyName === node.extras.anatomyName);
      const sourcePrimitive = source.json.meshes[original.mesh].primitives[0];
      const eyePrimitive = eyes.json.meshes[node.mesh].primitives[0];
      const sourceView = source.json.bufferViews[sourcePrimitive.extensions.KHR_draco_mesh_compression.bufferView];
      const eyeView = eyes.json.bufferViews[eyePrimitive.extensions.KHR_draco_mesh_compression.bufferView];
      expect(eyes.binary.subarray(eyeView.byteOffset, eyeView.byteOffset + eyeView.byteLength)).toEqual(
        source.binary.subarray(sourceView.byteOffset, sourceView.byteOffset + sourceView.byteLength),
      );
      expect(eyes.json.accessors[eyePrimitive.indices].count).toBe(source.json.accessors[sourcePrimitive.indices].count);
      expect(eyes.json.accessors[eyePrimitive.attributes.POSITION]).toEqual(source.json.accessors[sourcePrimitive.attributes.POSITION]);
    }
  });

  it("does not obscure the iris with an opaque white cornea", () => {
    for (const node of eyes.json.nodes.filter((node: { extras: { anatomySurfaceMaterial: string } }) => node.extras.anatomySurfaceMaterial === "cornea")) {
      const primitive = eyes.json.meshes[node.mesh].primitives[0];
      const material = eyes.json.materials[primitive.material];
      expect(material.alphaMode).toBe("BLEND");
      expect(material.pbrMetallicRoughness.baseColorFactor[3]).toBeLessThan(.15);
    }
  });

  it("retains a dark interior behind the iris aperture without inventing a pupil mesh", () => {
    const interior = eyes.json.nodes.filter((node: { extras: { anatomySurfaceMaterial: string } }) => node.extras.anatomySurfaceMaterial === "eyeInterior");
    expect(interior).toHaveLength(2);
    for (const node of interior) {
      expect(node.extras.anatomyName).toMatch(/^Posterior segment of eyeball\./);
      const primitive = eyes.json.meshes[node.mesh].primitives[0];
      expect(Math.max(...eyes.json.materials[primitive.material].pbrMetallicRoughness.baseColorFactor.slice(0, 3))).toBeLessThan(.02);
    }
  });

  it("stays compact and retains attribution in the distributable artifact", () => {
    expect(eyes.bytes.length).toBeLessThan(128_000);
    expect(eyes.json.asset.extras.license).toBe("CC-BY-SA-4.0");
    expect(eyes.json.asset.extras.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(eyes.json.asset.copyright).toContain("Z-Anatomy");
    expect(eyes.json.asset.copyright).toContain("BodyParts3D");
  });
});
