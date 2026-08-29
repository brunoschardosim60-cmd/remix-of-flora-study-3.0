import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { medicalSources } from "./medicineData";
import {
  anatomy3DAssets,
  detailedOrganKindsForSelection,
  heartAnatomyForId,
  heartAnatomyForMeshName,
  heartExteriorMeshDefinitions,
  heartInteriorMeshDefinitions,
  heartRepresentationForAvailability,
  isHeartInteriorStructureId,
  hraDetailedOrganAssets,
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

  it("valida os modelos HRA multi-órgão e sua segmentação real", () => {
    const expectedHashes: Record<string, string> = {
      brain: "C5711A1A8BC62CA930B8BCF076DEF15315C11F5AD9BC7901E51F698406D38DBC",
      lungs: "323D27BB76BA2C5B140FF31AD5190627EEB8D4E37CD220E4B541655D67789C1A",
      liver: "AD9B0BE0FF253E7BFE31BFFFC00017DAFCE226D4F3E7804A81CBB4C2E269D598",
      "kidney-left": "8AC1228E4DB8C07CBF9F6C6DC7CA522C5B8D61F641927233A29AE6609B577403",
      "kidney-right": "A67508E6948723D34A29FEA2BC8C96931A8FE2F8A08293FD1C3161CFCF13968E",
    };
    for (const [kind, definition] of Object.entries(hraDetailedOrganAssets)) {
      const path = resolve(process.cwd(), "public", definition.asset.path.replace(/^\//, ""));
      const file = readFileSync(path);
      expect(createHash("sha256").update(file).digest("hex").toUpperCase(), kind).toBe(expectedHashes[kind]);
      expect(glbMeshNames(file), kind).toHaveLength(definition.asset.meshCount);
      expect(definition.asset.loadMode).toBe("organ");
      expect(definition.asset.license).toBe("CC BY 4.0");
    }
  });

  it("resolve órgãos detalhados apenas quando a seleção pede o LOD de órgão", () => {
    expect(detailedOrganKindsForSelection("organ-brain")).toEqual(["brain"]);
    expect(detailedOrganKindsForSelection("organ-lungs")).toEqual(["lungs"]);
    expect(detailedOrganKindsForSelection("organ-liver")).toEqual(["liver"]);
    expect(detailedOrganKindsForSelection("organ-kidneys")).toEqual(["kidney-left", "kidney-right"]);
    expect(detailedOrganKindsForSelection("model:hra:brain:allen-thalamus-l")).toEqual(["brain"]);
    expect(detailedOrganKindsForSelection("organ-heart")).toEqual([]);
    expect(detailedOrganKindsForSelection(null)).toEqual([]);
  });
});
