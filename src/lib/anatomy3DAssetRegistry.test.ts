import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { medicalSources } from "./medicineData";
import {
  anatomy3DAssets,
  heartAnatomyForId,
  heartAnatomyForMeshName,
  heartExteriorMeshDefinitions,
  heartInteriorMeshDefinitions,
  heartRepresentationForAvailability,
  isHeartInteriorStructureId,
} from "./anatomy3DAssetRegistry";

function glbMeshNames(file: Buffer) {
  expect(file.toString("ascii", 0, 4)).toBe("glTF");
  const jsonLength = file.readUInt32LE(12);
  const jsonChunkType = file.toString("ascii", 16, 20);
  expect(jsonChunkType).toBe("JSON");
  const document = JSON.parse(file.toString("utf8", 20, 20 + jsonLength));
  return (document.meshes as Array<{ name?: string }>).map((mesh) => mesh.name ?? "");
}

describe("anatomy3DAssetRegistry", () => {
  it("mantém assets progressivos, existentes e ligados a fontes licenciadas", () => {
    for (const asset of Object.values(anatomy3DAssets)) {
      const path = resolve(process.cwd(), "public", asset.path.replace(/^\//, ""));
      expect(statSync(path).size, asset.id).toBeGreaterThan(asset.expectedMinimumBytes);
      expect(medicalSources[asset.sourceId], `${asset.id}: ${asset.sourceId}`).toBeDefined();
      expect(asset.license).toMatch(/^CC BY/);
    }
    expect(anatomy3DAssets.bodyBase.loadMode).toBe("base");
    expect(anatomy3DAssets.cardiovascular.loadMode).toBe("system");
    expect(anatomy3DAssets.heartInterior.loadMode).toBe("organ");
  });

  it("valida integridade e as 14 malhas reais do coração NIH", () => {
    const path = resolve(process.cwd(), "public", anatomy3DAssets.heartInterior.path.replace(/^\//, ""));
    const file = readFileSync(path);
    expect(createHash("sha256").update(file).digest("hex").toUpperCase()).toBe("9AFDFB2CCF926869813582CFE150DCE8CB28377417A968A4F29A5B8DC060428B");
    const meshNames = glbMeshNames(file);
    expect(meshNames).toHaveLength(anatomy3DAssets.heartInterior.meshCount);
    expect(meshNames).toEqual(expect.arrayContaining(heartInteriorMeshDefinitions.map((item) => item.meshName)));
    expect(heartInteriorMeshDefinitions).toHaveLength(14);
  });

  it("normaliza mesh → ID anatômico estável sem duplicações", () => {
    const all = [...heartInteriorMeshDefinitions, ...heartExteriorMeshDefinitions];
    expect(new Set(all.map((item) => item.meshName)).size).toBe(all.length);
    expect(new Set(all.map((item) => item.anatomicalId)).size).toBe(all.length);
    all.forEach((item) => {
      expect(heartAnatomyForMeshName(item.meshName)).toBe(item);
      expect(heartAnatomyForId(item.anatomicalId)).toBe(item);
      expect(item.name.length).toBeGreaterThan(3);
      expect(item.latin.length).toBeGreaterThan(3);
      expect(item.summary.length).toBeGreaterThan(30);
      expect(item.function.length).toBeGreaterThan(30);
      expect(medicalSources[item.sourceId]).toBeDefined();
    });
    expect(heartAnatomyForMeshName("mesh-sem-mapeamento")).toBeUndefined();
  });

  it("distingue estruturas internas para fallback e troca de representação", () => {
    expect(isHeartInteriorStructureId("model:heart:left-ventricle")).toBe(true);
    expect(isHeartInteriorStructureId("model:heart:mitral-valve")).toBe(true);
    expect(isHeartInteriorStructureId("model:heart:ascending-aorta")).toBe(false);
    expect(isHeartInteriorStructureId("organ-heart")).toBe(false);
    expect(heartRepresentationForAvailability(true, true)).toBe("interior");
    expect(heartRepresentationForAvailability(true, false)).toBe("exterior-fallback");
    expect(heartRepresentationForAvailability(false, false)).toBe("exterior");
  });
});
