import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  anatomyPositionFor,
  anatomyStructures,
  bodyLayers,
  embryologyTimeline,
  medicineLevelProfiles,
  medicalClinicalCase,
  medicalClinicalCases,
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

  it("covers the complete development journey with study-ready content", () => {
    expect(embryologyTimeline.length).toBeGreaterThanOrEqual(9);
    expect(embryologyTimeline[0].phase).toBe("Pré-natal");
    expect(embryologyTimeline.at(-1)?.phase).toBe("Pós-natal");
    expect(new Set(embryologyTimeline.map((stage) => stage.id)).size).toBe(embryologyTimeline.length);

    for (const stage of embryologyTimeline) {
      expect(stage.detail.length, `${stage.id} detail`).toBeGreaterThan(90);
      expect(stage.milestones.length, `${stage.id} milestones`).toBeGreaterThanOrEqual(3);
      expect(stage.systems.length, `${stage.id} systems`).toBeGreaterThanOrEqual(3);
      expect(stage.studyQuestions.length, `${stage.id} questions`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the progressive clinical case concrete, answerable and completable", () => {
    expect(medicalClinicalCase.steps.length).toBeGreaterThanOrEqual(6);
    expect(new Set(medicalClinicalCase.steps.map((step) => step.id)).size).toBe(medicalClinicalCase.steps.length);
    expect(medicalClinicalCase.completion.takeaways.length).toBeGreaterThanOrEqual(4);

    for (const step of medicalClinicalCase.steps) {
      expect(step.release.length, `${step.id} released findings`).toBeGreaterThanOrEqual(4);
      expect(step.options.length, `${step.id} options`).toBe(4);
      expect(step.answer, `${step.id} answer`).toBeGreaterThanOrEqual(0);
      expect(step.answer, `${step.id} answer`).toBeLessThan(step.options.length);
      expect(step.explanation.length, `${step.id} explanation`).toBeGreaterThan(120);
      expect(step.reflectionPrompt.length, `${step.id} reflection`).toBeGreaterThan(70);
      expect(medicalSources[step.sourceId], `source for clinical step ${step.id}`).toBeDefined();
    }
  });

  it("offers a complete, source-backed clinical simulation library", () => {
    expect(medicalClinicalCases.length).toBeGreaterThanOrEqual(4);
    expect(new Set(medicalClinicalCases.map((item) => item.id)).size).toBe(medicalClinicalCases.length);
    expect(medicalClinicalCases.filter((item) => item.sensitive).length).toBeGreaterThanOrEqual(3);

    for (const clinicalCase of medicalClinicalCases) {
      expect(clinicalCase.patient.toLocaleLowerCase("pt-BR"), clinicalCase.id).toContain("fictício");
      expect(clinicalCase.triage.length, `${clinicalCase.id} triage`).toBeGreaterThanOrEqual(4);
      expect(clinicalCase.steps.length, `${clinicalCase.id} steps`).toBeGreaterThanOrEqual(6);
      expect(clinicalCase.completion.takeaways.length, `${clinicalCase.id} takeaways`).toBeGreaterThanOrEqual(4);

      if (clinicalCase.sensitive) {
        expect(clinicalCase.visual, `${clinicalCase.id} visual`).toBeDefined();
        expect(publicAssetExists(clinicalCase.visual!.image), clinicalCase.visual!.image).toBe(true);
        expect(clinicalCase.sensitivityNote?.length, `${clinicalCase.id} warning`).toBeGreaterThan(20);
      }

      for (const step of clinicalCase.steps) {
        expect(step.release.length, `${clinicalCase.id}/${step.id} findings`).toBeGreaterThanOrEqual(4);
        expect(step.options.length, `${clinicalCase.id}/${step.id} options`).toBe(4);
        expect(step.answer, `${clinicalCase.id}/${step.id} answer`).toBeGreaterThanOrEqual(0);
        expect(step.answer, `${clinicalCase.id}/${step.id} answer`).toBeLessThan(step.options.length);
        expect(step.explanation.length, `${clinicalCase.id}/${step.id} explanation`).toBeGreaterThan(120);
        expect(step.reflectionPrompt.length, `${clinicalCase.id}/${step.id} reflection`).toBeGreaterThan(70);
        expect(medicalSources[step.sourceId], `${clinicalCase.id}/${step.id} source`).toBeDefined();
      }
    }
  });

  it("covers every declared learning level", () => {
    const levels: MedicineLevel[] = ["Iniciante", "Ciclo básico", "Ciclo clínico", "Internato", "Residência"];
    for (const level of levels) {
      expect(medicalQuestions.some((question) => question.level === level), level).toBe(true);
      expect(medicineLevelProfiles[level].title.length, `${level} title`).toBeGreaterThan(5);
      expect(medicineLevelProfiles[level].focus.length, `${level} focus`).toBeGreaterThan(5);
      expect(medicineLevelProfiles[level].cycle.length, `${level} cycle`).toBeGreaterThanOrEqual(5);
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

  it("keeps every system connected to atlas structures, questions and a reviewed source", () => {
    for (const system of medicalSystems) {
      expect(medicalSources[system.sourceId], `source for system ${system.id}`).toBeDefined();
      expect(system.atlasStructureIds.length, `atlas links for ${system.id}`).toBeGreaterThanOrEqual(4);
      expect(system.questionSystems.length, `question links for ${system.id}`).toBeGreaterThan(0);

      for (const structureId of system.atlasStructureIds) {
        expect(anatomyStructures.some((structure) => structure.id === structureId), `${system.id} -> ${structureId}`).toBe(true);
      }

      expect(
        medicalQuestions.some((question) => system.questionSystems.includes(question.system)),
        `questions for ${system.id}`,
      ).toBe(true);
    }
  });

  it("provides broad whole-body atlas coverage with valid marker coordinates", () => {
    expect(anatomyStructures.length).toBeGreaterThanOrEqual(200);

    for (const layer of bodyLayers) {
      const structures = anatomyStructures.filter((structure) => structure.layer === layer.id);
      expect(structures.length, layer.label).toBeGreaterThanOrEqual(30);
    }

    for (const structure of anatomyStructures) {
      const positions = [anatomyPositionFor(structure, "anterior"), anatomyPositionFor(structure, "posterior")].filter(Boolean);
      expect(positions.length, `marker view for ${structure.id}`).toBeGreaterThan(0);
      for (const position of positions) {
        expect(position!.x, `${structure.id} x`).toBeGreaterThanOrEqual(0);
        expect(position!.x, `${structure.id} x`).toBeLessThanOrEqual(100);
        expect(position!.y, `${structure.id} y`).toBeGreaterThanOrEqual(0);
        expect(position!.y, `${structure.id} y`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("catalogs the posterior skeleton bone by bone instead of only as grouped regions", () => {
    const posteriorBoneIds = [
      ...Array.from({ length: 7 }, (_, index) => `vertebra-c${index + 1}`),
      ...Array.from({ length: 12 }, (_, index) => `vertebra-t${index + 1}`),
      ...Array.from({ length: 5 }, (_, index) => `vertebra-l${index + 1}`),
      ...Array.from({ length: 5 }, (_, index) => `sacral-segment-s${index + 1}`),
      ...Array.from({ length: 4 }, (_, index) => `coccygeal-segment-co${index + 1}`),
      ...Array.from({ length: 12 }, (_, index) => `rib-${index + 1}`),
      "scaphoid",
      "lunate",
      "triquetrum",
      "pisiform",
      "trapezium",
      "trapezoid",
      "capitate",
      "hamate",
      "talus",
      "calcaneus",
      "navicular-bone",
      "cuboid-bone",
      "medial-cuneiform",
      "intermediate-cuneiform",
      "lateral-cuneiform",
    ];

    for (const id of posteriorBoneIds) {
      const structure = anatomyStructures.find((item) => item.id === id);
      expect(structure, id).toBeDefined();
      expect(structure?.layer, id).toBe("skeletal");
      expect(anatomyPositionFor(structure!, "posterior"), `${id} posterior marker`).not.toBeNull();
    }

    for (const digit of [1, 2, 3, 4, 5]) {
      expect(anatomyStructures.some((item) => item.id === `metacarpal-${digit}`), `metacarpal ${digit}`).toBe(true);
      expect(anatomyStructures.some((item) => item.id === `metatarsal-${digit}`), `metatarsal ${digit}`).toBe(true);
      expect(anatomyStructures.some((item) => item.id === `hand-phalanx-${digit}-proximal`), `hand phalanx ${digit}`).toBe(true);
      expect(anatomyStructures.some((item) => item.id === `foot-phalanx-${digit}-proximal`), `foot phalanx ${digit}`).toBe(true);
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

    for (const clinicalCase of medicalClinicalCases) {
      if (clinicalCase.visual) expect(publicAssetExists(clinicalCase.visual.image), clinicalCase.visual.image).toBe(true);
    }
  });
});
