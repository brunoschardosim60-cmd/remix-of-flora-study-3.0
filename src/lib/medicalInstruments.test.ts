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

  it("keeps the reviewed high-definition instrument renders unique and addressable", () => {
    const rendered = medicalInstruments.filter((instrument) => instrument.image);
    expect(rendered).toHaveLength(12);
    expect(new Set(rendered.map((instrument) => instrument.image)).size).toBe(rendered.length);

    for (const instrument of rendered) {
      expect(instrument.image, instrument.id).toMatch(/^\/medicine\/instruments\/[a-z0-9-]+-v\d+\.png$/);
    }
  });
});
