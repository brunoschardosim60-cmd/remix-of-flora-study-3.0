import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { basicTissues, cellOrganelles, histologySources, histologySpecimens, realCellFeatures, realCellImage } from "./histologyData";

const publicAsset = (path: string) => resolve(process.cwd(), "public", path.replace(/^\//, ""));

describe("histologyData", () => {
  it("mantém espécimes únicos, descritos, citados e com assets reais", () => {
    expect(new Set(histologySpecimens.map((item) => item.id)).size).toBe(histologySpecimens.length);
    for (const specimen of histologySpecimens) {
      expect(specimen.name.length).toBeGreaterThan(3);
      expect(specimen.summary.length).toBeGreaterThan(35);
      expect(specimen.function.length).toBeGreaterThan(35);
      expect(histologySources[specimen.sourceId]).toBeDefined();
      expect(specimen.levels.length).toBeGreaterThan(0);
      for (const level of specimen.levels) {
        expect(histologySources[level.sourceId], `${specimen.id}:${level.objective}`).toBeDefined();
        expect(level.note.length).toBeGreaterThan(25);
        expect(statSync(publicAsset(level.image)).size, level.image).toBeGreaterThan(50_000);
        for (const hotspot of level.hotspots) {
          expect(hotspot.name.length).toBeGreaterThan(3);
          expect(hotspot.summary.length).toBeGreaterThan(20);
          expect(hotspot.function.length).toBeGreaterThan(20);
          expect(histologySources[hotspot.sourceId]).toBeDefined();
          expect(hotspot.x).toBeGreaterThanOrEqual(0);
          expect(hotspot.x).toBeLessThanOrEqual(100);
          expect(hotspot.y).toBeGreaterThanOrEqual(0);
          expect(hotspot.y).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("oferece quatro níveis distintos para a retina sem fabricar um falso 100x", () => {
    const retina = histologySpecimens.find((item) => item.id === "retina")!;
    expect(retina.levels.map((item) => item.objective)).toEqual(["4x", "10x", "40x", "100x"]);
    expect(new Set(retina.levels.map((item) => item.image)).size).toBe(4);
    expect(retina.levels.slice(0, 3).every((item) => item.assetKind === "micrograph")).toBe(true);
    expect(retina.levels[3].assetKind).toBe("schematic");
    expect(retina.levels[3].note.toLocaleLowerCase("pt-BR")).toContain("não é uma micrografia");
  });

  it("cobre organelas e os quatro tecidos básicos", () => {
    expect(cellOrganelles.map((item) => item.id)).toEqual(expect.arrayContaining([
      "nucleus", "mitochondrion", "rough-er", "smooth-er", "golgi", "plasma-membrane", "cytoplasm",
    ]));
    expect(basicTissues.map((item) => item.id)).toEqual(["epithelial", "connective", "muscular", "nervous"]);
    expect(histologySpecimens.filter((item) => item.category === "tecido básico").map((item) => item.id)).toEqual(expect.arrayContaining(["epithelial", "connective", "muscular", "nervous-tissue"]));
    expect(histologySpecimens.filter((item) => item.category === "oral").map((item) => item.id)).toEqual(expect.arrayContaining(["salivary-gland", "tooth", "tongue-papillae"]));
    for (const item of [...cellOrganelles, ...basicTissues]) {
      expect(histologySources[item.sourceId]).toBeDefined();
      expect(item.summary.length).toBeGreaterThan(25);
      expect(item.function.length).toBeGreaterThan(25);
    }
    expect(realCellFeatures.map((item) => item.id)).toEqual(expect.arrayContaining(["hela-nucleus", "hela-golgi", "hela-microtubules"]));
    expect(statSync(publicAsset(realCellImage)).size).toBeGreaterThan(2_000_000);
  });

  it("mantém fontes licenciadas, seguras e atribuídas", () => {
    for (const source of Object.values(histologySources)) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.license).toMatch(/CC BY|Domínio público/);
      expect(source.attribution.length).toBeGreaterThan(8);
    }
  });
});
