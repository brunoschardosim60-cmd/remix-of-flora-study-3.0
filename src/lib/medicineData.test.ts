import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  anatomyStructures,
  bodyLayers,
  embryologyTimeline,
  medicalQuestions,
  medicalSources,
  medicalSystems,
  type MedicineLevel,
} from "./medicineData";

describe("medicine content integrity", () => {
  const publicAssetExists = (asset: string) => existsSync(resolve(process.cwd(), "public", asset.replace(/^\//, "")));

  it("keeps every content reference traceable", () => {
    for (const structure of anatomyStructures) {
      expect(medicalSources[structure.sourceId], `source for ${structure.id}`).toBeDefined();
      expect(structure.synonyms.length).toBeGreaterThan(0);
    }

    for (const question of medicalQuestions) {
      expect(medicalSources[question.sourceId], `source for ${question.id}`).toBeDefined();
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.explanation.length).toBeGreaterThan(20);
    }

    for (const stage of embryologyTimeline) {
      expect(medicalSources[stage.sourceId], `source for ${stage.period}`).toBeDefined();
    }
  });

  it("uses secure source links and explicit review dates", () => {
    for (const source of Object.values(medicalSources)) {
      expect(source.url.startsWith("https://")).toBe(true);
      expect(source.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("covers every declared learning level", () => {
    const levels: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];
    for (const level of levels) {
      expect(medicalQuestions.some((question) => question.level === level), level).toBe(true);
    }
  });

  it("keeps identifiers unique and atlas layers represented", () => {
    expect(new Set(medicalQuestions.map((question) => question.id)).size).toBe(medicalQuestions.length);
    expect(new Set(anatomyStructures.map((structure) => structure.id)).size).toBe(anatomyStructures.length);
    expect(new Set(medicalSystems.map((system) => system.id)).size).toBe(medicalSystems.length);

    for (const layer of bodyLayers) {
      expect(anatomyStructures.some((structure) => structure.layer === layer.id), layer.label).toBe(true);
    }
  });

  it("keeps every medical illustration available in the public bundle", () => {
    expect(publicAssetExists("/medicine/medicine-hero-v2.png")).toBe(true);

    for (const system of medicalSystems) {
      expect(publicAssetExists(system.image), system.image).toBe(true);
    }

    for (const stage of embryologyTimeline) {
      expect(publicAssetExists(stage.image), stage.image).toBe(true);
    }

    for (const layer of bodyLayers) {
      expect(publicAssetExists(`/medicine/atlas/${layer.id}-anterior-v2.png`)).toBe(true);
      expect(publicAssetExists(`/medicine/atlas/${layer.id}-posterior-v2.png`)).toBe(true);
    }
  });
});
