import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { histology3DModels, histology3DModelsFor } from "./histology3DModels";

function glbMeshNames(path: string) {
  const buffer = readFileSync(`public${path}`);
  let offset = 12;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    offset += 8;
    if (type === "JSON") {
      const json = JSON.parse(buffer.toString("utf8", offset, offset + length).replace(/\0+$/, "")) as { meshes?: Array<{ name?: string }> };
      return (json.meshes ?? []).map((mesh) => mesh.name).filter(Boolean) as string[];
    }
    offset += length;
  }
  return [];
}

describe("histology3DModels", () => {
  it("mantém identificadores únicos e metadados completos", () => {
    expect(new Set(histology3DModels.map((item) => item.id)).size).toBe(histology3DModels.length);
    histology3DModels.forEach((item) => {
      expect(item.name.length).toBeGreaterThan(2);
      expect(item.description.length).toBeGreaterThan(20);
      expect(item.path.endsWith(".glb")).toBe(true);
      expect(item.sourceId).toBe("zanatomy-models");
    });
  });

  it("oferece mais de um modelo nas jornadas anatômicas", () => {
    expect(histology3DModelsFor("eye").length).toBeGreaterThanOrEqual(2);
    expect(histology3DModelsFor("oral").length).toBeGreaterThanOrEqual(4);
    expect(histology3DModelsFor("cell").length).toBeGreaterThanOrEqual(8);
  });

  it("usa filtros explícitos nos modelos compostos", () => {
    histology3DModels.filter((item) => item.path.includes("organs-v1") || item.path.includes("musculoskeletal-v1")).forEach((item) => {
      expect(item.includeNames?.length).toBeGreaterThan(0);
    });
  });

  it("aponta cada filtro para uma malha que realmente existe no GLB licenciado", () => {
    histology3DModels.forEach((item) => {
      const meshNames = glbMeshNames(item.path);
      expect(meshNames.length).toBeGreaterThan(0);
      item.includeNames?.forEach((name) => {
        expect(meshNames.some((meshName) => meshName === name || meshName.startsWith(`${name}.`)), `${item.id}: ${name}`).toBe(true);
      });
    });
  });
});
