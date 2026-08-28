import { describe, expect, it } from "vitest";
import {
  createIntegratedMedicineContext,
  integratedJourneyForContext,
  integratedMedicineJourneys,
  integratedStepForContext,
  nextIntegratedStepForContext,
  resolveIntegratedJourneyStructure,
} from "./medicineIntegratedJourney";
import { anamnesisCases } from "./anamnesisSimulation";
import { medicalPathologies } from "./medicalPathology";
import { medicalClinicalCases, medicalQuestions, medicalSources, medicalSystems } from "./medicineData";
import { semiologyModules } from "./semiologyCurriculum";

describe("integratedMedicineJourneys", () => {
  it("mantém cada etapa citável, tipada e ligada a conteúdo existente", () => {
    for (const journey of integratedMedicineJourneys) {
      expect(journey.organId).toBeTruthy();
      expect(journey.structures.length).toBeGreaterThan(0);
      expect(journey.steps.length).toBeGreaterThanOrEqual(6);

      for (const step of journey.steps) {
        expect(step.label).toBeTruthy();
        expect(step.description).toBeTruthy();
        step.sourceIds.forEach((sourceId) => expect(medicalSources[sourceId], `${step.id}: ${sourceId}`).toBeTruthy());
        if (step.kind === "action") {
          expect(step.action).toBe("open-interior");
          continue;
        }
        if (step.destination === "systems") expect(medicalSystems.some((item) => item.id === step.target.systemId)).toBe(true);
        if (step.destination === "pathology") expect(medicalPathologies.some((item) => item.id === step.target.pathologyId)).toBe(true);
        if (step.destination === "semiology") expect(semiologyModules.some((item) => item.id === step.target.moduleId)).toBe(true);
        if (step.destination === "anamnesis") expect(anamnesisCases.some((item) => item.id === step.target.caseId)).toBe(true);
        if (step.destination === "clinic") expect(medicalClinicalCases.some((item) => item.id === step.target.caseId)).toBe(true);
        if (step.destination === "questions") expect(medicalQuestions.some((item) => item.system === step.target.system)).toBe(true);
      }
    }
  });

  it.each([
    ["organ-heart", "Coração", "heart"],
    ["model:heart:left-atrium", "Left atrium", "left-atrium"],
    ["model:heart:right-atrium", "Átrio direito", "right-atrium"],
    ["model:heart:left-ventricle", "Ventrículo esquerdo", "left-ventricle"],
    ["model:heart:right-ventricle", "Right ventricle", "right-ventricle"],
    ["model:heart:mitral-valve", "Valva mitral", "mitral-valve"],
    ["model:heart:tricuspid-valve", "Tricuspid valve", "tricuspid-valve"],
    ["model:heart:aortic-valve", "Valva aórtica", "aortic-valve"],
    ["model:heart:pulmonary-valve", "Valva pulmonar", "pulmonary-valve"],
  ])("resolve %s como estrutura cardiovascular específica", (id, name, expected) => {
    const resolved = resolveIntegratedJourneyStructure({ id, name });
    expect(resolved?.journey.organId).toBe("heart");
    expect(resolved?.structure.id).toBe(expected);
  });

  it("não ativa a jornada para estruturas alheias", () => {
    expect(resolveIntegratedJourneyStructure({ id: "organ-kidney", name: "Rim" })).toBeUndefined();
    expect(resolveIntegratedJourneyStructure({ id: "bone-atlas", name: "Atlas C1" })).toBeUndefined();
  });

  it("preserva a estrutura 3D específica e resolve etapa atual e seguinte", () => {
    const context = createIntegratedMedicineContext(
      { id: "model:heart:aortic-valve", name: "Valva aórtica" },
      "heart-semiology",
    );

    expect(context).toEqual(expect.objectContaining({
      organId: "heart",
      activeStepId: "heart-semiology",
      structure: expect.objectContaining({
        id: "aortic-valve",
        source3DId: "model:heart:aortic-valve",
      }),
    }));
    expect(integratedJourneyForContext(context)?.id).toBe("heart-clinical-path");
    expect(integratedStepForContext(context)?.id).toBe("heart-semiology");
    expect(nextIntegratedStepForContext(context)?.id).toBe("heart-anamnesis");
  });

  it("recusa uma etapa que não pertence à estrutura resolvida", () => {
    expect(createIntegratedMedicineContext({ id: "organ-kidney", name: "Rim" }, "heart-review")).toBeUndefined();
  });
});
