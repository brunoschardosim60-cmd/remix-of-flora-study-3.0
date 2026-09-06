/**
 * Render groups for the Z-Anatomy surface atlas. Node ids are generated
 * (`ZAHD__surface__…`), so classify the original `extras.anatomyName` instead.
 * This keeps hairs/nails/lips out of the continuous skin mesh without
 * increasing the render cost to one material/draw call per anatomical region.
 */
export type AnatomySkinRegion = "skin" | "hair" | "lip" | "nail";

export interface AnatomyNamedSurface {
  name: string;
  userData?: { anatomyName?: unknown };
}

export function anatomySurfaceSourceName(object: AnatomyNamedSurface): string {
  const sourceName = object.userData?.anatomyName;
  return typeof sourceName === "string" && sourceName.trim() ? sourceName : object.name;
}

export function classifyAnatomySkinRegion(sourceName: string): AnatomySkinRegion {
  const name = sourceName.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  if (/^(?:hairs? of (?:head|eyebrow)|pubic hairs?|eyelashes?)(?:\b|\.)/.test(name)) return "hair";
  if (/^nail plate(?:\b|\.)/.test(name)) return "nail";
  if (/^(?:tubercle of upper lip|labial commissure)(?:\b|\.)/.test(name)) return "lip";

  // Eyebrow, orbital/oral region, philtrum and perionyx contain normal skin;
  // a broad /eye|oral|labial/ regex incorrectly paints those surrounding areas.
  return "skin";
}
