import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import {
  anatomyPositionFor,
  anatomyStructures,
  atlasImageFor,
  atlasImageForStructure,
  atlasCoverageByLayer,
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

function paethPredictor(left: number, above: number, upperLeft: number) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function readRgbaPngAlpha(asset: string) {
  const png = readFileSync(resolve(process.cwd(), "public", asset.replace(/^\//, "")));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  expect(png[24], `${asset} bit depth`).toBe(8);
  expect(png[25], `${asset} color type`).toBe(6);

  const compressed: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") compressed.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }

  const inflated = inflateSync(Buffer.concat(compressed));
  const stride = width * 4;
  const alpha = new Uint8Array(width * height);
  let inputOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = Buffer.from(inflated.subarray(inputOffset, inputOffset + stride));
    inputOffset += stride;

    for (let index = 0; index < stride; index += 1) {
      const left = index >= 4 ? row[index - 4] : 0;
      const above = previous[index] ?? 0;
      const upperLeft = index >= 4 ? previous[index - 4] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? above
            : filter === 3 ? Math.floor((left + above) / 2)
              : paethPredictor(left, above, upperLeft);
      row[index] = (row[index] + predictor) & 0xff;
    }

    for (let x = 0; x < width; x += 1) alpha[(y * width) + x] = row[(x * 4) + 3];
    previous = row;
  }

  return { width, height, alpha };
}

describe("medicine content integrity", () => {
  const publicAssetExists = (asset: string) => existsSync(resolve(process.cwd(), "public", asset.replace(/^\//, "")));

  it("audita a contagem editorial de cada camada e vista", () => {
    const audit = bodyLayers.map((layer) => {
      const structures = anatomyStructures.filter((structure) => structure.layer === layer.id);
      return {
        camada: layer.id,
        catalogadas: structures.length,
        anterior: structures.filter((structure) => anatomyPositionFor(structure, "anterior")).length,
        posterior: structures.filter((structure) => anatomyPositionFor(structure, "posterior")).length,
      };
    });
    expect(audit).toEqual([
      { camada: "surface", catalogadas: 54, anterior: 41, posterior: 32 },
      { camada: "muscular", catalogadas: 80, anterior: 47, posterior: 36 },
      { camada: "skeletal", catalogadas: 123, anterior: 43, posterior: 108 },
      { camada: "vascular", catalogadas: 68, anterior: 59, posterior: 68 },
      { camada: "nervous", catalogadas: 52, anterior: 29, posterior: 52 },
      { camada: "organs", catalogadas: 88, anterior: 83, posterior: 88 },
    ]);
    const normalizedNames = new Map<string, string[]>();
    for (const structure of anatomyStructures) {
      const key = `${structure.layer}:${structure.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")}`;
      normalizedNames.set(key, [...(normalizedNames.get(key) ?? []), structure.id]);
    }
    expect([...normalizedNames.entries()].filter(([, ids]) => ids.length > 1)).toEqual([]);
  });

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

  it("mantém os títulos exibidos em português e as referências OpenStax na edição atual", () => {
    const untranslatedTitleWords = /\b(anatomy|physiology|functions|development|assessment|clinical|patient|safe|signs|symptoms|diagnosis|interview|examination|perception|pathways)\b/i;
    const sourcesWithEnglishBrandNames = new Set(["openAnatomy", "zAnatomy3D", "zAnatomySystems3D", "zAnatomyOrgan3D"]);
    for (const [id, source] of Object.entries(medicalSources)) {
      if (sourcesWithEnglishBrandNames.has(id)) continue;
      expect(source.title, `${id} title`).not.toMatch(untranslatedTitleWords);
    }
    expect(medicalSources.openstaxPns.url).toContain("anatomy-and-physiology-2e");
    expect(medicalSources.openstaxSenses.url).toContain("anatomy-and-physiology-2e");
  });

  it("não confunde botões gustativos com papilas gustativas", () => {
    const tasteBuds = anatomyStructures.find((structure) => structure.id === "taste-buds");
    expect(tasteBuds).toBeDefined();
    expect(tasteBuds?.synonyms.map((item) => item.toLocaleLowerCase("pt-BR"))).not.toContain("papilas gustativas");
    expect(tasteBuds?.synonyms.map((item) => item.toLocaleLowerCase("pt-BR"))).toContain("calículos gustatórios");
  });

  it("classifica cada órgão no sistema correspondente e evita fontes genéricas", () => {
    const cataloguedOrgans = anatomyStructures.filter((structure) => structure.layer === "organs" && !["brain", "heart", "lungs", "liver", "kidneys"].includes(structure.id));
    for (const structure of cataloguedOrgans) {
      expect(structure.system, `${structure.id} system`).not.toBe("Anatomia de órgãos e sentidos");
      expect(structure.sourceId, `${structure.id} source`).not.toBe("openstax");
    }
    expect(anatomyStructures.find((item) => item.id === "eyes")?.system).toBe("Sentidos especiais");
    expect(anatomyStructures.find((item) => item.id === "pancreas")?.system).toBe("Digestório e endócrino");
    expect(anatomyStructures.find((item) => item.id === "urethra")?.system).toBe("Urinário");
  });

  it("covers the complete development journey with study-ready content", () => {
    expect(embryologyTimeline.length).toBeGreaterThanOrEqual(11);
    expect(embryologyTimeline[0].phase).toBe("Pré-natal");
    expect(embryologyTimeline.at(-1)?.phase).toBe("Pós-natal");
    expect(embryologyTimeline.at(-1)?.id).toBe("late-adulthood");
    expect(embryologyTimeline.at(-1)?.title).toContain("Envelhecimento");
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
      expect(medicalQuestions.filter((question) => question.level === level).length, level).toBeGreaterThanOrEqual(5);
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

  it("distingue a cobertura editorial do atlas da escala anatômica humana", () => {
    for (const layer of bodyLayers) {
      const coverage = atlasCoverageByLayer[layer.id];
      expect(coverage.humanReference.length, layer.label).toBeGreaterThan(25);
      expect(coverage.catalogNote.length, layer.label).toBeGreaterThan(50);
      expect(coverage.sourceIds.length, layer.label).toBeGreaterThan(0);
      for (const sourceId of coverage.sourceIds) expect(medicalSources[sourceId], `${layer.id}/${sourceId}`).toBeDefined();
    }

    expect(atlasCoverageByLayer.skeletal.humanReference).toContain("206");
    expect(atlasCoverageByLayer.muscular.humanReference).toContain("mais de 600");
    expect(atlasCoverageByLayer.organs.humanReference).toContain("não há consenso");
  });

  it("keeps every system connected to atlas structures, questions and a reviewed source", () => {
    expect(medicalSystems.length).toBeGreaterThanOrEqual(11);
    expect(medicalSystems.map((system) => system.id)).toEqual(expect.arrayContaining(["integumentary", "special-senses", "reproductive"]));

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

  it("keeps the anterior forearm markers attached to the current skeletal artwork", () => {
    const radius = anatomyStructures.find((structure) => structure.id === "radius")!;
    const ulna = anatomyStructures.find((structure) => structure.id === "ulna")!;

    expect(anatomyPositionFor(radius, "anterior")).toEqual({ x: 19, y: 44 });
    expect(anatomyPositionFor(ulna, "anterior")).toEqual({ x: 22, y: 44 });
  });

  it("mantém todos os marcadores sobre a silhueta das ilustrações atuais", () => {
    const masks = new Map<string, ReturnType<typeof readRgbaPngAlpha>>();
    const detached: string[] = [];

    for (const structure of anatomyStructures) {
      for (const view of ["anterior", "posterior"] as const) {
        const position = anatomyPositionFor(structure, view);
        if (!position) continue;
        const asset = atlasImageForStructure(structure, view);
        const mask = masks.get(asset) ?? readRgbaPngAlpha(asset);
        masks.set(asset, mask);
        const centerX = Math.round((position.x / 100) * (mask.width - 1));
        const centerY = Math.round((position.y / 100) * (mask.height - 1));
        const radiusX = Math.max(3, Math.round(mask.width * 0.012));
        const radiusY = Math.max(3, Math.round(mask.height * 0.012));
        let touchesArtwork = false;

        for (let y = Math.max(0, centerY - radiusY); y <= Math.min(mask.height - 1, centerY + radiusY) && !touchesArtwork; y += 2) {
          for (let x = Math.max(0, centerX - radiusX); x <= Math.min(mask.width - 1, centerX + radiusX); x += 2) {
            if (mask.alpha[(y * mask.width) + x] >= 48) {
              touchesArtwork = true;
              break;
            }
          }
        }

        if (!touchesArtwork) detached.push(`${structure.id}:${view}@${position.x},${position.y}`);
      }
    }

    expect(detached).toEqual([]);
  });

  it("catalogs the adult posterior skeleton without counting group summaries twice", () => {
    const posteriorBoneIds = [
      ...Array.from({ length: 7 }, (_, index) => `vertebra-c${index + 1}`),
      ...Array.from({ length: 12 }, (_, index) => `vertebra-t${index + 1}`),
      ...Array.from({ length: 5 }, (_, index) => `vertebra-l${index + 1}`),
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
      "sacrum",
      "coccyx",
    ];

    for (const id of posteriorBoneIds) {
      const structure = anatomyStructures.find((item) => item.id === id);
      expect(structure, id).toBeDefined();
      expect(structure?.layer, id).toBe("skeletal");
      expect(anatomyPositionFor(structure!, "posterior"), `${id} posterior marker`).not.toBeNull();
    }

    for (let number = 1; number <= 12; number += 1) {
      const rib = anatomyStructures.find((item) => item.id === `rib-${number}`);
      expect(anatomyPositionFor(rib!, "anterior"), `rib-${number} anterior marker`).not.toBeNull();
    }

    for (const digit of [1, 2, 3, 4, 5]) {
      expect(anatomyStructures.some((item) => item.id === `metacarpal-${digit}`), `metacarpal ${digit}`).toBe(true);
      expect(anatomyStructures.some((item) => item.id === `metatarsal-${digit}`), `metatarsal ${digit}`).toBe(true);
      expect(anatomyStructures.some((item) => item.id === `hand-phalanx-${digit}-proximal`), `hand phalanx ${digit}`).toBe(true);
      expect(anatomyStructures.some((item) => item.id === `foot-phalanx-${digit}-proximal`), `foot phalanx ${digit}`).toBe(true);
    }

    const redundantGroupIds = [
      "cervical-vertebrae", "thoracic-vertebrae", "lumbar-vertebrae", "ribs", "carpals",
      "metacarpals", "hand-phalanges", "tarsals", "metatarsals", "foot-phalanges",
      ...Array.from({ length: 5 }, (_, index) => `sacral-segment-s${index + 1}`),
      ...Array.from({ length: 4 }, (_, index) => `coccygeal-segment-co${index + 1}`),
    ];
    for (const id of redundantGroupIds) expect(anatomyStructures.some((item) => item.id === id), id).toBe(false);
    expect(anatomyStructures.filter((item) => item.layer === "skeletal")).toHaveLength(123);
  });

  it("amplia o atlas com estruturas regionais de alto valor sem inflar grupos redundantes", () => {
    const requiredByLayer = {
      surface: ["epigastric-region", "perineal-region", "carpal-region", "calcaneal-region"],
      muscular: ["buccinator", "transversus-abdominis", "subscapularis", "piriformis", "levator-ani"],
      skeletal: ["sphenoid-bone", "ethmoid-bone", "hyoid-bone", "malleus", "incus", "stapes"],
      vascular: ["pulmonary-trunk", "pulmonary-veins", "left-coronary-artery", "hepatic-veins", "small-saphenous-vein"],
      nervous: ["olfactory-nerve", "oculomotor-nerve", "vestibulocochlear-nerve", "accessory-nerve", "hypoglossal-nerve", "pudendal-nerve"],
      organs: ["cornea", "submandibular-gland", "epiglottis", "alveoli", "pericardium", "aortic-valve", "clitoris", "bulbourethral-glands"],
    } as const;

    for (const [layer, ids] of Object.entries(requiredByLayer)) {
      for (const id of ids) {
        const structure = anatomyStructures.find((item) => item.id === id);
        expect(structure, `${layer}/${id}`).toBeDefined();
        expect(structure?.layer, id).toBe(layer);
      }
    }

    const cranialNerveIds = [
      "olfactory-nerve", "optic-nerve", "oculomotor-nerve", "trochlear-nerve", "trigeminal-nerve", "abducens-nerve",
      "facial-nerve", "vestibulocochlear-nerve", "glossopharyngeal-nerve", "vagus-nerve", "accessory-nerve", "hypoglossal-nerve",
    ];
    for (const id of cranialNerveIds) expect(anatomyStructures.some((item) => item.id === id), id).toBe(true);
  });

  it("keeps deep anatomical layers fully explorable from the posterior view", () => {
    for (const layer of ["vascular", "nervous", "organs"] as const) {
      const structures = anatomyStructures.filter((item) => item.layer === layer);
      expect(structures.length, layer).toBeGreaterThanOrEqual(30);
      for (const structure of structures) {
        expect(anatomyPositionFor(structure, "posterior"), `${layer}/${structure.id}`).not.toBeNull();
      }
    }

    const newlyDetailed = [
      "epidermis", "dermis", "hypodermis", "cochlea", "semicircular-canals",
      "ovaries", "uterine-tubes", "uterus", "testes", "epididymis", "prostate",
    ];
    for (const id of newlyDetailed) expect(anatomyStructures.some((item) => item.id === id), id).toBe(true);
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
      expect(publicAssetExists(atlasImageFor(layer.id, "anterior"))).toBe(true);
      expect(publicAssetExists(atlasImageFor(layer.id, "posterior"))).toBe(true);
    }

    for (const clinicalCase of medicalClinicalCases) {
      if (clinicalCase.visual) expect(publicAssetExists(clinicalCase.visual.image), clinicalCase.visual.image).toBe(true);
    }
  });

  it("uses the current atlas artwork consistently in every integrated module", () => {
    const skin = anatomyStructures.find((item) => item.id === "skin")!;
    const uterus = anatomyStructures.find((item) => item.id === "uterus")!;
    const heart = anatomyStructures.find((item) => item.id === "heart")!;

    expect(atlasImageForStructure(skin, "anterior")).toBe("/medicine/atlas/surface-anterior-v3.png");
    expect(atlasImageForStructure(skin, "posterior")).toBe("/medicine/atlas/surface-posterior-v3.png");
    expect(atlasImageForStructure(uterus, "anterior")).toBe("/medicine/atlas/organs-female-anterior-v3.png");
    expect(atlasImageForStructure(heart, "anterior")).toBe("/medicine/atlas/organs-anterior-v2.png");
  });

  it("mantém todas as imagens médicas íntegras e em alta resolução", () => {
    const root = resolve(process.cwd(), "public", "medicine");
    const files = readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLocaleLowerCase("pt-BR").endsWith(".png"))
      .map((entry) => resolve(entry.parentPath, entry.name));

    expect(files.length).toBeGreaterThanOrEqual(90);
    for (const file of files) {
      const bytes = readFileSync(file);
      expect(bytes.subarray(0, 8).toString("hex"), file).toBe("89504e470d0a1a0a");
      expect(bytes.readUInt32BE(16), `${file} width`).toBeGreaterThanOrEqual(600);
      expect(bytes.readUInt32BE(20), `${file} height`).toBeGreaterThanOrEqual(400);
    }

    const activeAtlasImages = new Set([
      ...bodyLayers.flatMap((layer) => [atlasImageFor(layer.id, "anterior"), atlasImageFor(layer.id, "posterior")]),
      atlasImageFor("organs", "anterior", "female"),
      atlasImageFor("organs", "posterior", "female"),
    ]);
    for (const asset of activeAtlasImages) {
      const file = resolve(process.cwd(), "public", asset.replace(/^\//, ""));
      const bytes = readFileSync(file);
      expect(bytes.readUInt32BE(16), `${asset} width`).toBeGreaterThanOrEqual(940);
      expect(bytes.readUInt32BE(20), `${asset} height`).toBeGreaterThanOrEqual(1536);
    }
  });
});
