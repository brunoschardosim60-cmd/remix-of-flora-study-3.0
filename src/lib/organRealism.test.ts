import { describe, expect, it } from "vitest";
import { organRealismProfile } from "./organRealism";

describe("organRealismProfile", () => {
  it("uses tissue-specific macroscopic palettes", () => {
    const lungs = organRealismProfile("Left lung");
    const heart = organRealismProfile("Coração");
    const liver = organRealismProfile("Fígado");
    const brain = organRealismProfile("Encéfalo");

    expect(new Set([lungs.color, heart.color, liver.color, brain.color]).size).toBe(4);
    expect(lungs.tissue).toBe("Parênquima pulmonar");
    expect(heart.tissue).toBe("Miocárdio");
    expect(liver.tissue).toBe("Parênquima hepático");
    expect(brain.tissue).toBe("Tecido nervoso");
  });

  it("defines physically plausible non-metallic surface parameters", () => {
    for (const name of ["Heart", "Lung", "Liver", "Kidney", "Brain", "Stomach", "Pancreas", "Spleen", "Eye"]) {
      const profile = organRealismProfile(name);
      expect(profile.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.highlight).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.roughness).toBeGreaterThan(0);
      expect(profile.roughness).toBeLessThanOrEqual(1);
      expect(profile.clearcoat).toBeGreaterThanOrEqual(0);
      expect(profile.clearcoat).toBeLessThanOrEqual(1);
      expect(profile.sheen).toBeGreaterThanOrEqual(0);
      expect(profile.sheen).toBeLessThanOrEqual(1);
    }
  });

  it("falls back safely for an uncatalogued visceral structure", () => {
    const fallback = organRealismProfile("Estrutura visceral desconhecida");
    expect(fallback.tissue).toBe("Tecido visceral");
    expect(fallback.color).toBeTruthy();
  });
});
