import { describe, expect, it } from "vitest";
import { surgicalScenarios } from "@/lib/surgicalSimulation";
import { surgicalScenarioVisuals } from "@/lib/surgicalVisuals";

describe("surgicalScenarioVisuals", () => {
  it("covers every virtual surgery scenario with paired realistic assets", () => {
    expect(Object.keys(surgicalScenarioVisuals)).toHaveLength(surgicalScenarios.length);

    for (const scenario of surgicalScenarios) {
      const visual = surgicalScenarioVisuals[scenario.id];
      expect(visual.surfaceImage).toMatch(/^\/medicine\/surgery\/.+-surface-v1\.png$/);
      expect(visual.anatomyImage).toMatch(/^\/medicine\/surgery\/.+-anatomy-v1\.png$/);
      expect(visual.target.x).toBeGreaterThan(0);
      expect(visual.target.x).toBeLessThan(100);
      expect(visual.target.y).toBeGreaterThan(0);
      expect(visual.target.y).toBeLessThan(100);
    }
  });
});
