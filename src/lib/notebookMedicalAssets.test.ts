import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { notebookMedicalAssets, prepareMedicalNotebookHtml } from "./notebookMedicalAssets";

describe("notebookMedicalAssets", () => {
  it("oferece atlas, sistemas, patologia e desenvolvimento sem ids repetidos", () => {
    expect(notebookMedicalAssets.length).toBeGreaterThanOrEqual(33);
    expect(new Set(notebookMedicalAssets.map((asset) => asset.id)).size).toBe(notebookMedicalAssets.length);
    expect(new Set(notebookMedicalAssets.map((asset) => asset.category))).toEqual(new Set(["Camadas", "Sistemas", "Patologia", "Desenvolvimento"]));
  });

  it("mantém todas as imagens disponíveis no pacote público", () => {
    for (const asset of notebookMedicalAssets) {
      expect(asset.label.length).toBeGreaterThan(4);
      expect(asset.description.length).toBeGreaterThan(20);
      expect(existsSync(resolve(process.cwd(), "public", asset.src.replace(/^\//, "")))).toBe(true);
    }
  });

  it("identifica recortes transparentes e prepara imagens médicas dos templates", () => {
    expect(notebookMedicalAssets.filter((asset) => asset.category !== "Desenvolvimento").every((asset) => asset.transparent)).toBe(true);
    expect(notebookMedicalAssets.filter((asset) => asset.category === "Desenvolvimento").every((asset) => !asset.transparent)).toBe(true);
    const decorated = prepareMedicalNotebookHtml('<p>Antes</p><img src="/medicine/atlas/organs-anterior-v2.png" alt="Órgãos"><p>Depois</p>');
    expect(decorated).toContain('data-transparent="true"');
    expect(decorated).toContain('data-wrap="true"');
    expect(decorated).toContain('width="430"');
  });
});
