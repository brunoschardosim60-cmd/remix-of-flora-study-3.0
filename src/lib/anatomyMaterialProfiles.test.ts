import { describe, expect, it } from "vitest";
import { anatomyMaterialProfiles, anatomyTissueForName, estimatedTissueTextureBytes } from "./anatomyMaterialProfiles";

describe("anatomy material profiles", () => {
  it("classifies the main anatomical tissues without treating every structure as an organ", () => {
    expect(anatomyTissueForName("Musculus deltoideus", "muscle")).toBe("muscle");
    expect(anatomyTissueForName("tendo calcaneus", "muscle")).toBe("tendon");
    expect(anatomyTissueForName("Left rib 7", "bone")).toBe("bone");
    expect(anatomyTissueForName("superior vena cava")).toBe("vein");
    expect(anatomyTissueForName("right coronary artery")).toBe("artery");
    expect(anatomyTissueForName("sciatic nerve")).toBe("nerve");
    expect(anatomyTissueForName("left cerebral cortex")).toBe("brain");
  });

  it("keeps biological surfaces non-metallic and tissue-specific", () => {
    expect(anatomyMaterialProfiles.bone.roughness).toBeGreaterThan(anatomyMaterialProfiles.heart.roughness);
    expect(anatomyMaterialProfiles.tendon.fiberStrength).toBeGreaterThan(anatomyMaterialProfiles.skin.fiberStrength);
    expect(anatomyMaterialProfiles.heart.clearcoat).toBeLessThan(.2);
    expect(anatomyMaterialProfiles.lung.roughness).toBeGreaterThan(anatomyMaterialProfiles.liver.roughness);
  });

  it("keeps generated texture memory inside the declared web budget", () => {
    expect(estimatedTissueTextureBytes(256, 15)).toBe(11_796_480);
    expect(estimatedTissueTextureBytes(128, 15)).toBeLessThan(3_000_000);
    expect(estimatedTissueTextureBytes(512, 15)).toBeLessThan(48_000_000);
  });
});
