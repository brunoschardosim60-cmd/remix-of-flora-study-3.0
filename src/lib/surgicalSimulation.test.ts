import { describe, expect, it } from "vitest";
import { surgicalStages, surgicalTools, WHO_SURGICAL_SAFETY_URL } from "./surgicalSimulation";

describe("surgical safety simulation", () => {
  it("keeps every stage unique and linked to an available resource", () => {
    expect(surgicalStages).toHaveLength(7);
    expect(new Set(surgicalStages.map((stage) => stage.id)).size).toBe(surgicalStages.length);
    expect(new Set(surgicalTools.map((tool) => tool.id)).size).toBe(surgicalTools.length);

    const toolIds = new Set(surgicalTools.map((tool) => tool.id));
    for (const stage of surgicalStages) {
      expect(toolIds.has(stage.expectedToolId), stage.id).toBe(true);
      expect(stage.criticalEvent.length, `${stage.id} critical event`).toBeGreaterThan(70);
      expect(stage.learningPoint.length, `${stage.id} learning point`).toBeGreaterThan(60);
      expect(stage.target.x, `${stage.id} x`).toBeGreaterThanOrEqual(0);
      expect(stage.target.x, `${stage.id} x`).toBeLessThanOrEqual(100);
      expect(stage.target.y, `${stage.id} y`).toBeGreaterThanOrEqual(0);
      expect(stage.target.y, `${stage.id} y`).toBeLessThanOrEqual(100);
    }
  });

  it("stays non-executable and points to the WHO safety resource", () => {
    const educationalCopy = surgicalStages.map((stage) => [stage.prompt, stage.success, stage.criticalEvent, stage.learningPoint].join(" ")).join(" ");
    expect(educationalCopy).not.toMatch(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|ml|mg|graus?)\b/i);
    expect(WHO_SURGICAL_SAFETY_URL).toMatch(/^https:\/\/www\.who\.int\//);
  });
});
