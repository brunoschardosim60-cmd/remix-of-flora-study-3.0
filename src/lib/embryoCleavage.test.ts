import { describe, expect, it } from "vitest";
import { cleavageSourceIds, cleavageSteps } from "./embryoCleavage";
import { medicalSources } from "./medicineData";

describe("etapas de clivagem", () => {
  it("têm ids únicos e textos completos", () => {
    expect(new Set(cleavageSteps.map((s) => s.id)).size).toBe(cleavageSteps.length);
    for (const step of cleavageSteps) {
      expect(step.description.length).toBeGreaterThan(60);
      expect(step.time).toBeTruthy();
    }
  });

  it("o número de células nunca diminui e as primeiras divisões dobram", () => {
    const counts = cleavageSteps.filter((s) => s.cells).map((s) => s.cells!);
    expect(counts.slice(0, 5)).toEqual([1, 2, 4, 8, 16]);
    for (let i = 1; i < counts.length; i += 1) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
  });

  it("termina em blastocisto e implantação, nessa ordem", () => {
    const ids = cleavageSteps.map((s) => s.id);
    expect(ids.indexOf("blastocyst")).toBeLessThan(ids.indexOf("implantation"));
    expect(ids[ids.length - 1]).toBe("implantation");
  });

  it("usa fontes cadastradas", () => {
    for (const id of cleavageSourceIds) expect(medicalSources[id]).toBeDefined();
  });
});
