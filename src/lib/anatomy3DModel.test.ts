import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { anatomy3DRegions, anatomy3DStructures, anatomy3DSystemMeta, organ3DStructureForAtlasId, structuresFor3D } from "./anatomy3DModel";
import { bodyLayers, medicalSources } from "./medicineData";

describe("anatomy3DModel", () => {
  it("mantém estruturas tridimensionais únicas, referenciadas e renderizáveis", () => {
    expect(anatomy3DStructures.length).toBeGreaterThanOrEqual(40);
    expect(new Set(anatomy3DStructures.map((item) => item.id)).size).toBe(anatomy3DStructures.length);

    for (const structure of anatomy3DStructures) {
      expect(structure.name.length).toBeGreaterThan(2);
      expect(structure.summary.length).toBeGreaterThan(30);
      expect(structure.function.length).toBeGreaterThan(25);
      expect(structure.parts.length).toBeGreaterThan(0);
      expect(structure.focus).toHaveLength(3);
      expect(structure.focusDistance).toBeGreaterThan(1);
      expect(medicalSources[structure.sourceId], `fonte de ${structure.id}`).toBeDefined();
    }
  });

  it("cobre todas as camadas e regiões necessárias para isolamento", () => {
    for (const layer of bodyLayers) {
      expect(anatomy3DStructures.filter((item) => item.layer === layer.id).length, layer.label).toBeGreaterThanOrEqual(6);
    }
    for (const region of anatomy3DRegions.filter((item) => item.id !== "whole")) {
      expect(structuresFor3D("all", region.id).length, region.label).toBeGreaterThanOrEqual(3);
    }
    expect(anatomy3DSystemMeta.map((item) => item.id)).toEqual(["all", ...bodyLayers.map((item) => item.id)]);
  });

  it("oferece cérebro, órgãos, músculos, nervos e ossos como seleções 3D", () => {
    expect(structuresFor3D("nervous", "head").some((item) => item.id === "nerve-brain")).toBe(true);
    expect(structuresFor3D("organs", "whole").some((item) => item.id === "organ-heart")).toBe(true);
    expect(structuresFor3D("muscular", "whole").length).toBeGreaterThanOrEqual(8);
    expect(structuresFor3D("skeletal", "whole").length).toBeGreaterThanOrEqual(8);
    expect(structuresFor3D("vascular", "whole").length).toBeGreaterThanOrEqual(7);
  });

  it("mantém as malhas anatômicas licenciadas disponíveis no pacote público", () => {
    const assets = [
      ["zanatomy-musculoskeletal-v1.glb", 8_000_000],
      ["bodyparts3d-organs-v1.glb", 300_000],
      ["bodyparts3d-skin-v1.glb", 170_000],
    ] as const;

    for (const [filename, minimumBytes] of assets) {
      const asset = resolve(process.cwd(), "public", "medicine", "models", filename);
      expect(statSync(asset).size, filename).toBeGreaterThan(minimumBytes);
    }
    expect(medicalSources.zAnatomy3D?.url).toContain("body-anatomy-3d-viewer");
    expect(medicalSources.bodyParts3D?.url).toContain("bodyparts3d");
  });

  it("abre no estúdio somente órgãos cobertos pelas malhas tridimensionais", () => {
    expect(organ3DStructureForAtlasId("heart")).toBe("organ-heart");
    expect(organ3DStructureForAtlasId("brain")).toBe("organ-brain");
    expect(organ3DStructureForAtlasId("jejunum")).toBe("organ-intestines");
    expect(organ3DStructureForAtlasId("pancreas")).toBeNull();
  });
});
