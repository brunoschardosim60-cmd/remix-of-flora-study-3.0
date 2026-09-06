import { describe, expect, it } from "vitest";
import { BoxGeometry, DataTexture, MeshPhysicalMaterial } from "three";
import { anatomyMaterialProfiles, anatomyTissueForName, applyAnatomyTissueMaterial, estimatedTissueTextureBytes } from "./anatomyMaterialProfiles";
import { detectAnatomyRenderPolicy } from "./anatomyRenderQuality";

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
    expect(anatomyMaterialProfiles.skin.roughness).toBeGreaterThan(.7);
    expect(anatomyMaterialProfiles.skin.clearcoat).toBeLessThan(.02);
    expect(anatomyMaterialProfiles.skin.transmission).toBe(0);
    expect(anatomyMaterialProfiles.muscle.roughness).toBeGreaterThan(.65);
  });

  it("keeps generated texture memory inside the declared web budget", () => {
    expect(estimatedTissueTextureBytes(256, 15)).toBe(11_796_480);
    expect(estimatedTissueTextureBytes(128, 15)).toBeLessThan(3_000_000);
    expect(estimatedTissueTextureBytes(512, 15)).toBeLessThan(48_000_000);
  });

  it("uses opaque tissue with subtle relief and does not polish the roughness profile", () => {
    const geometry = new BoxGeometry();
    geometry.deleteAttribute("uv");
    const material = new MeshPhysicalMaterial();
    applyAnatomyTissueMaterial(material, geometry, "lung", { quality: detectAnatomyRenderPolicy() });
    expect(material.transmission).toBe(0);
    expect(material.normalScale.x).toBeLessThan(.1);
    expect(geometry.getAttribute("uv").count).toBe(geometry.getAttribute("position").count);
    const values = (material.roughnessMap as DataTexture).image.data as Uint8Array;
    expect(Math.min(...values.slice(0, 1024))).toBeGreaterThan(235);
    geometry.dispose();
    material.dispose();
  });
});
