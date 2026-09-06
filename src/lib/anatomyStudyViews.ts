import type { Anatomy3DSystemId } from "./anatomy3DModel";

type Layer = Exclude<Anatomy3DSystemId, "all">;
export interface AnatomyStudyView {
  id: string;
  label: string;
  group: "Sistemas" | "Combinações" | "Órgãos em detalhe";
  layers: Partial<Record<Layer, number>>;
  structureId?: string;
}

// Reuse the registered anatomical assets; these are study views, not new specimens.
export const anatomyStudyViews: readonly AnatomyStudyView[] = [
  { id: "surface", label: "Superfície corporal", group: "Sistemas", layers: { surface: 1 } },
  { id: "muscles", label: "Músculos", group: "Sistemas", layers: { muscular: 1 } },
  { id: "skeleton", label: "Esqueleto", group: "Sistemas", layers: { skeletal: 1 } },
  { id: "vessels", label: "Artérias e veias", group: "Sistemas", layers: { vascular: 1 } },
  { id: "nerves", label: "Sistema nervoso", group: "Sistemas", layers: { nervous: 1 } },
  { id: "viscera", label: "Órgãos no corpo", group: "Sistemas", layers: { organs: 1 } },
  { id: "locomotor", label: "Músculos + esqueleto", group: "Combinações", layers: { muscular: .42, skeletal: 1 } },
  { id: "bone-vessels", label: "Esqueleto + vasos", group: "Combinações", layers: { skeletal: .7, vascular: 1 } },
  { id: "neurovascular", label: "Nervos + vasos", group: "Combinações", layers: { nervous: 1, vascular: 1 } },
  { id: "visceral-relations", label: "Órgãos + esqueleto", group: "Combinações", layers: { organs: 1, skeletal: .28 } },
  { id: "heart", label: "Coração", group: "Órgãos em detalhe", layers: { organs: 1 }, structureId: "organ-heart" },
  { id: "brain", label: "Encéfalo", group: "Órgãos em detalhe", layers: { organs: 1 }, structureId: "organ-brain" },
  { id: "lungs", label: "Pulmões", group: "Órgãos em detalhe", layers: { organs: 1 }, structureId: "organ-lungs" },
  { id: "liver", label: "Fígado", group: "Órgãos em detalhe", layers: { organs: 1 }, structureId: "organ-liver" },
  { id: "kidneys", label: "Rins", group: "Órgãos em detalhe", layers: { organs: 1 }, structureId: "organ-kidneys" },
];

export function layersForStudyView(view: AnatomyStudyView): Record<Layer, { visible: boolean; opacity: number }> {
  const layers: Layer[] = ["surface", "muscular", "skeletal", "vascular", "nervous", "organs"];
  return Object.fromEntries(layers.map((layer) => [layer, {
    visible: view.layers[layer] !== undefined,
    opacity: view.layers[layer] ?? 1,
  }])) as Record<Layer, { visible: boolean; opacity: number }>;
}
