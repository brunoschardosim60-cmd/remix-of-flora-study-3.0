import type { SensoryJourneyId } from "./sensoryOrgansData";

export type Histology3DMaterial = "eye" | "brain" | "tongue" | "salivary" | "oral" | "teeth";

export interface Histology3DModel {
  id: string;
  journeyId: Exclude<SensoryJourneyId, "cell">;
  name: string;
  eyebrow: string;
  description: string;
  path: string;
  sourceId: "zanatomy-models";
  includeNames?: string[];
  material: Histology3DMaterial;
  rotateX?: number;
}

const organModel = "/medicine/models/zanatomy-organs-v1.glb";

export const histology3DModels: Histology3DModel[] = [
  {
    id: "eye-globe",
    journeyId: "eye",
    name: "Globo ocular",
    eyebrow: "MODELO 3D ISOLADO",
    description: "Forma externa do globo ocular em rotação livre, com aproximação contínua.",
    path: "/medicine/models/zanatomy-organ-eye-v1.glb",
    sourceId: "zanatomy-models",
    material: "eye",
    rotateX: -Math.PI / 2,
  },
  {
    id: "visual-brain",
    journeyId: "eye",
    name: "Encéfalo e visão",
    eyebrow: "INTEGRAÇÃO VISUAL 3D",
    description: "Encéfalo isolado para relacionar a entrada visual ao processamento no sistema nervoso central.",
    path: "/medicine/models/zanatomy-organ-brain-v1.glb",
    sourceId: "zanatomy-models",
    material: "brain",
    rotateX: -Math.PI / 2,
  },
  {
    id: "oral-cavity-3d",
    journeyId: "oral",
    name: "Cavidade oral",
    eyebrow: "CONJUNTO ORAL 3D",
    description: "Língua, gengiva, palato mole e úvula preservados como malhas anatômicas independentes.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Tongue", "Gingiva", "Soft palate", "Uvula of palate"],
    material: "oral",
  },
  {
    id: "tongue-3d",
    journeyId: "oral",
    name: "Língua",
    eyebrow: "LÍNGUA ISOLADA 3D",
    description: "Volume externo da língua isolado para observar dorso, ápice, margens e relações gerais.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Tongue"],
    material: "tongue",
  },
  {
    id: "salivary-glands-3d",
    journeyId: "oral",
    name: "Glândulas salivares",
    eyebrow: "SECREÇÃO SALIVAR 3D",
    description: "Parótidas, submandibulares, sublinguais e seus ductos em uma vista espacial integrada.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Parotid gland", "Parotid duct", "Submandibular gland", "Submandibular duct", "Sublingual gland"],
    material: "salivary",
  },
  {
    id: "teeth-3d",
    journeyId: "oral",
    name: "Dentição",
    eyebrow: "DENTES E ARCOS 3D",
    description: "Dentição superior e inferior preservada do modelo musculoesquelético licenciado.",
    path: "/medicine/models/zanatomy-musculoskeletal-v1.glb",
    sourceId: "zanatomy-models",
    includeNames: [
      "Upper medial incisor", "Upper lateral incisor", "Upper canine", "Upper first premolar", "Upper second premolar",
      "Upper first molar tooth", "Upper second molar tooth", "Lower medial incisor", "Lower lateral incisor", "Lower canine",
      "Lower first premolar", "Lower second premolar", "Lower first molar tooth", "Lower second molar tooth",
    ],
    material: "teeth",
  },
];

export function histology3DModelsFor(journeyId: SensoryJourneyId) {
  return histology3DModels.filter((model) => model.journeyId === journeyId);
}

export function histology3DModelById(id: string) {
  return histology3DModels.find((model) => model.id === id);
}
