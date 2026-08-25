import { describe, expect, it } from "vitest";
import { medicalSources } from "./medicineData";
import { semiologyModules, semiologySourceIds, semiologyTechniques, semiologyTerms, semiologyVitalChecks } from "./semiologyCurriculum";

describe("beginner semiology curriculum", () => {
  it("offers a complete progressive path with unique identifiers", () => {
    expect(semiologyModules).toHaveLength(12);
    expect(new Set(semiologyModules.map((module) => module.id)).size).toBe(semiologyModules.length);
    expect(semiologyModules.map((module) => module.number)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(new Set(semiologyModules.map((module) => module.phase))).toEqual(new Set(["Fundamentos", "Coleta clínica", "Integração", "Prática segura"]));
  });

  it("covers every requested beginner learning block", () => {
    const curriculumText = semiologyModules.map((module) => `${module.title} ${module.subtitle} ${module.concepts.map((concept) => `${concept.title} ${concept.text}`).join(" ")}`).join(" ").toLocaleLowerCase("pt-BR");
    for (const topic of [
      "semiologia", "anamnese", "exame físico geral", "sinais vitais", "cardiovascular", "respiratório",
      "abdominal", "neurológico", "cabeça e pescoço", "musculoesquelético", "inspeção", "palpação",
      "percussão", "ausculta", "terminologia", "raciocínio clínico", "soap", "comunicação", "ética",
      "biossegurança", "caso clínico",
    ]) expect(curriculumText, topic).toContain(topic);
  });

  it("keeps every module answerable and educational", () => {
    for (const module of semiologyModules) {
      expect(module.goals.length, `${module.id} goals`).toBeGreaterThanOrEqual(3);
      expect(module.concepts.length, `${module.id} concepts`).toBeGreaterThanOrEqual(4);
      expect(module.question.options.length, `${module.id} options`).toBe(4);
      expect(module.question.answer, `${module.id} answer`).toBeGreaterThanOrEqual(0);
      expect(module.question.answer, `${module.id} answer`).toBeLessThan(module.question.options.length);
      expect(module.question.explanation.length, `${module.id} explanation`).toBeGreaterThan(60);
      expect(module.warning.length, `${module.id} safety warning`).toBeGreaterThan(40);
    }
  });

  it("keeps every curriculum source traceable", () => {
    expect(semiologySourceIds.length).toBeGreaterThanOrEqual(8);
    for (const sourceId of semiologySourceIds) {
      expect(medicalSources[sourceId], sourceId).toBeDefined();
      expect(medicalSources[sourceId].url).toMatch(/^https:\/\//);
      expect(medicalSources[sourceId].reviewedAt).toMatch(/^2026-08-(24|25)$/);
    }
  });

  it("provides active-study material for examination, vital signs and terminology", () => {
    expect(semiologyTechniques.map((technique) => technique.id)).toEqual(["inspection", "palpation", "percussion", "auscultation"]);
    expect(semiologyVitalChecks.map((check) => check.id)).toEqual(["bp", "pulse", "respiration", "temperature", "spo2", "pain"]);
    expect(semiologyTerms.length).toBeGreaterThanOrEqual(20);
    expect(new Set(semiologyTerms.map(([term]) => term)).size).toBe(semiologyTerms.length);
  });
});
