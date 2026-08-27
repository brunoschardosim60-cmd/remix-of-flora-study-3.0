import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { histologySources } from "./histologyData";
import { sensoryStructures, sensoryViews } from "./sensoryOrgansData";

describe("sensoryOrgansData", () => {
  it("cobre integralmente o olho, os seis músculos e a cavidade oral solicitada", () => {
    const ids = sensoryStructures.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining([
      "eyelids", "eyelashes", "conjunctiva", "lacrimal-gland", "cornea", "iris", "pupil", "lens", "sclera",
      "ciliary-body", "retina", "optic-nerve", "vitreous-humor", "aqueous-humor",
      "superior-rectus", "inferior-rectus", "medial-rectus", "lateral-rectus", "superior-oblique", "inferior-oblique",
      "lips", "cheeks", "hard-palate", "soft-palate", "uvula", "incisors", "canines", "premolars", "molars",
      "enamel", "dentin", "dental-pulp", "filiform-papillae", "fungiform-papillae", "circumvallate-papillae",
      "foliate-papillae", "intrinsic-tongue-muscles", "extrinsic-tongue-muscles", "parotid-gland",
      "submandibular-gland", "sublingual-gland",
    ]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mantém toda estrutura em português, descrita, posicionada e citada", () => {
    for (const structure of sensoryStructures) {
      expect(structure.name.length).toBeGreaterThan(3);
      expect(structure.summary.length).toBeGreaterThan(25);
      expect(structure.function.length).toBeGreaterThan(25);
      expect(histologySources[structure.sourceId], structure.id).toBeDefined();
      expect(structure.x).toBeGreaterThanOrEqual(0);
      expect(structure.x).toBeLessThanOrEqual(100);
      expect(structure.y).toBeGreaterThanOrEqual(0);
      expect(structure.y).toBeLessThanOrEqual(100);
    }
  });

  it("mantém vistas com assets locais licenciados e relações válidas", () => {
    const ids = new Set(sensoryStructures.map((item) => item.id));
    for (const view of sensoryViews) {
      expect(histologySources[view.sourceId]).toBeDefined();
      expect(view.structureIds.length).toBeGreaterThan(0);
      expect(statSync(resolve(process.cwd(), "public", view.image.replace(/^\//, ""))).size).toBeGreaterThan(100_000);
      expect(view.structureIds.every((id) => ids.has(id))).toBe(true);
    }
  });

  it("abre olho e boca com fotografias clínicas reais por padrão", () => {
    const eye = sensoryViews.find((view) => view.id === "eye-external");
    const mouth = sensoryViews.find((view) => view.id === "oral-external");
    const oralCavity = sensoryViews.find((view) => view.id === "oral-cavity");

    for (const view of [eye, mouth, oralCavity]) {
      expect(view?.assetKind).toBe("photograph");
      expect(view?.aspectRatio).toBeGreaterThan(0);
      expect(view?.image).toContain("/histology/real/");
      expect(statSync(resolve(process.cwd(), "public", view!.image.replace(/^\//, ""))).size).toBeGreaterThan(800_000);
    }
    expect(eye?.sourceId).toBe("commons-eye-photo");
    expect(oralCavity?.sourceId).toBe("commons-oral-photo");
  });
});
