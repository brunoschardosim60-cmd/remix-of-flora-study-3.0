import { anatomy3DAssets } from "./anatomy3DAssetRegistry";
import { anatomy3DStructures, type Anatomy3DRegionId, type Anatomy3DStructure } from "./anatomy3DModel";

export type AnatomyPartGroup = "Órgãos" | "Ossos e articulações" | "Músculos";
export type AnatomyPartLayer = "organs" | "skeletal" | "muscular";
export interface AnatomyPartEntry {
  id: string;
  label: string;
  group: AnatomyPartGroup;
  layer: AnatomyPartLayer;
  regionId: Anatomy3DRegionId;
  structureId?: string;
  /** Fallback framing only. Prefer bounds of the extracted geometry when available. */
  focus: [number, number, number];
  focusDistance: number;
  representation: "dedicated-organ" | "atlas-subset";
  sourceLabel: "Peça dedicada" | "Recorte do atlas";
  sourceId: string;
  assetPaths: readonly string[];
  description: string;
  studyTargets: readonly string[];
}

type PartDefinition = Pick<AnatomyPartEntry, "id" | "label" | "layer" | "studyTargets"> &
  Partial<Omit<AnatomyPartEntry, "id" | "label" | "layer" | "studyTargets" | "group" | "sourceLabel">> & {
    include: RegExp;
    exclude?: RegExp;
  };

const hdLocomotorPath = "/medicine/models/zanatomy-musculoskeletal-hd-v2.glb";
const organBasePath = anatomy3DAssets.organs.path;

// Each entry is backed by a registered GLB or a named subset of its meshes.
// These are not additional specimens, scanned textures, or spatial clipping masks.
const definitions: readonly PartDefinition[] = [
  { id: "heart", label: "Coração", layer: "organs", structureId: "organ-heart", representation: "dedicated-organ", sourceId: "zAnatomyOrgan3D", assetPaths: [anatomy3DAssets.heartExterior.path, anatomy3DAssets.heartInterior.path], include: /\bheart\b|\bcoracao\b/, description: "Peças dedicadas externa e interna; as câmaras e valvas possuem malhas identificadas.", studyTargets: ["Faces e grandes vasos", "Câmaras cardíacas", "Valvas e septo"] },
  { id: "brain", label: "Encéfalo", layer: "organs", structureId: "organ-brain", representation: "dedicated-organ", sourceId: "nihHraBrain3D", assetPaths: [anatomy3DAssets.brainDetailed.path], include: /\bbrain\b|encefalo|cerebr|cerebel/, description: "Peça segmentada do Human Reference Atlas, carregada para estudo isolado.", studyTargets: ["Orientação dos hemisférios", "Regiões e subdivisões", "Relações entre segmentos"] },
  { id: "lungs", label: "Pulmões", layer: "organs", structureId: "organ-lungs", representation: "dedicated-organ", sourceId: "nihHraLung3D", assetPaths: [anatomy3DAssets.lungsDetailed.path], include: /\blung|pulma|pulmo/, description: "Peça pulmonar segmentada do Human Reference Atlas.", studyTargets: ["Lados direito e esquerdo", "Lobos e fissuras", "Faces e hilo"] },
  { id: "liver", label: "Fígado", layer: "organs", structureId: "organ-liver", representation: "dedicated-organ", sourceId: "nihHraLiver3D", assetPaths: [anatomy3DAssets.liverDetailed.path], include: /\bliver\b|figado/, description: "Peça hepática dedicada do Human Reference Atlas.", studyTargets: ["Faces e bordas", "Divisões anatômicas", "Relações viscerais"] },
  { id: "kidneys", label: "Rins", layer: "organs", structureId: "organ-kidneys", representation: "dedicated-organ", sourceId: "nihHraKidney3D", assetPaths: [anatomy3DAssets.kidneyLeftDetailed.path, anatomy3DAssets.kidneyRightDetailed.path], include: /\bkidney|\brim\b|\brins\b/, description: "Peças dedicadas dos rins direito e esquerdo do Human Reference Atlas.", studyTargets: ["Lateralidade", "Polos e faces", "Hilo e segmentos"] },
  { id: "eye", label: "Olho", layer: "organs", structureId: "organ-eyes", representation: "dedicated-organ", sourceId: "zAnatomyOrgan3D", assetPaths: ["/medicine/models/zanatomy-organ-eye-v1.glb"], include: /\beye\b|eyeball|\bolho|ocular bulb/, description: "Peça ocular dedicada do Z-Anatomy; não é uma esfera geométrica substituta.", studyTargets: ["Orientação do globo", "Camadas disponíveis", "Segmentos anterior e posterior"] },
  { id: "spleen", label: "Baço", layer: "organs", structureId: "model:organs:supplement:spleen", representation: "dedicated-organ", sourceId: "zAnatomyOrgan3D", assetPaths: ["/medicine/models/zanatomy-organ-spleen-v1.glb"], regionId: "abdomen", focus: [-.48, .42, .02], focusDistance: 2, include: /\bspleen\b|\bbaco\b/, description: "Peça esplênica dedicada do Z-Anatomy.", studyTargets: ["Polos e margens", "Face visceral", "Orientação do hilo"] },
  { id: "stomach", label: "Estômago", layer: "organs", structureId: "organ-stomach", include: /stomach|estomago/, studyTargets: ["Curvaturas", "Regiões do estômago", "Relações com duodeno"] },
  { id: "pancreas", label: "Pâncreas", layer: "organs", structureId: "organ-pancreas", representation: "dedicated-organ", sourceId: "nihHraPancreas3D", assetPaths: [anatomy3DAssets.pancreasDetailed.path], include: /pancreas/, description: "Peça pancreática dedicada do Human Reference Atlas, com cinco malhas segmentadas.", studyTargets: ["Cabeça, corpo e cauda", "Orientação espacial", "Segmentos disponíveis"] },
  { id: "large-intestine", label: "Intestino grosso", layer: "organs", structureId: "organ-large-intestine", representation: "dedicated-organ", sourceId: "nihHraLargeIntestine3D", assetPaths: [anatomy3DAssets.largeIntestineDetailed.path], regionId: "abdomen", focus: [0, .1, .08], focusDistance: 3.4, include: /large intestine|intestino grosso|\bcolon\b|cecum|\bceco\b|rectum|\breto\b/, description: "Peça dedicada do intestino grosso do Human Reference Atlas. Não substitui o intestino delgado.", studyTargets: ["Ceco e cólon", "Segmentos do intestino grosso", "Orientação abdominal"] },
  { id: "intestines", label: "Intestinos", layer: "organs", structureId: "organ-intestines", include: /intestin|\bcolon\b|duoden|jejun|ileum|\bileo\b|cecum|\bceco\b|appendix|apendice|rectum|\breto\b/, studyTargets: ["Intestino delgado e grosso", "Segmentos disponíveis", "Continuidade do tubo digestivo"] },
  { id: "bladder", label: "Bexiga", layer: "organs", structureId: "organ-bladder", include: /urinary bladder|bexiga/, studyTargets: ["Forma e posição", "Faces e ápice", "Relações pélvicas"] },

  { id: "skull", label: "Crânio", layer: "skeletal", structureId: "bone-skull", include: /cranium|cranio|skull|parietal|frontal bone|osso frontal|temporal bone|osso temporal|occipital|sphenoid|esfenoide|ethmoid|etmoide|maxilla|maxila|mandib|zygomatic|zigomatic|palatine bone|osso palatino|nasal bone|osso nasal|lacrimal bone|osso lacrimal|vomer|inferior nasal concha|concha nasal inferior/, studyTargets: ["Neurocrânio e face", "Ossos pares e ímpares", "Suturas e acidentes ósseos"] },
  { id: "spine", label: "Coluna vertebral", layer: "skeletal", structureId: "bone-spine", include: /vertebr|\batlas\b|\baxis\b|sacrum|\bsacro\b|coccy|coccix|intervertebral disc|disco intervertebral/, studyTargets: ["Regiões da coluna", "Atlas e áxis", "Sacro e cóccix"] },
  { id: "ribcage", label: "Caixa torácica", layer: "skeletal", structureId: "bone-ribs", include: /\brib\b|\bribs\b|costela|sternum|esterno|costal cartilage|cartilagem costal|manubrium|manubrio|xiphoid|xifoide/, studyTargets: ["Costelas e esterno", "Cartilagens costais", "Orientação da caixa torácica"] },
  { id: "shoulder", label: "Cintura escapular", layer: "skeletal", regionId: "upper-limb", focus: [0, 2, 0], focusDistance: 4.6, include: /scapula|escapula|clavicl|clavicula/, description: "Escápulas e clavículas extraídas do atlas; não é uma articulação independente ou um corte do ombro.", studyTargets: ["Escápula", "Clavícula", "Orientação da cintura escapular"] },
  { id: "humerus", label: "Úmero", layer: "skeletal", structureId: "bone-humerus", include: /\bhumerus\b|\bumero\b/, studyTargets: ["Epífises", "Diáfise", "Lateralidade"] },
  { id: "forearm", label: "Rádio e ulna", layer: "skeletal", structureId: "bone-forearm", include: /\bradius\b|\bradio\b|\bulna\b/, studyTargets: ["Rádio", "Ulna", "Relação entre os dois ossos"] },
  { id: "hand", label: "Mãos e punhos", layer: "skeletal", regionId: "upper-limb", focus: [0, -.8, .08], focusDistance: 5.4, include: /carpal|carpo|metacarp|scaphoid|escafoide|lunate|semilunar|triquetr|piramidal|pisiform|trapezium|trapezoid|capitate|capitato|hamate|hamato|phalanx.*(hand|finger)|falange.*(mao|dedo da mao)/, studyTargets: ["Ossos do carpo", "Metacarpos", "Falanges da mão"] },
  { id: "pelvis", label: "Pelve óssea", layer: "skeletal", structureId: "bone-pelvis", include: /hip bone|osso.*quadril|coxal|ilium|\bilio\b|ischium|isquio|pubis|sacrum|\bsacro\b|coccy|coccix/, studyTargets: ["Ossos do quadril", "Sacro e cóccix", "Aberturas e acidentes ósseos"] },
  { id: "femur", label: "Fêmur", layer: "skeletal", structureId: "bone-femur", include: /\bfemur\b/, studyTargets: ["Cabeça e colo", "Diáfise", "Côndilos"] },
  { id: "knee", label: "Patelas", layer: "skeletal", regionId: "lower-limb", focus: [0, -2.5, .05], focusDistance: 3, include: /\bpatella\b|\bpatela\b/, description: "Patelas direita e esquerda extraídas do atlas. Este recorte não representa a articulação completa do joelho.", studyTargets: ["Faces articulares", "Base e ápice", "Orientação anterior e posterior"] },
  { id: "lower-leg", label: "Tíbia e fíbula", layer: "skeletal", structureId: "bone-lower-leg", include: /\btibia\b|\bfibula\b/, studyTargets: ["Tíbia", "Fíbula", "Maléolos"] },
  { id: "foot", label: "Pés e tornozelos", layer: "skeletal", regionId: "lower-limb", focus: [0, -4.1, .2], focusDistance: 3.7, include: /tarsal|tarso|metatars|\btalus\b|\btalo\b|calcane|navicular|cuneiform|cuboid|cuboide|phalanx.*(foot|toe)|falange.*(pe|dedo do pe)/, studyTargets: ["Tarso", "Metatarsos", "Falanges do pé"] },

  { id: "deltoid", label: "Deltoide", layer: "muscular", structureId: "muscle-deltoid", include: /deltoid|deltoide/, studyTargets: ["Porções disponíveis", "Forma do músculo", "Orientação no ombro"] },
  { id: "biceps", label: "Bíceps braquial", layer: "muscular", structureId: "muscle-biceps", include: /biceps.*brach|biceps.*braquial/, studyTargets: ["Cabeças musculares", "Ventre muscular", "Orientação do braço"] },
  { id: "triceps", label: "Tríceps braquial", layer: "muscular", regionId: "upper-limb", focus: [0, 1.1, -.2], focusDistance: 5, include: /triceps.*brach|triceps.*braquial/, studyTargets: ["Cabeças musculares", "Ventre muscular", "Orientação posterior"] },
  { id: "pectoralis", label: "Peitoral maior", layer: "muscular", structureId: "muscle-pectoralis", include: /pectoralis major|peitoral maior/, studyTargets: ["Porções disponíveis", "Distribuição das fibras", "Orientação torácica"] },
  { id: "rectus-abdominis", label: "Reto do abdome", layer: "muscular", structureId: "muscle-rectus", include: /rectus abdominis|reto.*abdome/, studyTargets: ["Pares musculares", "Interseções visíveis", "Parede abdominal"] },
  { id: "quadriceps", label: "Quadríceps", layer: "muscular", structureId: "muscle-quadriceps", include: /quadriceps|rectus femoris|reto femoral|vastus (medialis|lateralis|intermedius)|vasto (medial|lateral|intermedio)/, studyTargets: ["Reto femoral", "Vastos", "Orientação da coxa"] },
  { id: "calf", label: "Gastrocnêmio", layer: "muscular", structureId: "muscle-calf", include: /gastrocnem/, studyTargets: ["Cabeças medial e lateral", "Ventre muscular", "Orientação posterior da perna"] },
  { id: "trapezius", label: "Trapézio", layer: "muscular", structureId: "muscle-trapezius", include: /trapezius|trapezio/, studyTargets: ["Porções disponíveis", "Distribuição das fibras", "Orientação do dorso"] },
  { id: "gluteus", label: "Glúteo máximo", layer: "muscular", structureId: "muscle-gluteus", include: /gluteus maximus|gluteo maximo/, studyTargets: ["Volume muscular", "Orientação da pelve", "Limites da peça"] },
  { id: "diaphragm", label: "Diafragma", layer: "muscular", regionId: "thorax", focus: [0, .8, 0], focusDistance: 3.4, include: /diaphragm|diafragma/, studyTargets: ["Cúpulas", "Centro tendíneo disponível", "Orientação toracoabdominal"] },
];

export const anatomyPartGroups: readonly AnatomyPartGroup[] = ["Órgãos", "Ossos e articulações", "Músculos"];

export const anatomyPartLibrary: readonly AnatomyPartEntry[] = definitions.map((definition) => {
  const guided = anatomy3DStructures.find((structure) => structure.id === definition.structureId);
  const representation = definition.representation ?? "atlas-subset";
  return {
    id: definition.id,
    label: definition.label,
    group: definition.layer === "organs" ? "Órgãos" : definition.layer === "skeletal" ? "Ossos e articulações" : "Músculos",
    layer: definition.layer,
    regionId: definition.regionId ?? guided?.regionId ?? "whole",
    structureId: definition.structureId,
    focus: definition.focus ?? guided?.focus ?? [0, 0, 0],
    focusDistance: definition.focusDistance ?? guided?.focusDistance ?? 4,
    representation,
    sourceLabel: representation === "dedicated-organ" ? "Peça dedicada" : "Recorte do atlas",
    sourceId: definition.sourceId ?? (definition.layer === "organs" ? "vayuAnatomy3D" : "zAnatomy3D"),
    assetPaths: definition.assetPaths ?? (definition.layer === "organs" ? [organBasePath] : [hdLocomotorPath, definition.layer === "muscular" ? anatomy3DAssets.bodyBase.path : anatomy3DAssets.skeletalBase.path]),
    description: definition.description ?? "Conjunto de malhas identificadas e isoladas do atlas existente, sem cortar ou deformar a anatomia.",
    studyTargets: definition.studyTargets,
  };
});

const definitionsById = new Map(definitions.map((entry) => [entry.id, entry]));
const libraryById = new Map(anatomyPartLibrary.map((entry) => [entry.id, entry]));

export function anatomyPartById(id?: string | null) {
  return id ? libraryById.get(id) : undefined;
}

function normalizePartName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[_\s]+/g, " ").trim();
}

/** Resolves every matching mesh, keeping bilateral parts and multipart muscles together. */
export function resolvePartCatalog(partOrId: AnatomyPartEntry | string, catalog: readonly Anatomy3DStructure[]): Anatomy3DStructure[] {
  const definition = definitionsById.get(typeof partOrId === "string" ? partOrId : partOrId.id);
  if (!definition) return [];
  return catalog.filter((structure) => {
    if (structure.layer !== definition.layer) return false;
    if (structure.id === definition.structureId) return true;
    if (definition.layer === "organs") {
      if (definition.id === "heart" && structure.id.startsWith("model:heart:")) return true;
      if (definition.id === "brain" && structure.id.startsWith("model:hra:brain:")) return true;
      if (definition.id === "lungs" && structure.id.startsWith("model:hra:lungs:")) return true;
      if (definition.id === "liver" && structure.id.startsWith("model:hra:liver:")) return true;
      if (definition.id === "kidneys" && structure.id.startsWith("model:hra:kidney-")) return true;
      if (definition.id === "pancreas" && structure.id.startsWith("model:hra:pancreas:")) return true;
      if (definition.id === "large-intestine" && structure.id.startsWith("model:hra:large-intestine:")) return true;
    }
    // Source names are the authoritative anatomical names; display labels may be shortened.
    const text = normalizePartName(structure.sourceName || structure.name);
    // Z-Anatomy calls toes "finger of foot" too; "finger" alone is not a hand identifier.
    if (definition.id === "hand" && /\b(foot|toe|pe)\b/.test(text)) return false;
    if (definition.id === "foot" && /\b(hand|mao)\b/.test(text)) return false;
    if (definition.exclude?.test(text)) return false;
    // Do not accidentally include attachment overlays, fasciae or named adjacent vessels.
    if (definition.layer === "muscular" && /fascia|bursa|ligament|arter|vein|veia|nerv/.test(text)) return false;
    if (definition.layer === "skeletal" && /muscle|musculo|arter|vein|veia|nerv/.test(text)) return false;
    return definition.include.test(text);
  });
}

/** Search is accent-insensitive and does not require the 3D assets to load. */
export function searchAnatomyParts(query: string, group?: AnatomyPartGroup): AnatomyPartEntry[] {
  const tokens = normalizePartName(query).split(" ").filter(Boolean);
  return anatomyPartLibrary.filter((part) => {
    if (group && part.group !== group) return false;
    const text = normalizePartName(`${part.label} ${part.group} ${part.studyTargets.join(" ")}`);
    return tokens.every((token) => text.includes(token));
  });
}
