import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { medicalSources } from "./medicineData";
import { instrumentQuizOptions, medicalInstrumentCategories, medicalInstruments } from "./medicalInstruments";

describe("medical instruments catalog", () => {
  it("provides a broad, unique and source-backed catalog", () => {
    expect(medicalInstruments.length).toBeGreaterThanOrEqual(36);
    expect(new Set(medicalInstruments.map((item) => item.id)).size).toBe(medicalInstruments.length);

    for (const category of medicalInstrumentCategories) {
      expect(medicalInstruments.filter((item) => item.category === category.id).length, category.id).toBeGreaterThanOrEqual(7);
    }

    for (const instrument of medicalInstruments) {
      expect(instrument.name.length, instrument.id).toBeGreaterThan(3);
      expect(instrument.summary.length, `${instrument.id} summary`).toBeGreaterThan(30);
      expect(instrument.function.length, `${instrument.id} function`).toBeGreaterThan(70);
      expect(instrument.recognition.length, `${instrument.id} recognition`).toBeGreaterThanOrEqual(2);
      expect(instrument.safety.length, `${instrument.id} safety`).toBeGreaterThan(50);
      expect(medicalSources[instrument.sourceId], `${instrument.id} source`).toBeDefined();
    }
  });

  it("builds four unique quiz choices containing the correct instrument", () => {
    for (let index = 0; index < medicalInstruments.length * 2; index += 1) {
      const current = medicalInstruments[index % medicalInstruments.length];
      const options = instrumentQuizOptions(index);
      expect(options).toHaveLength(4);
      expect(new Set(options.map((item) => item.id)).size, `quiz ${index}`).toBe(4);
      expect(options.some((item) => item.id === current.id), `quiz ${index} correct option`).toBe(true);
    }
  });

  it("gives every instrument a unique high-definition render", () => {
    const rendered = medicalInstruments.filter((instrument) => instrument.image);
    expect(rendered).toHaveLength(medicalInstruments.length);
    expect(new Set(rendered.map((instrument) => instrument.image)).size).toBe(rendered.length);

    for (const instrument of rendered) {
      expect(instrument.image, instrument.id).toMatch(/^\/medicine\/instruments\/[a-z0-9-]+-v\d+\.png$/);
      expect(existsSync(resolve(process.cwd(), `public${instrument.image}`)), instrument.id).toBe(true);
    }
  });
});
