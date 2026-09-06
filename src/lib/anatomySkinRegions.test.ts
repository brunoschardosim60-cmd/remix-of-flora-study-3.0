import { describe, expect, it } from "vitest";
import { anatomySurfaceSourceName, classifyAnatomySkinRegion } from "./anatomySkinRegions";

describe("anatomical surface render regions", () => {
  it.each([
    "Hairs of head", "Hairs of head.001", "Hairs of eyebrow.r", "Hairs of eyebrow.l",
    "Pubic hairs", "Eyelashes.r", "Eyelashes.l",
  ])("retains a hair material for the source mesh %s", (name) => {
    expect(classifyAnatomySkinRegion(name)).toBe("hair");
  });

  it.each(["Nail plate.r", "Nail plate.l", "Nail plate (foot).r", "Nail plate (foot).002"])(
    "retains a nail material for %s", (name) => {
      expect(classifyAnatomySkinRegion(name)).toBe("nail");
    },
  );

  it.each(["Labial commissure.r", "Labial commissure.l", "Tubercle of upper lip.r", "Tubercle of upper lip.002"])(
    "gives only identified lip features a lip material: %s", (name) => {
      expect(classifyAnatomySkinRegion(name)).toBe("lip");
    },
  );

  it.each([
    "Eyebrow.r", "Orbital region.l", "Oral region.r", "Philtrum.r", "Nasolabial sulcus.l",
    "Mentolabial sulcus.r", "Perionyx (foot).l", "Frontal region.r", "Unknown surface",
  ])("does not confuse surrounding skin with hair/lips/nails: %s", (name) => {
    expect(classifyAnatomySkinRegion(name)).toBe("skin");
  });

  it("reads the preserved source anatomy name instead of generated GLB node ids", () => {
    const name = anatomySurfaceSourceName({ name: "ZAHD__surface__0255", userData: { anatomyName: "Hairs of head" } });
    expect(classifyAnatomySkinRegion(name)).toBe("hair");
  });

  it("falls back safely for assets without source metadata", () => {
    expect(anatomySurfaceSourceName({ name: "Nail plate.001" })).toBe("Nail plate.001");
    expect(anatomySurfaceSourceName({ name: "Nail plate.001", userData: { anatomyName: " " } })).toBe("Nail plate.001");
    expect(anatomySurfaceSourceName({ name: "Nail plate.001", userData: { anatomyName: 42 } })).toBe("Nail plate.001");
  });
});
