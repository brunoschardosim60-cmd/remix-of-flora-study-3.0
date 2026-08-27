import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { medicalPathologies } from "./medicalPathology";

describe("medicalPathologies", () => {
  it("mantém um núcleo comparativo completo e sem ids repetidos", () => {
    expect(medicalPathologies).toHaveLength(5);
    expect(new Set(medicalPathologies.map((item) => item.id)).size).toBe(medicalPathologies.length);
    for (const item of medicalPathologies) {
      expect(item.stages.length).toBeGreaterThanOrEqual(3);
      expect(item.hotspots.length).toBeGreaterThanOrEqual(3);
      expect(item.question.options[item.question.answer]).toBeTruthy();
      expect(item.source.url.startsWith("https://")).toBe(true);
      expect(item.visuals.length).toBeGreaterThanOrEqual(2);
      expect(new Set(item.visuals.map((visual) => visual.id)).size).toBe(item.visuals.length);
      for (const visual of item.visuals) {
        expect(visual.imageAlt.length).toBeGreaterThan(24);
        expect(visual.caption.length).toBeGreaterThan(30);
        expect(visual.source.url.startsWith("https://")).toBe(true);
        expect(visual.source.license).toBeTruthy();
      }
    }
  });

  it("inclui pranchas PNG com canal alfa real no pacote público", () => {
    for (const item of medicalPathologies) {
      const file = resolve(process.cwd(), "public", item.image.replace(/^\//, ""));
      expect(existsSync(file)).toBe(true);
      const png = readFileSync(file);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png[25]).toBe(6);
    }
  });

  it("inclui uma imagem clínica real e licenciada para cada condição", () => {
    for (const item of medicalPathologies) {
      const clinical = item.visuals.filter((visual) => visual.kind !== "comparison");
      expect(clinical.length).toBeGreaterThanOrEqual(1);
      for (const visual of clinical) {
        const file = resolve(process.cwd(), "public", visual.image.replace(/^\//, ""));
        expect(existsSync(file)).toBe(true);
        expect(readFileSync(file).byteLength).toBeGreaterThan(100_000);
        expect(visual.source.license).toMatch(/CC/);
      }
    }
  });
});
