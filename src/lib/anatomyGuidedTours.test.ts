import { describe, expect, it } from "vitest";
import { anatomyGuidedTours } from "./anatomyGuidedTours";
import { anatomy3DStructures } from "./anatomy3DModel";
import { medicalSources } from "./medicineData";

describe("visitas guiadas do corpo 3D", () => {
  it("têm ids únicos e conteúdo", () => {
    const ids = anatomyGuidedTours.map((tour) => tour.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tour of anatomyGuidedTours) {
      expect(tour.stops.length).toBeGreaterThanOrEqual(3);
      expect(tour.description.length).toBeGreaterThan(10);
    }
  });

  it("cada parada aponta para uma estrutura 3D existente e tem narração", () => {
    const known = new Set(anatomy3DStructures.map((item) => item.id));
    for (const tour of anatomyGuidedTours) {
      for (const stop of tour.stops) {
        expect(known.has(stop.structureId), `${tour.id}: ${stop.structureId}`).toBe(true);
        expect(stop.narration.length).toBeGreaterThan(60);
      }
    }
  });

  it("citam apenas fontes cadastradas", () => {
    for (const tour of anatomyGuidedTours) {
      expect(tour.sourceIds.length).toBeGreaterThan(0);
      for (const id of tour.sourceIds) expect(medicalSources[id], id).toBeDefined();
    }
  });
});
