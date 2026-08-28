import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { anatomy3DRegions, anatomy3DStructures, anatomy3DSystemMeta, detailedStructureForGuided, detailedStructuresFor3DSystem, mergeGuidedAndDetailedStructures, organ3DStructureForAtlasId, proceduralStructuresFor3D, raw3DNameMatchesBodyProfile, structureMatchesBodyProfile, structuresFor3D } from "./anatomy3DModel";
import { bodyLayers, medicalSources } from "./medicineData";

describe("anatomy3DModel", () => {
  it("mantém estruturas tridimensionais únicas, referenciadas e renderizáveis", () => {
    expect(anatomy3DStructures.length).toBeGreaterThanOrEqual(53);
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
    expect(structuresFor3D("organs", "whole").map((item) => item.id)).toEqual(expect.arrayContaining([
      "organ-eyes", "organ-inner-ear", "organ-thyroid", "organ-pancreas",
      "organ-uterus", "organ-ovaries", "organ-prostate", "organ-testes",
    ]));
    expect(structuresFor3D("muscular", "whole").length).toBeGreaterThanOrEqual(8);
    expect(structuresFor3D("skeletal", "whole").length).toBeGreaterThanOrEqual(8);
    expect(structuresFor3D("vascular", "whole").length).toBeGreaterThanOrEqual(7);
  });

  it("mantém perfis reprodutivos coerentes e o masculino como opção segura padrão", () => {
    const organs = structuresFor3D("organs", "whole");
    const male = organs.filter((item) => structureMatchesBodyProfile(item, "male")).map((item) => item.id);
    const female = organs.filter((item) => structureMatchesBodyProfile(item, "female")).map((item) => item.id);

    expect(male).toEqual(expect.arrayContaining(["organ-prostate", "organ-testes", "organ-heart"]));
    expect(male).not.toEqual(expect.arrayContaining(["organ-uterus", "organ-ovaries"]));
    expect(female).toEqual(expect.arrayContaining(["organ-uterus", "organ-ovaries", "organ-heart"]));
    expect(female).not.toEqual(expect.arrayContaining(["organ-prostate", "organ-testes"]));
    expect(raw3DNameMatchesBodyProfile("Uterus", "male")).toBe(false);
    expect(raw3DNameMatchesBodyProfile("Prostate gland", "female")).toBe(false);
    expect(raw3DNameMatchesBodyProfile("Heart", "male")).toBe(true);
    expect(raw3DNameMatchesBodyProfile("Heart", "female")).toBe(true);
  });

  it("não sobrepõe substitutos procedurais ao cérebro e aos órgãos reais", () => {
    const combined = proceduralStructuresFor3D("all", "whole", "organ-heart").map((item) => item.id);
    expect(combined).not.toEqual(expect.arrayContaining(["nerve-brain", "nerve-cerebellum", "nerve-brainstem", "organ-eyes", "organ-inner-ear"]));
    expect(combined).not.toEqual(expect.arrayContaining(["nerve-spinal-cord", "vessel-aorta"]));
    expect(proceduralStructuresFor3D("all", "whole", "organ-eyes")).toHaveLength(0);

    expect(proceduralStructuresFor3D("organs", "whole", "organ-brain")).toHaveLength(0);
    expect(proceduralStructuresFor3D("organs", "head", "organ-eyes").map((item) => item.id)).toEqual(["organ-eyes"]);
    expect(proceduralStructuresFor3D("nervous", "head", "nerve-brain").map((item) => item.id)).not.toContain("nerve-brain");
  });

  it("mantém as malhas anatômicas licenciadas disponíveis no pacote público", () => {
    const assets = [
      ["zanatomy-musculoskeletal-v1.glb", 8_000_000],
      ["zanatomy-circulatory-v1.glb", 7_800_000],
      ["zanatomy-nervous-v1.glb", 8_000_000],
      ["zanatomy-organs-v1.glb", 4_700_000],
      ["zanatomy-organ-heart-v1.glb", 1_600_000],
      ["zanatomy-organ-brain-v1.glb", 1_300_000],
      ["zanatomy-organ-spleen-v1.glb", 90_000],
      ["zanatomy-organ-eye-v1.glb", 125_000],
      ["bodyparts3d-organs-v1.glb", 300_000],
      ["bodyparts3d-skin-v1.glb", 170_000],
    ] as const;

    for (const [filename, minimumBytes] of assets) {
      const asset = resolve(process.cwd(), "public", "medicine", "models", filename);
      expect(statSync(asset).size, filename).toBeGreaterThan(minimumBytes);
    }
    expect(medicalSources.zAnatomy3D?.url).toContain("body-anatomy-3d-viewer");
    expect(medicalSources.zAnatomySystems3D?.url).toContain("anatomi-simulatoru");
    expect(medicalSources.zAnatomyOrgan3D?.url).toContain("anatomy-atlas");
    expect(medicalSources.bodyParts3D?.url).toContain("bodyparts3d");
  });

  it("abre no estúdio somente órgãos cobertos pelas malhas tridimensionais", () => {
    expect(organ3DStructureForAtlasId("heart")).toBe("organ-heart");
    expect(organ3DStructureForAtlasId("brain")).toBe("organ-brain");
    expect(organ3DStructureForAtlasId("jejunum")).toBe("organ-intestines");
    expect(organ3DStructureForAtlasId("pancreas")).toBe("organ-pancreas");
    expect(organ3DStructureForAtlasId("uterus")).toBe("organ-uterus");
    expect(organ3DStructureForAtlasId("cochlea")).toBe("organ-inner-ear");
  });

  it("preserva estruturas guiadas ao incorporar o catálogo detalhado", () => {
    const guided = structuresFor3D("organs", "whole");
    const heart = guided.find((item) => item.id === "organ-heart")!;
    const detailedHeart = { ...heart, id: "model:organs:12", name: "Coração" };
    const detailedStructure = { ...heart, id: "model:organs:13", name: "Seio coronário" };
    const merged = mergeGuidedAndDetailedStructures(guided, [detailedHeart, detailedStructure]);

    expect(merged[0]).toBe(guided[0]);
    expect(merged.filter((item) => item.name === "Coração")).toHaveLength(1);
    expect(merged.filter((item) => item.name === "Valva mitral")).toHaveLength(1);
    expect(merged).toContainEqual(detailedStructure);
  });

  it("compõe os catálogos detalhados em Todas as camadas", () => {
    const template = anatomy3DStructures.find((item) => item.id === "organ-heart")!;
    const vascular = { ...template, id: "model:vascular:2", layer: "vascular" as const, name: "Aorta" };
    const nervous = { ...template, id: "model:nervous:4", layer: "nervous" as const, name: "Medula espinal" };
    const organ = { ...template, id: "model:organs:8", name: "Coração" };
    const catalogs = { vascular: [vascular], nervous: [nervous], organs: [organ] };

    expect(detailedStructuresFor3DSystem("all", catalogs).map((item) => item.id)).toEqual([
      vascular.id, nervous.id, organ.id,
    ]);
    expect(detailedStructuresFor3DSystem("vascular", catalogs)).toEqual([vascular]);
  });

  it("liga a seleção guiada à malha detalhada sem perder o conteúdo revisado", () => {
    const guidedHeart = anatomy3DStructures.find((item) => item.id === "organ-heart")!;
    const detailedHeart = { ...guidedHeart, id: "model:organs:12", name: "Coração", focus: [1, 2, 3] as [number, number, number] };
    const resolved = detailedStructureForGuided(guidedHeart, { organs: [detailedHeart] });

    expect(resolved.id).toBe(detailedHeart.id);
    expect(resolved.focus).toEqual(detailedHeart.focus);
    expect(resolved.summary).toBe(guidedHeart.summary);
  });
});
