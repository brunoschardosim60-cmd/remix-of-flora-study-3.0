import { describe, expect, it } from "vitest";
import { surgicalScenarios, surgicalStages, surgicalTools, WHO_SURGICAL_SAFETY_URL } from "./surgicalSimulation";

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
    const educationalCopy = [
      ...surgicalStages.map((stage) => [stage.prompt, stage.success, stage.criticalEvent, stage.learningPoint].join(" ")),
      ...surgicalScenarios.map((scenario) => [scenario.summary, scenario.patientSnapshot, ...scenario.anatomyByStage].join(" ")),
    ].join(" ");
    expect(educationalCopy).not.toMatch(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|ml|mg|graus?)\b/i);
    expect(WHO_SURGICAL_SAFETY_URL).toMatch(/^https:\/\/www\.who\.int\//);
  });

  it("offers several sensitive fictional scenarios with complete stage context", () => {
    expect(surgicalScenarios).toHaveLength(4);
    expect(new Set(surgicalScenarios.map((scenario) => scenario.id)).size).toBe(surgicalScenarios.length);

    for (const scenario of surgicalScenarios) {
      expect(scenario.bodyViews, `${scenario.id} views`).toHaveLength(surgicalStages.length);
      expect(scenario.targets, `${scenario.id} targets`).toHaveLength(surgicalStages.length);
      expect(scenario.anatomyByStage, `${scenario.id} anatomy`).toHaveLength(surgicalStages.length);
      expect(scenario.statusByStage, `${scenario.id} status`).toHaveLength(surgicalStages.length);
      expect(scenario.contentWarnings.length, `${scenario.id} warnings`).toBeGreaterThanOrEqual(3);
      expect(scenario.nearbyStructures.length, `${scenario.id} nearby structures`).toBeGreaterThanOrEqual(4);
      expect(scenario.possibleEvents.length, `${scenario.id} possible events`).toBeGreaterThanOrEqual(3);
    }
  });
});
