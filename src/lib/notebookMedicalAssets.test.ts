import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { notebookMedicalAssets } from "./notebookMedicalAssets";

describe("notebookMedicalAssets", () => {
  it("oferece atlas, sistemas e desenvolvimento sem ids repetidos", () => {
    expect(notebookMedicalAssets.length).toBeGreaterThanOrEqual(28);
    expect(new Set(notebookMedicalAssets.map((asset) => asset.id)).size).toBe(notebookMedicalAssets.length);
    expect(new Set(notebookMedicalAssets.map((asset) => asset.category))).toEqual(new Set(["Camadas", "Sistemas", "Desenvolvimento"]));
  });

  it("mantém todas as imagens disponíveis no pacote público", () => {
    for (const asset of notebookMedicalAssets) {
      expect(asset.label.length).toBeGreaterThan(4);
      expect(asset.description.length).toBeGreaterThan(20);
      expect(existsSync(resolve(process.cwd(), "public", asset.src.replace(/^\//, "")))).toBe(true);
    }
  });
});

