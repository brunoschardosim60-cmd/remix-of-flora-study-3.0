import { describe, expect, it } from "vitest";
import { selectAnatomyRenderPolicy } from "./anatomyRenderQuality";

describe("anatomy render quality", () => {
  it("uses an economical profile on phones without disabling realistic materials", () => {
    const policy = selectAnatomyRenderPolicy({ width: 390, devicePixelRatio: 3, memoryGb: 4, logicalCores: 8 });
    expect(policy.tier).toBe("economy");
    expect(policy.textureResolution).toBe(64);
    expect(policy.maxDpr).toBeLessThanOrEqual(1.1);
  });

  it("uses a balanced profile on tablets", () => {
    expect(selectAnatomyRenderPolicy({ width: 768, devicePixelRatio: 2, memoryGb: 8, logicalCores: 8 }).tier).toBe("balanced");
  });

  it("reserves ultra rendering for capable desktop viewports", () => {
    const policy = selectAnatomyRenderPolicy({ width: 1440, devicePixelRatio: 1, memoryGb: 16, logicalCores: 12 });
    expect(policy.tier).toBe("ultra");
    expect(policy.shadowMapSize).toBe(2048);
  });
});

