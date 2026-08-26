import { describe, expect, it } from "vitest";
import {
  emptyMedicineLearningState,
  mergeMedicineLearningStates,
  medicineCompetencyProgress,
  medicineOverallProgress,
  pendingMedicineReviews,
  registerMedicineAttempt,
} from "./medicineLearning";

describe("medicineLearning", () => {
  it("transforma um erro em revisão e o remove após acerto", () => {
    const wrong = registerMedicineAttempt(emptyMedicineLearningState, { id: "structure:heart", label: "Coração", category: "anatomia", competency: "anatomia", sourceSection: "practice", correct: false, attemptedAt: "2026-01-01T00:00:00.000Z" });
    expect(pendingMedicineReviews(wrong)).toHaveLength(1);
    const corrected = registerMedicineAttempt(wrong, { id: "structure:heart", label: "Coração", category: "anatomia", competency: "anatomia", sourceSection: "practice", correct: true, attemptedAt: "2026-01-02T00:00:00.000Z" });
    expect(pendingMedicineReviews(corrected)).toHaveLength(0);
    expect(corrected.items["structure:heart"].attempts).toBe(2);
  });

  it("calcula domínio por competência e domínio longitudinal", () => {
    let state = registerMedicineAttempt(emptyMedicineLearningState, { id: "question:1", label: "Questão 1", category: "questoes", competency: "fisiologia", sourceSection: "questions", correct: true });
    state = registerMedicineAttempt(state, { id: "instrument:1", label: "Instrumento", category: "instrumentos", competency: "instrumentos", sourceSection: "instruments", correct: false });
    expect(medicineCompetencyProgress(state).find((item) => item.competency === "fisiologia")?.score).toBe(100);
    expect(medicineOverallProgress(state)).toBe(50);
  });

  it("mescla progresso local e remoto sem apagar atividades offline", () => {
    const local = registerMedicineAttempt(emptyMedicineLearningState, { id: "question:1", label: "Questão 1", category: "questoes", competency: "fisiologia", sourceSection: "questions", correct: false, attemptedAt: "2026-08-25T11:00:00.000Z" });
    const remote = registerMedicineAttempt(emptyMedicineLearningState, { id: "question:2", label: "Questão 2", category: "questoes", competency: "fisiologia", sourceSection: "questions", correct: true, attemptedAt: "2026-08-25T12:00:00.000Z" });
    const merged = mergeMedicineLearningStates(local, remote);
    expect(Object.keys(merged.items)).toHaveLength(2);
    expect(merged.items["question:1"].pending).toBe(true);
    expect(merged.items["question:2"].pending).toBe(false);
  });

  it("mantém histologia, desenvolvimento e patologia separados na revisão", () => {
    let state = registerMedicineAttempt(emptyMedicineLearningState, { id: "histology:retina", label: "Retina", category: "histologia", competency: "fisiologia", sourceSection: "histology", correct: false });
    state = registerMedicineAttempt(state, { id: "development:fetal", label: "Período fetal", category: "desenvolvimento", competency: "fisiologia", sourceSection: "development", correct: false });
    state = registerMedicineAttempt(state, { id: "pathology:lungs", label: "Pulmões · enfisema", category: "patologia", competency: "raciocinio-clinico", sourceSection: "pathology", correct: false });
    expect(pendingMedicineReviews(state).map((item) => item.category).sort()).toEqual(["desenvolvimento", "histologia", "patologia"]);
  });
});
