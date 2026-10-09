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

function glbDocument(file: Buffer) {
  expect(file.toString("ascii", 0, 4)).toBe("glTF");
  const jsonLength = file.readUInt32LE(12);
  return JSON.parse(file.toString("utf8", 20, 20 + jsonLength)) as {
    meshes?: Array<{ name?: string }>;
    nodes?: Array<{ extras?: { anatomyName?: string; anatomyType?: string; structureId?: string; systemId?: string } }>;
    extensionsUsed?: string[];
  };
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

  it("usa os cinco pacotes Vayu/Z-Anatomy como base segmentada do corpo", () => {
    const expectedHashes: Record<string, string> = {
      "muscular-base": "57027A81B445431BCF5A23F35F93147C378AE9CFD7DCA08C267A8722BEB5CD2A",
      "skeletal-base": "736B922982BE995755B40679B09FC973D88FF3BD59493A91796BAED597E3CE36",
      cardiovascular: "1F39C2FDD47C52D6291AE6D41C21F95EB94C0D21631633C6CD3F51ECB2497FF6",
      nervous: "1A617BC8B9EA3C23E5D1F58A92E287B88AE064C2971ED3CEDE61E5092E44ECB2",
      organs: "C91EBA7B6D59F14CFFF8506A547114F6E5B727B308E666CAA1947DA249A07A1D",
    };
    const primary = [
      anatomy3DAssets.bodyBase,
      anatomy3DAssets.skeletalBase,
      anatomy3DAssets.cardiovascular,
      anatomy3DAssets.nervous,
      anatomy3DAssets.organs,
    ];

    for (const asset of primary) {
      const path = resolve(process.cwd(), "public", asset.path.replace(/^\//, ""));
      const file = readFileSync(path);
      const document = glbDocument(file);
      const extras = document.nodes?.flatMap((node) => node.extras ? [node.extras] : []) ?? [];
      expect(createHash("sha256").update(file).digest("hex").toUpperCase(), asset.id).toBe(expectedHashes[asset.id]);
      expect(document.meshes, asset.id).toHaveLength(asset.meshCount);
      expect(extras.length, asset.id).toBeGreaterThan(asset.structureCount * .95);
      expect(extras.every((item) => Boolean(item.structureId && item.systemId)), asset.id).toBe(true);
      expect(document.extensionsUsed, asset.id).toContain("KHR_draco_mesh_compression");
    }

    const redistributedNames = primary.flatMap((asset) => {
      const path = resolve(process.cwd(), "public", asset.path.replace(/^\//, ""));
      return glbDocument(readFileSync(path)).nodes?.flatMap((node) => node.extras?.structureId ? [node.extras.structureId] : []) ?? [];
    });
    expect(redistributedNames.length).toBeGreaterThan(3_500);
    expect(redistributedNames.filter((name) => name === "????????")).toHaveLength(1);
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
