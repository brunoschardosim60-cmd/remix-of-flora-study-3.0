import type { BodyLayer } from "./medicineData";

export type Anatomy3DRegionId = "whole" | "head" | "thorax" | "abdomen" | "pelvis" | "upper-limb" | "lower-limb";
export type Anatomy3DSystemId = "all" | BodyLayer;

export type Anatomy3DPart =
  | { kind: "sphere"; position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; color?: string }
  | { kind: "capsule"; position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; color?: string }
  | { kind: "cylinder"; position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; color?: string }
  | { kind: "box"; position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; color?: string }
  | { kind: "torus"; position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; color?: string }
  | { kind: "tube"; points: Array<[number, number, number]>; radius: number; color?: string };

export interface Anatomy3DStructure {
  id: string;
  name: string;
  latin?: string;
  layer: BodyLayer;
  regionId: Anatomy3DRegionId;
  region: string;
  system: string;
  summary: string;
  function: string;
  sourceId: string;
  focus: [number, number, number];
  focusDistance: number;
  color: string;
  parts: Anatomy3DPart[];
}

export interface Anatomy3DRegion {
  id: Anatomy3DRegionId;
  label: string;
  shortLabel: string;
  focus: [number, number, number];
  distance: number;
}

const sphere = (position: [number, number, number], scale: [number, number, number], color?: string): Anatomy3DPart => ({ kind: "sphere", position, scale, color });
const capsule = (position: [number, number, number], scale: [number, number, number], rotation?: [number, number, number], color?: string): Anatomy3DPart => ({ kind: "capsule", position, scale, rotation, color });
const cylinder = (position: [number, number, number], scale: [number, number, number], rotation?: [number, number, number], color?: string): Anatomy3DPart => ({ kind: "cylinder", position, scale, rotation, color });
const torus = (position: [number, number, number], scale: [number, number, number], rotation?: [number, number, number], color?: string): Anatomy3DPart => ({ kind: "torus", position, scale, rotation, color });
const tube = (points: Array<[number, number, number]>, radius: number, color?: string): Anatomy3DPart => ({ kind: "tube", points, radius, color });

export const anatomy3DRegions: Anatomy3DRegion[] = [
  { id: "whole", label: "Corpo completo", shortLabel: "Completo", focus: [0, -0.15, 0], distance: 15.8 },
  { id: "head", label: "Cabeça e cérebro", shortLabel: "Cabeça", focus: [0, 3.35, 0], distance: 2.65 },
  { id: "thorax", label: "Tórax", shortLabel: "Tórax", focus: [0, 1.5, 0], distance: 5.1 },
  { id: "abdomen", label: "Abdome", shortLabel: "Abdome", focus: [0, 0.25, 0], distance: 3.45 },
  { id: "pelvis", label: "Pelve", shortLabel: "Pelve", focus: [0, -0.75, 0], distance: 3.15 },
  { id: "upper-limb", label: "Membro superior", shortLabel: "Braço", focus: [1.55, 0.65, 0], distance: 6.2 },
  { id: "lower-limb", label: "Membro inferior", shortLabel: "Perna", focus: [0.48, -2.65, 0], distance: 6.1 },
];

export const anatomy3DSystemMeta: Array<{ id: Anatomy3DSystemId; label: string; description: string; color: string }> = [
  { id: "all", label: "Todas as camadas", description: "Visão integrada e translúcida", color: "#6b8f83" },
  { id: "surface", label: "Superfície", description: "Forma externa e regiões", color: "#d8a88c" },
  { id: "muscular", label: "Músculos", description: "Grupos musculares principais", color: "#b94d4f" },
  { id: "skeletal", label: "Esqueleto", description: "Ossos e eixos de suporte", color: "#d8c9aa" },
  { id: "vascular", label: "Vasos", description: "Artérias e veias principais", color: "#cb4f61" },
  { id: "nervous", label: "Nervos", description: "Encéfalo, medula e nervos", color: "#e5a942" },
  { id: "organs", label: "Órgãos", description: "Vísceras e relações espaciais", color: "#8f5878" },
];

export const anatomy3DStructures: Anatomy3DStructure[] = [
  {
    id: "surface-head", name: "Cabeça", layer: "surface", regionId: "head", region: "Cabeça e pescoço", system: "Tegumentar",
    summary: "Volume externo da cabeça usado como referência para planos, regiões e relações superficiais.", function: "Protege estruturas cranianas e oferece referências externas para orientação anatômica.", sourceId: "openstaxSkin", focus: [0, 3.45, 0], focusDistance: 2.4, color: "#d8a88c",
    parts: [sphere([0, 3.45, 0], [0.7, 0.88, 0.66]), capsule([0, 2.68, 0], [0.34, 0.34, 0.34])],
  },
  {
    id: "surface-thorax", name: "Tórax", layer: "surface", regionId: "thorax", region: "Tronco", system: "Superfície corporal",
    summary: "Região entre pescoço e abdome que envolve a cavidade torácica.", function: "Forma a parede externa que protege coração, pulmões e grandes vasos.", sourceId: "openstax", focus: [0, 1.55, 0], focusDistance: 3.1, color: "#d8a88c",
    parts: [sphere([0, 1.45, 0], [1.18, 1.45, 0.64])],
  },
  {
    id: "surface-abdomen", name: "Abdome", layer: "surface", regionId: "abdomen", region: "Tronco", system: "Superfície corporal",
    summary: "Região do tronco entre o tórax e a pelve.", function: "Reveste e contém grande parte dos órgãos digestórios e urinários.", sourceId: "openstax", focus: [0, 0.15, 0], focusDistance: 3.0, color: "#d8a88c",
    parts: [sphere([0, 0.15, 0], [0.98, 0.92, 0.58])],
  },
  {
    id: "surface-pelvis", name: "Pelve externa", layer: "surface", regionId: "pelvis", region: "Pelve", system: "Superfície corporal",
    summary: "Transição externa entre o tronco e os membros inferiores.", function: "Oferece referência para a cintura pélvica e estruturas perineais.", sourceId: "openstax", focus: [0, -0.65, 0], focusDistance: 2.8, color: "#d8a88c",
    parts: [sphere([0, -0.65, 0], [1.02, 0.64, 0.65])],
  },
  {
    id: "surface-upper-limb", name: "Membro superior", layer: "surface", regionId: "upper-limb", region: "Ombro, braço, antebraço e mão", system: "Superfície corporal",
    summary: "Volume externo dos membros superiores, bilateralmente.", function: "Permite localizar segmentos, articulações e referências palpáveis.", sourceId: "openstax", focus: [1.55, 0.75, 0], focusDistance: 4.0, color: "#d8a88c",
    parts: [capsule([1.45, 1.35, 0], [0.38, 0.95, 0.38], [0, 0, -0.12]), capsule([-1.45, 1.35, 0], [0.38, 0.95, 0.38], [0, 0, 0.12]), capsule([1.62, 0.03, 0], [0.3, 0.86, 0.3], [0, 0, -0.08]), capsule([-1.62, 0.03, 0], [0.3, 0.86, 0.3], [0, 0, 0.08]), sphere([1.68, -0.78, 0.08], [0.3, 0.4, 0.18]), sphere([-1.68, -0.78, 0.08], [0.3, 0.4, 0.18])],
  },
  {
    id: "surface-lower-limb", name: "Membro inferior", layer: "surface", regionId: "lower-limb", region: "Coxa, perna e pé", system: "Superfície corporal",
    summary: "Volume externo dos membros inferiores, bilateralmente.", function: "Permite orientar regiões de sustentação, locomoção e articulações.", sourceId: "openstax", focus: [0.48, -2.55, 0], focusDistance: 4.5, color: "#d8a88c",
    parts: [capsule([0.53, -1.62, 0], [0.5, 1.16, 0.5]), capsule([-0.53, -1.62, 0], [0.5, 1.16, 0.5]), capsule([0.53, -3.12, 0], [0.39, 1.0, 0.39]), capsule([-0.53, -3.12, 0], [0.39, 1.0, 0.39]), sphere([0.53, -4.15, 0.2], [0.42, 0.22, 0.72]), sphere([-0.53, -4.15, 0.2], [0.42, 0.22, 0.72])],
  },

  {
    id: "muscle-deltoid", name: "Músculo deltoide", latin: "Musculus deltoideus", layer: "muscular", regionId: "upper-limb", region: "Ombro", system: "Muscular",
    summary: "Músculo triangular que recobre a articulação do ombro.", function: "Participa principalmente da abdução do braço, além de flexão, extensão e rotação por suas porções.", sourceId: "openstaxMuscle", focus: [1.16, 1.93, 0], focusDistance: 2.5, color: "#c24f50",
    parts: [sphere([1.16, 1.93, 0], [0.42, 0.48, 0.5]), sphere([-1.16, 1.93, 0], [0.42, 0.48, 0.5])],
  },
  {
    id: "muscle-pectoralis", name: "Peitoral maior", latin: "Musculus pectoralis major", layer: "muscular", regionId: "thorax", region: "Parede anterior do tórax", system: "Muscular",
    summary: "Músculo superficial amplo da parede torácica anterior.", function: "Adduz e roda medialmente o braço; suas porções também participam da flexão e extensão a partir da flexão.", sourceId: "openstaxMuscle", focus: [0, 1.75, 0.48], focusDistance: 2.8, color: "#b94346",
    parts: [sphere([0.47, 1.72, 0.48], [0.6, 0.5, 0.22]), sphere([-0.47, 1.72, 0.48], [0.6, 0.5, 0.22])],
  },
  {
    id: "muscle-biceps", name: "Bíceps braquial", latin: "Musculus biceps brachii", layer: "muscular", regionId: "upper-limb", region: "Braço anterior", system: "Muscular",
    summary: "Músculo anterior do braço com duas cabeças proximais.", function: "Flexiona o cotovelo e contribui fortemente para a supinação do antebraço.", sourceId: "openstaxMuscle", focus: [1.45, 1.1, 0.25], focusDistance: 2.6, color: "#c65a55",
    parts: [capsule([1.44, 1.05, 0.22], [0.25, 0.57, 0.25], [0, 0, -0.1]), capsule([-1.44, 1.05, 0.22], [0.25, 0.57, 0.25], [0, 0, 0.1])],
  },
  {
    id: "muscle-rectus", name: "Reto do abdome", latin: "Musculus rectus abdominis", layer: "muscular", regionId: "abdomen", region: "Parede abdominal anterior", system: "Muscular",
    summary: "Par muscular vertical na parede abdominal anterior, dividido por interseções tendíneas.", function: "Flexiona o tronco e aumenta a pressão intra-abdominal.", sourceId: "openstaxMuscle", focus: [0, 0.35, 0.5], focusDistance: 2.5, color: "#b64b4b",
    parts: [-0.25, 0.25].flatMap((x) => [0.85, 0.45, 0.05, -0.35].map((y) => sphere([x, y, 0.51], [0.2, 0.22, 0.12]))),
  },
  {
    id: "muscle-quadriceps", name: "Quadríceps femoral", latin: "Musculus quadriceps femoris", layer: "muscular", regionId: "lower-limb", region: "Coxa anterior", system: "Muscular",
    summary: "Grupo muscular volumoso na região anterior da coxa.", function: "É o principal extensor do joelho; o reto femoral também participa da flexão do quadril.", sourceId: "openstaxMuscle", focus: [0.52, -1.75, 0.23], focusDistance: 3.0, color: "#c35450",
    parts: [capsule([0.52, -1.72, 0.22], [0.38, 0.82, 0.34]), capsule([-0.52, -1.72, 0.22], [0.38, 0.82, 0.34])],
  },
  {
    id: "muscle-calf", name: "Gastrocnêmio", latin: "Musculus gastrocnemius", layer: "muscular", regionId: "lower-limb", region: "Panturrilha posterior", system: "Muscular",
    summary: "Músculo superficial posterior da perna com duas cabeças.", function: "Realiza flexão plantar do tornozelo e auxilia a flexão do joelho.", sourceId: "openstaxMuscle", focus: [0.52, -3.1, -0.18], focusDistance: 2.8, color: "#b94b48",
    parts: [capsule([0.52, -3.05, -0.18], [0.31, 0.64, 0.28]), capsule([-0.52, -3.05, -0.18], [0.31, 0.64, 0.28])],
  },
  {
    id: "muscle-trapezius", name: "Trapézio", latin: "Musculus trapezius", layer: "muscular", regionId: "thorax", region: "Dorso superior", system: "Muscular",
    summary: "Músculo superficial amplo do pescoço posterior e dorso superior.", function: "Move e estabiliza a escápula e participa da extensão cervical.", sourceId: "openstaxMuscle", focus: [0, 1.95, -0.42], focusDistance: 2.8, color: "#a94447",
    parts: [sphere([0, 1.85, -0.48], [0.92, 0.72, 0.2])],
  },
  {
    id: "muscle-gluteus", name: "Glúteo máximo", latin: "Musculus gluteus maximus", layer: "muscular", regionId: "pelvis", region: "Região glútea", system: "Muscular",
    summary: "Grande músculo superficial da região glútea.", function: "Estende e roda lateralmente a coxa, contribuindo para subir, correr e levantar-se.", sourceId: "openstaxMuscle", focus: [0, -0.65, -0.52], focusDistance: 2.8, color: "#b6494c",
    parts: [sphere([0.48, -0.64, -0.5], [0.52, 0.52, 0.3]), sphere([-0.48, -0.64, -0.5], [0.52, 0.52, 0.3])],
  },

  {
    id: "bone-skull", name: "Crânio", latin: "Cranium", layer: "skeletal", regionId: "head", region: "Cabeça", system: "Esquelético",
    summary: "Conjunto ósseo que envolve o encéfalo e forma o esqueleto da face.", function: "Protege o encéfalo e sustenta estruturas da face e órgãos dos sentidos.", sourceId: "openstaxSkeleton", focus: [0, 3.48, 0], focusDistance: 2.3, color: "#dfd3b8",
    parts: [sphere([0, 3.5, 0], [0.63, 0.76, 0.59]), sphere([0, 3.05, 0.15], [0.4, 0.35, 0.36])],
  },
  {
    id: "bone-spine", name: "Coluna vertebral", latin: "Columna vertebralis", layer: "skeletal", regionId: "whole", region: "Eixo posterior do tronco", system: "Esquelético",
    summary: "Eixo segmentado formado por vértebras do pescoço ao sacro.", function: "Sustenta o corpo, permite movimento do tronco e protege a medula espinal.", sourceId: "openstaxSkeleton", focus: [0, 0.95, -0.22], focusDistance: 4.2, color: "#d8c9aa",
    parts: Array.from({ length: 19 }, (_, index) => cylinder([0, 2.6 - index * 0.18, -0.22], [0.16 + index * 0.003, 0.07, 0.16 + index * 0.003])),
  },
  {
    id: "bone-ribs", name: "Caixa torácica", latin: "Cavea thoracis", layer: "skeletal", regionId: "thorax", region: "Tórax", system: "Esquelético",
    summary: "Conjunto formado principalmente por costelas, esterno e vértebras torácicas.", function: "Protege vísceras torácicas e participa da mecânica respiratória.", sourceId: "openstaxSkeleton", focus: [0, 1.45, 0], focusDistance: 3.1, color: "#d8c9aa",
    parts: [2.05, 1.8, 1.55, 1.3, 1.05, 0.8].map((y, index) => torus([0, y, 0], [0.92 - index * 0.05, 0.5, 0.8], [Math.PI / 2, 0, 0])).concat([cylinder([0, 1.45, 0.43], [0.1, 0.78, 0.1])]),
  },
  {
    id: "bone-pelvis", name: "Cintura pélvica", latin: "Cingulum pelvicum", layer: "skeletal", regionId: "pelvis", region: "Pelve", system: "Esquelético",
    summary: "Anel ósseo que conecta a coluna aos membros inferiores.", function: "Transfere cargas ao membro inferior e protege estruturas pélvicas.", sourceId: "openstaxSkeleton", focus: [0, -0.55, 0], focusDistance: 2.8, color: "#d8c9aa",
    parts: [torus([0, -0.55, 0], [0.82, 0.5, 0.65], [Math.PI / 2, 0, 0]), sphere([0.58, -0.55, 0], [0.34, 0.38, 0.28]), sphere([-0.58, -0.55, 0], [0.34, 0.38, 0.28])],
  },
  {
    id: "bone-humerus", name: "Úmero", latin: "Humerus", layer: "skeletal", regionId: "upper-limb", region: "Braço", system: "Esquelético",
    summary: "Osso longo entre o ombro e o cotovelo.", function: "Funciona como alavanca e participa das articulações do ombro e cotovelo.", sourceId: "openstaxSkeleton", focus: [1.43, 1.15, 0], focusDistance: 2.7, color: "#d8c9aa",
    parts: [cylinder([1.43, 1.18, 0], [0.12, 0.72, 0.12], [0, 0, -0.11]), cylinder([-1.43, 1.18, 0], [0.12, 0.72, 0.12], [0, 0, 0.11])],
  },
  {
    id: "bone-forearm", name: "Rádio e ulna", latin: "Radius et ulna", layer: "skeletal", regionId: "upper-limb", region: "Antebraço", system: "Esquelético",
    summary: "Par de ossos longos do antebraço.", function: "Sustenta o antebraço e permite movimentos do cotovelo, punho e pronação-supinação.", sourceId: "openstaxSkeleton", focus: [1.62, 0.05, 0], focusDistance: 2.7, color: "#d8c9aa",
    parts: [cylinder([1.54, 0.05, 0.06], [0.075, 0.63, 0.075], [0, 0, -0.08]), cylinder([1.7, 0.05, -0.04], [0.07, 0.63, 0.07], [0, 0, -0.08]), cylinder([-1.54, 0.05, 0.06], [0.075, 0.63, 0.075], [0, 0, 0.08]), cylinder([-1.7, 0.05, -0.04], [0.07, 0.63, 0.07], [0, 0, 0.08])],
  },
  {
    id: "bone-femur", name: "Fêmur", latin: "Femur", layer: "skeletal", regionId: "lower-limb", region: "Coxa", system: "Esquelético",
    summary: "Osso longo da coxa, articulado com a pelve, tíbia e patela.", function: "Transmite carga e oferece alavancas para movimentos do quadril e joelho.", sourceId: "openstaxSkeleton", focus: [0.52, -1.72, 0], focusDistance: 3.0, color: "#d8c9aa",
    parts: [cylinder([0.52, -1.72, 0], [0.13, 0.9, 0.13]), cylinder([-0.52, -1.72, 0], [0.13, 0.9, 0.13])],
  },
  {
    id: "bone-lower-leg", name: "Tíbia e fíbula", latin: "Tibia et fibula", layer: "skeletal", regionId: "lower-limb", region: "Perna", system: "Esquelético",
    summary: "Par de ossos da perna entre joelho e tornozelo.", function: "A tíbia sustenta a maior parte da carga; a fíbula contribui para estabilidade e inserções musculares.", sourceId: "openstaxSkeleton", focus: [0.52, -3.08, 0], focusDistance: 3.0, color: "#d8c9aa",
    parts: [cylinder([0.46, -3.08, 0.03], [0.11, 0.78, 0.11]), cylinder([0.65, -3.08, -0.03], [0.065, 0.75, 0.065]), cylinder([-0.46, -3.08, 0.03], [0.11, 0.78, 0.11]), cylinder([-0.65, -3.08, -0.03], [0.065, 0.75, 0.065])],
  },

  {
    id: "vessel-heart", name: "Coração", latin: "Cor", layer: "vascular", regionId: "thorax", region: "Mediastino", system: "Cardiovascular",
    summary: "Órgão muscular central da circulação, representado com volume próprio no tórax.", function: "Bombeia sangue para as circulações pulmonar e sistêmica.", sourceId: "openstaxHeart", focus: [-0.1, 1.45, 0.2], focusDistance: 2.4, color: "#b83f4f",
    parts: [sphere([-0.1, 1.44, 0.2], [0.42, 0.55, 0.35], undefined)],
  },
  {
    id: "vessel-aorta", name: "Aorta", latin: "Aorta", layer: "vascular", regionId: "whole", region: "Tórax e abdome", system: "Cardiovascular",
    summary: "Maior artéria da circulação sistêmica, originada no ventrículo esquerdo.", function: "Distribui sangue da circulação sistêmica por seus ramos.", sourceId: "openstaxHeart", focus: [0.08, 0.75, 0.06], focusDistance: 4.2, color: "#d43e51",
    parts: [tube([[-0.08, 1.55, 0.1], [0.18, 1.9, 0.05], [0.28, 2.1, -0.05], [0.12, 2.25, -0.12], [0.08, 1.5, -0.1], [0.08, 0.5, -0.1], [0.02, -0.55, -0.08]], 0.085)],
  },
  {
    id: "vessel-vena-cava", name: "Veias cavas", latin: "Venae cavae", layer: "vascular", regionId: "whole", region: "Tórax e abdome", system: "Cardiovascular",
    summary: "Grandes veias que conduzem sangue sistêmico ao átrio direito.", function: "Retornam ao coração sangue proveniente das regiões superiores e inferiores do corpo.", sourceId: "openstaxHeart", focus: [-0.22, 0.8, -0.03], focusDistance: 4.0, color: "#3d74a8",
    parts: [tube([[-0.24, 2.45, -0.08], [-0.22, 1.7, -0.05], [-0.18, 1.45, 0.08]], 0.09), tube([[-0.18, 1.42, 0.08], [-0.2, 0.4, -0.05], [-0.18, -0.65, -0.08]], 0.1)],
  },
  {
    id: "vessel-carotids", name: "Artérias carótidas", latin: "Arteriae carotides", layer: "vascular", regionId: "head", region: "Pescoço e cabeça", system: "Cardiovascular",
    summary: "Pares arteriais que ascendem pelo pescoço em direção à cabeça.", function: "Contribuem para a irrigação do encéfalo, face e couro cabeludo.", sourceId: "openstax", focus: [0, 2.82, 0], focusDistance: 2.5, color: "#d44754",
    parts: [tube([[0.16, 1.95, 0], [0.18, 2.55, 0], [0.2, 3.0, 0.02]], 0.055), tube([[-0.16, 1.95, 0], [-0.18, 2.55, 0], [-0.2, 3.0, 0.02]], 0.055)],
  },
  {
    id: "vessel-subclavian", name: "Vasos subclávios e braquiais", layer: "vascular", regionId: "upper-limb", region: "Cintura escapular e braço", system: "Cardiovascular",
    summary: "Trajetos vasculares principais que seguem do tórax aos membros superiores.", function: "Transportam sangue de e para os membros superiores.", sourceId: "openstax", focus: [1.3, 1.15, 0], focusDistance: 3.7, color: "#d44754",
    parts: [tube([[0.1, 2.0, 0], [0.75, 1.95, 0], [1.25, 1.7, 0], [1.45, 0.8, 0], [1.62, -0.55, 0]], 0.055), tube([[-0.1, 2.0, 0], [-0.75, 1.95, 0], [-1.25, 1.7, 0], [-1.45, 0.8, 0], [-1.62, -0.55, 0]], 0.055)],
  },
  {
    id: "vessel-iliac", name: "Vasos ilíacos", layer: "vascular", regionId: "pelvis", region: "Pelve", system: "Cardiovascular",
    summary: "Bifurcações vasculares na transição entre abdome, pelve e membros inferiores.", function: "Distribuem e retornam sangue da pelve e dos membros inferiores.", sourceId: "openstax", focus: [0, -0.72, 0], focusDistance: 2.8, color: "#c94856",
    parts: [tube([[0.02, -0.35, 0], [0.38, -0.72, 0], [0.52, -1.0, 0]], 0.06), tube([[-0.02, -0.35, 0], [-0.38, -0.72, 0], [-0.52, -1.0, 0]], 0.06)],
  },
  {
    id: "vessel-femoral", name: "Vasos femorais", layer: "vascular", regionId: "lower-limb", region: "Coxa e perna", system: "Cardiovascular",
    summary: "Principais trajetos arteriais e venosos do membro inferior.", function: "Conduzem sangue entre a pelve e os segmentos distais dos membros inferiores.", sourceId: "openstax", focus: [0.5, -2.2, 0], focusDistance: 4.1, color: "#cf4554",
    parts: [tube([[0.5, -0.85, 0], [0.5, -2.0, 0], [0.45, -3.2, 0], [0.43, -3.95, 0]], 0.055), tube([[-0.5, -0.85, 0], [-0.5, -2.0, 0], [-0.45, -3.2, 0], [-0.43, -3.95, 0]], 0.055), tube([[0.62, -0.85, -0.05], [0.62, -2.0, -0.05], [0.58, -3.4, -0.05]], 0.045, "#3f78aa"), tube([[-0.62, -0.85, -0.05], [-0.62, -2.0, -0.05], [-0.58, -3.4, -0.05]], 0.045, "#3f78aa")],
  },

  {
    id: "nerve-brain", name: "Cérebro", latin: "Cerebrum", layer: "nervous", regionId: "head", region: "Cavidade craniana", system: "Nervoso",
    summary: "Maior porção do encéfalo, formada por dois hemisférios e extensa superfície cortical.", function: "Integra informação sensorial, movimento voluntário, linguagem, memória, emoção e funções cognitivas.", sourceId: "openstaxCns", focus: [0, 3.55, 0], focusDistance: 1.9, color: "#e3a248",
    parts: [sphere([0.28, 3.58, 0], [0.38, 0.52, 0.45], "#e6ad67"), sphere([-0.28, 3.58, 0], [0.38, 0.52, 0.45], "#e6ad67")],
  },
  {
    id: "nerve-cerebellum", name: "Cerebelo", latin: "Cerebellum", layer: "nervous", regionId: "head", region: "Fossa craniana posterior", system: "Nervoso",
    summary: "Parte posterior do encéfalo, inferior aos lobos occipitais.", function: "Coordena precisão do movimento, equilíbrio e aprendizagem motora.", sourceId: "openstaxCns", focus: [0, 3.2, -0.35], focusDistance: 1.75, color: "#d58e3e",
    parts: [sphere([0, 3.18, -0.38], [0.42, 0.28, 0.3], "#d99855")],
  },
  {
    id: "nerve-brainstem", name: "Tronco encefálico", latin: "Truncus encephali", layer: "nervous", regionId: "head", region: "Base do encéfalo", system: "Nervoso",
    summary: "Conexão entre o encéfalo superior e a medula espinal.", function: "Conduz vias nervosas e participa do controle de funções vitais e nervos cranianos.", sourceId: "openstaxCns", focus: [0, 3.0, 0], focusDistance: 1.7, color: "#e2a347",
    parts: [capsule([0, 2.98, 0], [0.17, 0.3, 0.17])],
  },
  {
    id: "nerve-spinal-cord", name: "Medula espinal", latin: "Medulla spinalis", layer: "nervous", regionId: "whole", region: "Canal vertebral", system: "Nervoso",
    summary: "Cordão do sistema nervoso central no interior do canal vertebral.", function: "Conduz sinais entre encéfalo e corpo e organiza circuitos reflexos.", sourceId: "openstaxCns", focus: [0, 1.0, -0.12], focusDistance: 4.0, color: "#e7b04e",
    parts: [tube([[0, 2.95, -0.08], [0, 2.2, -0.1], [0, 1.1, -0.12], [0, 0.0, -0.1], [0, -0.65, -0.08]], 0.075)],
  },
  {
    id: "nerve-brachial-plexus", name: "Plexo braquial", latin: "Plexus brachialis", layer: "nervous", regionId: "upper-limb", region: "Pescoço lateral e axila", system: "Nervoso",
    summary: "Rede nervosa que origina grande parte da inervação do membro superior.", function: "Distribui fibras motoras e sensitivas aos membros superiores.", sourceId: "openstaxCns", focus: [1.05, 1.85, -0.02], focusDistance: 2.8, color: "#e5a942",
    parts: [tube([[0.1, 2.25, -0.1], [0.6, 2.05, -0.05], [1.05, 1.8, 0]], 0.045), tube([[-0.1, 2.25, -0.1], [-0.6, 2.05, -0.05], [-1.05, 1.8, 0]], 0.045)],
  },
  {
    id: "nerve-arm", name: "Nervos do membro superior", layer: "nervous", regionId: "upper-limb", region: "Braço, antebraço e mão", system: "Nervoso",
    summary: "Trajetos periféricos principais que seguem do plexo braquial à mão.", function: "Conduzem comandos motores e informação sensitiva do membro superior.", sourceId: "openstaxCns", focus: [1.48, 0.65, 0], focusDistance: 3.5, color: "#e6ac43",
    parts: [tube([[1.05, 1.8, 0], [1.42, 1.0, 0], [1.58, 0.0, 0], [1.66, -0.72, 0]], 0.04), tube([[-1.05, 1.8, 0], [-1.42, 1.0, 0], [-1.58, 0.0, 0], [-1.66, -0.72, 0]], 0.04)],
  },
  {
    id: "nerve-sciatic", name: "Nervo isquiático", latin: "Nervus ischiadicus", layer: "nervous", regionId: "lower-limb", region: "Pelve e face posterior da coxa", system: "Nervoso",
    summary: "Grande nervo derivado do plexo sacral que percorre a região glútea e a coxa posterior.", function: "Reúne fibras destinadas a funções motoras e sensitivas de grande parte do membro inferior.", sourceId: "openstaxCns", focus: [0.52, -1.65, -0.25], focusDistance: 3.3, color: "#e6aa3f",
    parts: [tube([[0.18, -0.55, -0.1], [0.52, -1.1, -0.28], [0.52, -2.35, -0.28], [0.48, -3.0, -0.18]], 0.065), tube([[-0.18, -0.55, -0.1], [-0.52, -1.1, -0.28], [-0.52, -2.35, -0.28], [-0.48, -3.0, -0.18]], 0.065)],
  },
  {
    id: "nerve-leg", name: "Nervos da perna e pé", layer: "nervous", regionId: "lower-limb", region: "Perna e pé", system: "Nervoso",
    summary: "Ramos periféricos que seguem até tornozelo e pé.", function: "Conduzem sinais motores, sensitivos e autonômicos aos segmentos distais.", sourceId: "openstaxCns", focus: [0.5, -3.25, 0], focusDistance: 3.4, color: "#e6aa3f",
    parts: [tube([[0.48, -2.8, -0.18], [0.45, -3.55, -0.08], [0.46, -4.05, 0.18]], 0.04), tube([[-0.48, -2.8, -0.18], [-0.45, -3.55, -0.08], [-0.46, -4.05, 0.18]], 0.04)],
  },

  {
    id: "organ-brain", name: "Encéfalo", latin: "Encephalon", layer: "organs", regionId: "head", region: "Cavidade craniana", system: "Nervoso",
    summary: "Conjunto formado por cérebro, cerebelo e tronco encefálico.", function: "Integra informação, coordena respostas e participa da regulação homeostática.", sourceId: "openstaxCns", focus: [0, 3.526, -0.158], focusDistance: 1.65, color: "#c78586",
    parts: [sphere([0.25, 3.53, 0], [0.38, 0.52, 0.43]), sphere([-0.25, 3.53, 0], [0.38, 0.52, 0.43]), sphere([0, 3.15, -0.32], [0.38, 0.25, 0.27])],
  },
  {
    id: "organ-lungs", name: "Pulmões", latin: "Pulmones", layer: "organs", regionId: "thorax", region: "Cavidades pleurais", system: "Respiratório",
    summary: "Órgãos pares do tórax organizados em lobos ao redor do mediastino.", function: "Realizam ventilação e oferecem a interface para trocas gasosas com o sangue.", sourceId: "openstaxRespiratory", focus: [-0.004, 2.141, 0.054], focusDistance: 4.15, color: "#7299a2",
    parts: [capsule([0.48, 1.55, 0], [0.48, 0.78, 0.42], [0, 0, 0.08]), capsule([-0.48, 1.55, 0], [0.48, 0.78, 0.42], [0, 0, -0.08])],
  },
  {
    id: "organ-heart", name: "Coração", latin: "Cor", layer: "organs", regionId: "thorax", region: "Mediastino médio", system: "Cardiovascular",
    summary: "Órgão muscular oco situado entre os pulmões, com maior parte à esquerda da linha mediana.", function: "Mantém o fluxo sanguíneo pelas circulações pulmonar e sistêmica.", sourceId: "openstaxHeart", focus: [0.114, 2.105, 0.131], focusDistance: 1.85, color: "#b44255",
    parts: [sphere([-0.08, 1.42, 0.25], [0.38, 0.5, 0.34])],
  },
  {
    id: "organ-liver", name: "Fígado", latin: "Hepar", layer: "organs", regionId: "abdomen", region: "Hipocôndrio direito e epigástrio", system: "Digestório",
    summary: "Grande órgão abdominal predominantemente à direita, logo abaixo do diafragma.", function: "Participa do metabolismo, armazenamento, síntese de proteínas plasmáticas e produção de bile.", sourceId: "openstaxDigestive", focus: [-0.092, 1.487, 0.108], focusDistance: 3.2, color: "#8c5147",
    parts: [sphere([-0.28, 0.45, 0.18], [0.72, 0.38, 0.42])],
  },
  {
    id: "organ-stomach", name: "Estômago", latin: "Gaster", layer: "organs", regionId: "abdomen", region: "Epigástrio e hipocôndrio esquerdo", system: "Digestório",
    summary: "Órgão muscular dilatado entre esôfago e duodeno.", function: "Armazena, mistura e inicia etapas da digestão química do alimento.", sourceId: "openstaxDigestive", focus: [0.227, 1.51, 0.214], focusDistance: 2.3, color: "#b56d74",
    parts: [sphere([0.38, 0.25, 0.23], [0.38, 0.48, 0.28])],
  },
  {
    id: "organ-kidneys", name: "Rins", latin: "Renes", layer: "organs", regionId: "abdomen", region: "Retroperitônio abdominal", system: "Urinário",
    summary: "Órgãos pares localizados posteriormente no abdome, um de cada lado da coluna.", function: "Filtram plasma e regulam água, eletrólitos, equilíbrio ácido-base e outras funções homeostáticas.", sourceId: "openstaxKidney", focus: [-0.023, 1.183, -0.13], focusDistance: 2.9, color: "#855868",
    parts: [sphere([0.48, 0.05, -0.3], [0.22, 0.36, 0.2]), sphere([-0.48, 0.05, -0.3], [0.22, 0.36, 0.2])],
  },
  {
    id: "organ-intestines", name: "Intestinos", latin: "Intestina", layer: "organs", regionId: "abdomen", region: "Cavidade abdominal", system: "Digestório",
    summary: "Alças do intestino delgado envolvidas em parte pelo intestino grosso.", function: "Continuam a digestão, absorvem nutrientes, água e eletrólitos e formam o conteúdo fecal.", sourceId: "openstaxDigestive", focus: [0.019, 0.691, 0.239], focusDistance: 4.42, color: "#c28a78",
    parts: [torus([0, -0.12, 0.18], [0.62, 0.78, 0.36], [Math.PI / 2, 0, 0]), torus([0, -0.15, 0.22], [0.38, 0.5, 0.28], [Math.PI / 2, 0, 0])],
  },
  {
    id: "organ-bladder", name: "Bexiga urinária", latin: "Vesica urinaria", layer: "organs", regionId: "pelvis", region: "Pelve menor", system: "Urinário",
    summary: "Órgão muscular oco da pelve que recebe urina dos ureteres.", function: "Armazena urina até a micção.", sourceId: "openstaxKidney", focus: [0, -0.68, 0.18], focusDistance: 1.9, color: "#9b6b88",
    parts: [sphere([0, -0.68, 0.15], [0.27, 0.3, 0.25])],
  },
  {
    id: "organ-eyes", name: "Olhos", latin: "Oculi", layer: "organs", regionId: "head", region: "Órbitas", system: "Sentidos especiais",
    summary: "Órgãos pares da visão posicionados nas órbitas e conectados ao encéfalo pelas vias ópticas.", function: "Recebem luz, formam uma imagem sobre a retina e iniciam a transdução visual.", sourceId: "openstaxSenses", focus: [0, 3.48, 0.5], focusDistance: 1.5, color: "#7b96ac",
    parts: [sphere([0.26, 3.48, 0.5], [0.2, 0.2, 0.2]), sphere([-0.26, 3.48, 0.5], [0.2, 0.2, 0.2])],
  },
  {
    id: "organ-inner-ear", name: "Orelha interna", latin: "Auris interna", layer: "organs", regionId: "head", region: "Osso temporal", system: "Sentidos especiais",
    summary: "Conjunto sensorial profundo que reúne cóclea, vestíbulo e canais semicirculares.", function: "Participa da audição e da detecção de movimentos e posição da cabeça.", sourceId: "openstaxSenses", focus: [0.52, 3.3, 0.02], focusDistance: 1.55, color: "#8f77a8",
    parts: [torus([0.51, 3.3, 0.04], [0.24, 0.2, 0.18], [Math.PI / 2, 0, 0]), torus([-0.51, 3.3, 0.04], [0.24, 0.2, 0.18], [Math.PI / 2, 0, 0])],
  },
  {
    id: "organ-thyroid", name: "Glândula tireoide", latin: "Glandula thyroidea", layer: "organs", regionId: "head", region: "Pescoço anterior", system: "Endócrino",
    summary: "Glândula endócrina bilobada situada anteriormente à traqueia no pescoço inferior.", function: "Produz hormônios tireoidianos e calcitonina, participando da regulação metabólica e da homeostase do cálcio.", sourceId: "openstaxEndocrine", focus: [0, 2.56, 0.3], focusDistance: 1.65, color: "#9a6f91",
    parts: [sphere([0.18, 2.56, 0.3], [0.2, 0.3, 0.13]), sphere([-0.18, 2.56, 0.3], [0.2, 0.3, 0.13]), cylinder([0, 2.56, 0.3], [0.16, 0.07, 0.08])],
  },
  {
    id: "organ-pancreas", name: "Pâncreas", latin: "Pancreas", layer: "organs", regionId: "abdomen", region: "Abdome superior", system: "Digestório e endócrino",
    summary: "Órgão glandular alongado situado posteriormente ao estômago e relacionado ao duodeno.", function: "Produz enzimas digestivas e hormônios envolvidos no controle do metabolismo energético.", sourceId: "openstaxDigestive", focus: [0, 0.25, 0.02], focusDistance: 2.0, color: "#c99663",
    parts: [capsule([0, 0.25, 0.02], [0.2, 0.62, 0.16], [0, 0, Math.PI / 2])],
  },
  {
    id: "organ-uterus", name: "Útero", latin: "Uterus", layer: "organs", regionId: "pelvis", region: "Pelve menor", system: "Reprodutor",
    summary: "Órgão muscular mediano da pelve, conectado às tubas uterinas e ao canal vaginal pelo colo.", function: "Recebe o embrião implantado e sustenta o desenvolvimento durante a gestação.", sourceId: "openstaxReproductive", focus: [0, -0.66, 0.17], focusDistance: 1.55, color: "#aa6f82",
    parts: [sphere([0, -0.62, 0.17], [0.3, 0.34, 0.22]), cylinder([0, -0.92, 0.17], [0.1, 0.2, 0.1])],
  },
  {
    id: "organ-ovaries", name: "Ovários", latin: "Ovaria", layer: "organs", regionId: "pelvis", region: "Pelve", system: "Reprodutor",
    summary: "Gônadas pares posicionadas lateralmente ao útero e conectadas por ligamentos.", function: "Produzem oócitos e secretam hormônios que participam da regulação reprodutiva.", sourceId: "openstaxReproductive", focus: [0.48, -0.58, 0.13], focusDistance: 1.65, color: "#b98487",
    parts: [sphere([0.48, -0.58, 0.13], [0.15, 0.11, 0.1]), sphere([-0.48, -0.58, 0.13], [0.15, 0.11, 0.1]), tube([[-0.4, -0.56, 0.13], [-0.22, -0.48, 0.16], [0, -0.5, 0.17], [0.22, -0.48, 0.16], [0.4, -0.56, 0.13]], 0.035)],
  },
  {
    id: "organ-prostate", name: "Próstata", latin: "Prostata", layer: "organs", regionId: "pelvis", region: "Inferior à bexiga", system: "Reprodutor",
    summary: "Glândula posicionada inferiormente à bexiga e ao redor do segmento inicial da uretra.", function: "Produz secreção que integra o fluido seminal.", sourceId: "openstaxReproductive", focus: [0, -0.88, 0.2], focusDistance: 1.45, color: "#8c6a83",
    parts: [sphere([0, -0.88, 0.2], [0.24, 0.18, 0.2])],
  },
  {
    id: "organ-testes", name: "Testículos", latin: "Testes", layer: "organs", regionId: "pelvis", region: "Escroto", system: "Reprodutor",
    summary: "Gônadas pares localizadas no escroto e conectadas às vias espermáticas.", function: "Produzem espermatozoides e secretam hormônios androgênicos.", sourceId: "openstaxReproductive", focus: [0, -1.18, 0.22], focusDistance: 1.45, color: "#a98779",
    parts: [sphere([0.17, -1.18, 0.22], [0.14, 0.2, 0.13]), sphere([-0.17, -1.18, 0.22], [0.14, 0.2, 0.13])],
  },
];

export function structuresFor3D(system: Anatomy3DSystemId, region: Anatomy3DRegionId) {
  return anatomy3DStructures.filter((structure) => {
    const systemMatches = system === "all" || structure.layer === system;
    const regionMatches = region === "whole" || structure.regionId === region || structure.regionId === "whole";
    return systemMatches && regionMatches;
  });
}

const atlasOrgan3DMap: Record<string, string> = {
  brain: "organ-brain",
  heart: "organ-heart",
  lungs: "organ-lungs",
  liver: "organ-liver",
  stomach: "organ-stomach",
  kidneys: "organ-kidneys",
  duodenum: "organ-intestines",
  jejunum: "organ-intestines",
  ileum: "organ-intestines",
  cecum: "organ-intestines",
  "vermiform-appendix": "organ-intestines",
  "ascending-colon": "organ-intestines",
  "transverse-colon": "organ-intestines",
  "descending-colon": "organ-intestines",
  "sigmoid-colon": "organ-intestines",
  rectum: "organ-intestines",
  eyes: "organ-eyes",
  retina: "organ-eyes",
  "lens-eye": "organ-eyes",
  cochlea: "organ-inner-ear",
  "semicircular-canals": "organ-inner-ear",
  "thyroid-gland": "organ-thyroid",
  pancreas: "organ-pancreas",
  uterus: "organ-uterus",
  ovaries: "organ-ovaries",
  "uterine-tubes": "organ-ovaries",
  prostate: "organ-prostate",
  testes: "organ-testes",
};

/** Relaciona apenas estruturas cobertas por uma malha 3D anatômica disponível. */
export function organ3DStructureForAtlasId(atlasId: string) {
  return atlasOrgan3DMap[atlasId] ?? null;
}
