import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  anatomyBodyProfiles,
  anatomyStructureVisibleForProfile,
  transformAnatomyDistance,
  transformAnatomyPoint,
} from "./anatomyBodyProfiles";

describe("anatomyBodyProfiles", () => {
  it("oferece perfis distintos para homem, mulher, criança e recém-nascido", () => {
    expect(anatomyBodyProfiles.map((profile) => profile.id)).toEqual([
      "adult-male", "adult-female", "child", "newborn",
    ]);
    expect(new Set(anatomyBodyProfiles.map((profile) => profile.scale.join(":"))).size).toBe(4);
  });

  it("mantém os pés no solo e ajusta câmera para perfis menores", () => {
    const adultFoot = transformAnatomyPoint([0, -4.35, 0], "adult-male");
    const childFoot = transformAnatomyPoint([0, -4.35, 0], "child");
    const newbornFoot = transformAnatomyPoint([0, -4.35, 0], "newborn");
    expect(adultFoot[1]).toBeCloseTo(-4.35);
    expect(childFoot[1]).toBeCloseTo(-4.35);
    expect(newbornFoot[1]).toBeCloseTo(-4.35);
    expect(transformAnatomyDistance(10, "newborn")).toBeLessThan(transformAnatomyDistance(10, "child"));
  });

  it("não mistura estruturas reprodutivas adultas entre os perfis", () => {
    const uterus = { id: "organ-uterus", name: "Útero", layer: "organs" };
    const prostate = { id: "organ-prostate", name: "Próstata", layer: "organs" };
    expect(anatomyStructureVisibleForProfile(uterus, "adult-male")).toBe(false);
    expect(anatomyStructureVisibleForProfile(prostate, "adult-male")).toBe(true);
    expect(anatomyStructureVisibleForProfile(uterus, "adult-female")).toBe(true);
    expect(anatomyStructureVisibleForProfile(prostate, "adult-female")).toBe(false);
    expect(anatomyStructureVisibleForProfile(uterus, "newborn")).toBe(false);
    expect(anatomyStructureVisibleForProfile(prostate, "child")).toBe(false);
  });

  it("mantém as novas superfícies naturais disponíveis no atlas", () => {
    for (const view of ["anterior", "posterior"]) {
      const asset = resolve(process.cwd(), "public", "medicine", "atlas", `surface-${view}-v3.png`);
      expect(statSync(asset).size).toBeGreaterThan(500_000);
    }
  });
});
