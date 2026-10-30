import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { medicalSources } from "./medicineData";
import {
  cleanHraMeshName,
  hraAvailableSexes,
  hraModelTotals,
  hraOrganById,
  hraOrgans,
  hraPartsFor,
  hraResolveSex,
  hraSystemOrder,
} from "./hraOrganLibrary";

const publicDir = join(process.cwd(), "public");

describe("biblioteca de órgãos do HRA", () => {
  it("mantém identificadores únicos e conteúdo didático completo", () => {
    expect(new Set(hraOrgans.map((organ) => organ.id)).size).toBe(hraOrgans.length);
    for (const organ of hraOrgans) {
      expect(organ.name.length, organ.id).toBeGreaterThan(2);
      expect(organ.latin.length, organ.id).toBeGreaterThan(2);
      expect(organ.summary.length, organ.id).toBeGreaterThan(40);
      expect(organ.function.length, organ.id).toBeGreaterThan(20);
      expect(hraSystemOrder, organ.id).toContain(organ.system);
      expect(hraAvailableSexes(organ).length, organ.id).toBeGreaterThan(0);
    }
  });

  it("toda fonte existe, é segura, tem licença CC BY e atribuição", () => {
    for (const organ of hraOrgans) {
      const source = medicalSources[organ.sourceId];
      expect(source, organ.id).toBeDefined();
      expect(source.url.startsWith("https://"), organ.id).toBe(true);
      expect(source.license, organ.id).toBe("CC BY 4.0");
      expect(source.attribution?.length ?? 0, organ.id).toBeGreaterThan(20);
    }
  });

  it("todos os arquivos 3D existem no projeto com o tamanho esperado", () => {
    for (const organ of hraOrgans) {
      for (const parts of Object.values(organ.models)) {
        for (const part of parts ?? []) {
          const file = join(publicDir, part.path);
          expect(existsSync(file), part.path).toBe(true);
          expect(statSync(file).size, part.path).toBeGreaterThanOrEqual(part.expectedMinimumBytes);
          expect(part.meshCount, part.path).toBeGreaterThan(0);
          expect(part.triangleCount, part.path).toBeGreaterThan(0);
        }
      }
    }
  });

  it("oferece versão masculina e feminina onde o atlas as distribui", () => {
    const both = hraOrgans.filter((organ) => hraAvailableSexes(organ).length === 2);
    expect(both.length).toBeGreaterThanOrEqual(13);
    expect(hraAvailableSexes(hraOrganById("uterus")!)).toEqual(["female"]);
    expect(hraAvailableSexes(hraOrganById("placenta")!)).toEqual(["female"]);
    expect(hraAvailableSexes(hraOrganById("prostate")!)).toEqual(["male"]);
  });

  it("troca para o sexo disponível quando o órgão só existe em um", () => {
    expect(hraResolveSex(hraOrganById("uterus")!, "male")).toBe("female");
    expect(hraResolveSex(hraOrganById("prostate")!, "female")).toBe("male");
    expect(hraResolveSex(hraOrganById("heart")!, "male")).toBe("male");
    expect(hraPartsFor(hraOrganById("kidneys")!, "male")).toHaveLength(2);
  });

  it("soma malhas e triângulos de órgãos com mais de um arquivo", () => {
    const kidneys = hraPartsFor(hraOrganById("kidneys")!, "female");
    const totals = hraModelTotals(kidneys);
    expect(totals.meshCount).toBe(kidneys[0].meshCount + kidneys[1].meshCount);
    expect(totals.triangleCount).toBe(kidneys[0].triangleCount + kidneys[1].triangleCount);
  });

  it("limpa os nomes das malhas sem alterar o termo anatômico", () => {
    expect(cleanHraMeshName("VH_F_tail_of_pancreas")).toBe("tail of pancreas");
    expect(cleanHraMeshName("VH_M_C1_segment_of_cervical_spinal_cord")).toBe("C1 segment of cervical spinal cord");
    expect(cleanHraMeshName("Allen_olfactory_bulb_L")).toBe("olfactory bulb L");
    expect(cleanHraMeshName("Yao_capsule_of_lymph_node")).toBe("capsule of lymph node");
  });
});
