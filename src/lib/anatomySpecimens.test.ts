import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anatomySpecimens } from "./anatomySpecimens";
import { anatomyModelSelection } from "./anatomyModelSelection";

describe("imported realistic assets", () => {
  it("preserves the user's original GLB, embedded maps and single exterior mesh", () => {
    const item = anatomySpecimens[0];
    const bytes = readFileSync(`public${item.path}`);
    expect(bytes.length).toBe(item.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(item.sha256);
    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const length = bytes.readUInt32LE(12);
    const doc = JSON.parse(bytes.toString("utf8", 20, 20 + length));
    expect(doc.meshes).toHaveLength(1);
    expect(doc.materials).toHaveLength(1);
    expect(doc.images).toHaveLength(3);
    expect(doc.animations ?? []).toHaveLength(0);
    expect(doc.buffers.every((buffer: { uri?: string }) => !buffer.uri)).toBe(true);
    expect(doc.images.every((image: { uri?: string }) => !image.uri)).toBe(true);
    expect(doc.accessors[doc.meshes[0].primitives[0].indices].count / 3).toBe(item.triangles);
    expect(doc.materials[0].pbrMetallicRoughness.baseColorTexture).toBeDefined();
    expect(doc.materials[0].pbrMetallicRoughness.metallicRoughnessTexture).toBeDefined();
    expect(doc.materials[0].normalTexture).toBeDefined();
    for (const image of doc.images) {
      const offset = 28 + length + doc.bufferViews[image.bufferView].byteOffset;
      expect(bytes.readUInt32BE(offset + 16)).toBe(2048);
      expect(bytes.readUInt32BE(offset + 20)).toBe(2048);
    }
  });

  it("only advertises candidates as imported when there is a verified asset", () => {
    expect(anatomyModelSelection.filter((item) => item.status === "integrated").map((item) => item.id)).toEqual(anatomySpecimens.map((item) => item.id));
    const attribution = readFileSync("public/medicine/models/ATTRIBUTION.md", "utf8");
    for (const item of anatomySpecimens) {
      expect(attribution).toContain(item.sha256);
      expect(attribution).toContain(item.sourceUrl);
      expect(attribution).toContain(item.licenseUrl);
    }
  });
});
