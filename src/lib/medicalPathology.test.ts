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
});
