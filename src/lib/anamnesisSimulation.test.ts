import { describe, expect, it } from "vitest";
import { anamnesisCases, anamnesisSources, decisionValueScore, questionValueScore } from "./anamnesisSimulation";

describe("anamnesis simulation", () => {
  it("provides complete, unique and answerable fictional cases", () => {
    expect(anamnesisCases).toHaveLength(4);
    expect(new Set(anamnesisCases.map((item) => item.id)).size).toBe(anamnesisCases.length);

    for (const clinicalCase of anamnesisCases) {
      expect(clinicalCase.questions.length, `${clinicalCase.id} questions`).toBeGreaterThanOrEqual(10);
      expect(new Set(clinicalCase.questions.map((question) => question.id)).size, `${clinicalCase.id} unique questions`).toBe(clinicalCase.questions.length);
      expect(clinicalCase.questions.filter((question) => question.value === "critical").length, `${clinicalCase.id} critical questions`).toBeGreaterThanOrEqual(3);
      expect(clinicalCase.questions.filter((question) => question.value === "poor").length, `${clinicalCase.id} poor questions`).toBeGreaterThanOrEqual(2);
      expect(new Set(clinicalCase.decisions.map((decision) => decision.value)).size, `${clinicalCase.id} decision values`).toBe(3);
      expect(clinicalCase.keyFindings.length, `${clinicalCase.id} findings`).toBeGreaterThanOrEqual(5);
      expect(clinicalCase.differentials.length, `${clinicalCase.id} differentials`).toBeGreaterThanOrEqual(5);
      expect(clinicalCase.patientFacts.length, `${clinicalCase.id} patient facts`).toBeGreaterThanOrEqual(5);
      expect(new Set(clinicalCase.patientFacts.map((fact) => fact.id)).size, `${clinicalCase.id} unique patient facts`).toBe(clinicalCase.patientFacts.length);
      expect(["neutral", "pain", "distressed", "unconscious", "stabilized"]).toContain(clinicalCase.initialState);

      for (const fact of clinicalCase.patientFacts) {
        expect(fact.questionExamples.length, fact.id).toBeGreaterThanOrEqual(2);
        expect(fact.answer.length, fact.id).toBeGreaterThan(10);
      }

      for (const question of clinicalCase.questions) {
        expect(question.text.length, question.id).toBeGreaterThan(20);
        expect(question.answer.length, question.id).toBeGreaterThan(20);
        expect(question.feedback.length, question.id).toBeGreaterThan(30);
      }
    }
  });

  it("validates deterministic crisis triggers and safe responses", () => {
    expect(anamnesisCases.filter((item) => item.crisisTrigger)).toHaveLength(4);
    for (const clinicalCase of anamnesisCases) {
      const trigger = clinicalCase.crisisTrigger!;
      expect(trigger.afterTurns).toBeGreaterThanOrEqual(3);
      expect(trigger.narrative.length).toBeGreaterThan(30);
      expect(trigger.patientResponse.length).toBeGreaterThan(15);
      const questionIds = new Set(clinicalCase.questions.map((item) => item.id));
      const decisionIds = new Set(clinicalCase.decisions.map((item) => item.id));
      expect(trigger.requiredQuestionIds.every((id) => questionIds.has(id))).toBe(true);
      expect(trigger.safeDecisionIds.every((id) => decisionIds.has(id))).toBe(true);
      expect(trigger.safeDecisionIds.every((id) => clinicalCase.decisions.find((item) => item.id === id)?.value !== "unsafe")).toBe(true);
      if (trigger.crisisVitals) {
        expect(trigger.crisisVitals.heartRate).toBeGreaterThan(0);
        expect(trigger.crisisVitals.oxygenSaturation).toBeGreaterThan(0);
        expect(trigger.crisisVitals.oxygenSaturation).toBeLessThanOrEqual(100);
      }
    }
  });

  it("keeps sensitive cases explicitly marked and uses fictitious aliases", () => {
    expect(anamnesisCases.filter((item) => item.sensitive).length).toBeGreaterThanOrEqual(2);
    for (const clinicalCase of anamnesisCases) {
      expect(clinicalCase.patient.alias).toMatch(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+\s[A-Z]\.$/u);
      if (clinicalCase.sensitive) expect(clinicalCase.sensitiveWarnings?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("links every case to known sources and preserves scoring order", () => {
    const sourceIds = new Set<string>(anamnesisSources.map((source) => source.id));
    for (const clinicalCase of anamnesisCases) {
      expect(clinicalCase.sourceIds.length).toBeGreaterThanOrEqual(2);
      for (const sourceId of clinicalCase.sourceIds) expect(sourceIds.has(sourceId), `${clinicalCase.id}:${sourceId}`).toBe(true);
    }
    expect(questionValueScore.critical).toBeGreaterThan(questionValueScore.high);
    expect(questionValueScore.high).toBeGreaterThan(questionValueScore.useful);
    expect(questionValueScore.poor).toBeLessThan(0);
    expect(decisionValueScore.best).toBeGreaterThan(decisionValueScore.reasonable);
    expect(decisionValueScore.reasonable).toBeGreaterThan(decisionValueScore.unsafe);
  });
});
