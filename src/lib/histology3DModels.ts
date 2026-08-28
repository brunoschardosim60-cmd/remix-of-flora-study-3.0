import type { SensoryJourneyId } from "./sensoryOrgansData";

export type Histology3DMaterial =
  | "eye" | "brain" | "tongue" | "salivary" | "oral" | "teeth"
  | "heart" | "spleen" | "liver" | "lung" | "kidney" | "pancreas" | "thyroid" | "stomach";

export interface Histology3DModel {
  id: string;
  journeyId: SensoryJourneyId;
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
  {
    id: "heart-3d",
    journeyId: "cell",
    name: "Coração",
    eyebrow: "ÓRGÃO MUSCULAR 3D",
    description: "Coração isolado para relacionar sua forma externa ao miocárdio e às lâminas de músculo cardíaco.",
    path: "/medicine/models/zanatomy-organ-heart-v1.glb",
    sourceId: "zanatomy-models",
    material: "heart",
    rotateX: -Math.PI / 2,
  },
  {
    id: "spleen-3d",
    journeyId: "cell",
    name: "Baço",
    eyebrow: "ÓRGÃO LINFOIDE 3D",
    description: "Baço isolado para observar forma, faces e relações antes de aprofundar o tecido linfoide.",
    path: "/medicine/models/zanatomy-organ-spleen-v1.glb",
    sourceId: "zanatomy-models",
    material: "spleen",
    rotateX: -Math.PI / 2,
  },
  {
    id: "liver-3d",
    journeyId: "cell",
    name: "Fígado",
    eyebrow: "PARÊNQUIMA HEPÁTICO 3D",
    description: "Fígado isolado do conjunto visceral para relacionar lobos, superfície e organização histológica hepática.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Liver"],
    material: "liver",
  },
  {
    id: "lungs-3d",
    journeyId: "cell",
    name: "Pulmões",
    eyebrow: "PARÊNQUIMA RESPIRATÓRIO 3D",
    description: "Cinco lobos pulmonares isolados para conectar sua organização espacial aos tecidos respiratórios.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: [
      "Inferior lobe of left lung", "Superior lobe of left lung", "Inferior lobe of right lung",
      "Middle lobe of right lung", "Superior lobe of right lung",
    ],
    material: "lung",
  },
  {
    id: "kidneys-3d",
    journeyId: "cell",
    name: "Rins",
    eyebrow: "PARÊNQUIMA RENAL 3D",
    description: "Rins direito e esquerdo isolados para relacionar posição, contorno e organização microscópica renal.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Kidney"],
    material: "kidney",
  },
  {
    id: "pancreas-3d",
    journeyId: "cell",
    name: "Pâncreas",
    eyebrow: "TECIDO GLANDULAR 3D",
    description: "Pâncreas isolado para relacionar a anatomia macroscópica aos ácinos e às ilhotas pancreáticas.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Pancreas"],
    material: "pancreas",
  },
  {
    id: "thyroid-3d",
    journeyId: "cell",
    name: "Tireoide",
    eyebrow: "GLÂNDULA ENDÓCRINA 3D",
    description: "Tireoide isolada para observar sua forma bilobada antes de explorar os folículos ao microscópio.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Thyroid gland"],
    material: "thyroid",
  },
  {
    id: "stomach-3d",
    journeyId: "cell",
    name: "Estômago",
    eyebrow: "PAREDE DIGESTIVA 3D",
    description: "Estômago isolado para conectar sua forma e regiões às camadas histológicas da parede digestiva.",
    path: organModel,
    sourceId: "zanatomy-models",
    includeNames: ["Stomach"],
    material: "stomach",
  },
];

export function histology3DModelsFor(journeyId: SensoryJourneyId) {
  return histology3DModels.filter((model) => model.journeyId === journeyId);
}

export function histology3DModelById(id: string) {
  return histology3DModels.find((model) => model.id === id);
}
