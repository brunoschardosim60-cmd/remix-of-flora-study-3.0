export type Anatomy3DAssetLoadMode = "base" | "system" | "organ";

export type Anatomy3DAssetDefinition = {
  id: string;
  path: string;
  loadMode: Anatomy3DAssetLoadMode;
  sourceId: string;
  license: string;
  expectedMinimumBytes: number;
  meshCount?: number;
  triangleCount?: number;
};

export type HeartMeshKind = "wall" | "chamber" | "septum" | "valve" | "papillary-muscle" | "vessel";

export type HeartMeshDefinition = {
  meshName: string;
  anatomicalId: string;
  name: string;
  latin: string;
  kind: HeartMeshKind;
  region: string;
  summary: string;
  function: string;
  aliases: string[];
  color: string;
  sourceId: string;
};

export const anatomy3DAssets = {
  bodyBase: {
    id: "muscular-base",
    path: "/medicine/models/vayu-zanatomy-muscular-v1.glb",
    loadMode: "base",
    sourceId: "vayuAnatomy3D",
    license: "CC BY-SA 4.0",
    expectedMinimumBytes: 5_430_000,
    meshCount: 419,
    structureCount: 692,
    triangleCount: 2_335_895,
  },
  skeletalBase: {
    id: "skeletal-base",
    path: "/medicine/models/vayu-zanatomy-skeletal-v1.glb",
    loadMode: "base",
    sourceId: "vayuAnatomy3D",
    license: "CC BY-SA 4.0",
    expectedMinimumBytes: 7_710_000,
    meshCount: 1_271,
    structureCount: 1_386,
    triangleCount: 1_916_818,
  },
  skinBase: {
    id: "skin-base",
    path: "/medicine/models/zanatomy-surface-hd-v2.glb",
    loadMode: "base",
    sourceId: "zAnatomy3D",
    license: "CC BY-SA 4.0",
    expectedMinimumBytes: 800_000,
    meshCount: 256,
    triangleCount: 135_204,
  },
  cardiovascular: {
    id: "cardiovascular",
    path: "/medicine/models/vayu-zanatomy-cardiovascular-v1.glb",
    loadMode: "system",
    sourceId: "vayuAnatomy3D",
    license: "CC BY-SA 4.0",
    expectedMinimumBytes: 9_600_000,
    meshCount: 680,
    structureCount: 680,
    triangleCount: 3_844_392,
  },
  nervous: {
    id: "nervous",
    path: "/medicine/models/vayu-zanatomy-nervous-sensory-v1.glb",
    loadMode: "system",
    sourceId: "vayuAnatomy3D",
    license: "CC BY-SA 4.0",
    expectedMinimumBytes: 5_500_000,
    meshCount: 483,
    structureCount: 613,
    triangleCount: 2_396_782,
  },
  organs: {
    id: "organs",
    path: "/medicine/models/vayu-human-internal-systems-v1.glb",
    loadMode: "system",
    sourceId: "vayuAnatomy3D",
    license: "CC BY-SA 4.0 + Slicer License",
    expectedMinimumBytes: 2_970_000,
    meshCount: 223,
    structureCount: 275,
    triangleCount: 1_059_085,
  },
  heartExterior: {
    id: "heart-exterior",
    path: "/medicine/models/zanatomy-organ-heart-v1.glb",
    loadMode: "organ",
    sourceId: "zAnatomyOrgan3D",
    license: "CC BY-SA 4.0",
    expectedMinimumBytes: 1_600_000,
    meshCount: 9,
    triangleCount: 538_040,
  },
  heartInterior: {
    id: "heart-interior",
    path: "/medicine/models/nih-hra-heart-interior-v1.glb",
    loadMode: "organ",
    sourceId: "nihHraHeart3D",
    license: "CC BY 4.0",
    expectedMinimumBytes: 1_700_000,
    meshCount: 14,
    triangleCount: 85_914,
  },
  brainDetailed: {
    id: "brain-detailed",
    path: "/medicine/models/nih-hra-brain-female-v1.glb",
    loadMode: "organ",
    sourceId: "nihHraBrain3D",
    license: "CC BY 4.0",
    expectedMinimumBytes: 11_900_000,
    meshCount: 283,
    triangleCount: 656_268,
  },
  lungsDetailed: {
    id: "lungs-detailed",
    path: "/medicine/models/nih-hra-lung-female-v1.glb",
    loadMode: "organ",
    sourceId: "nihHraLung3D",
    license: "CC BY 4.0",
    expectedMinimumBytes: 23_200_000,
    meshCount: 56,
    triangleCount: 297_097,
  },
  liverDetailed: {
    id: "liver-detailed",
    path: "/medicine/models/nih-hra-liver-female-v1.glb",
    loadMode: "organ",
    sourceId: "nihHraLiver3D",
    license: "CC BY 4.0",
    expectedMinimumBytes: 1_700_000,
    meshCount: 26,
    triangleCount: 93_303,
  },
  kidneyLeftDetailed: {
    id: "kidney-left-detailed",
    path: "/medicine/models/nih-hra-kidney-left-female-v1.glb",
    loadMode: "organ",
    sourceId: "nihHraKidney3D",
    license: "CC BY 4.0",
    expectedMinimumBytes: 1_300_000,
    meshCount: 15,
    triangleCount: 72_788,
  },
  kidneyRightDetailed: {
    id: "kidney-right-detailed",
    path: "/medicine/models/nih-hra-kidney-right-female-v1.glb",
    loadMode: "organ",
    sourceId: "nihHraKidney3D",
    license: "CC BY 4.0",
    expectedMinimumBytes: 1_350_000,
    meshCount: 14,
    triangleCount: 74_283,
  },
} as const satisfies Record<string, Anatomy3DAssetDefinition>;

export type HraDetailedOrganKind = "brain" | "lungs" | "liver" | "kidney-left" | "kidney-right";

export const hraDetailedOrganAssets: Record<HraDetailedOrganKind, {
  asset: Anatomy3DAssetDefinition;
  parentId: string;
  name: string;
  latin: string;
  system: string;
  regionId: "head" | "thorax" | "abdomen";
  region: string;
  color: string;
  target: [number, number, number];
  size: number;
}> = {
  brain: { asset: anatomy3DAssets.brainDetailed, parentId: "organ-brain", name: "Encéfalo detalhado", latin: "Encephalon", system: "Nervoso", regionId: "head", region: "Cavidade craniana", color: "#c9878e", target: [0, 3.35, 0], size: 1.22 },
  lungs: { asset: anatomy3DAssets.lungsDetailed, parentId: "organ-lungs", name: "Pulmões detalhados", latin: "Pulmones", system: "Respiratório", regionId: "thorax", region: "Cavidades pleurais", color: "#8e5360", target: [0, 2.25, 0], size: 1.62 },
  liver: { asset: anatomy3DAssets.liverDetailed, parentId: "organ-liver", name: "Fígado detalhado", latin: "Hepar", system: "Digestório", regionId: "abdomen", region: "Hipocôndrio direito e epigástrio", color: "#7f4037", target: [-.24, 1.16, .04], size: 1.18 },
  "kidney-left": { asset: anatomy3DAssets.kidneyLeftDetailed, parentId: "organ-kidneys", name: "Rim esquerdo detalhado", latin: "Ren sinister", system: "Urinário", regionId: "abdomen", region: "Retroperitônio esquerdo", color: "#80556b", target: [-.25, .72, 0], size: .72 },
  "kidney-right": { asset: anatomy3DAssets.kidneyRightDetailed, parentId: "organ-kidneys", name: "Rim direito detalhado", latin: "Ren dexter", system: "Urinário", regionId: "abdomen", region: "Retroperitônio direito", color: "#80556b", target: [.25, .72, 0], size: .72 },
};

export function detailedOrganKindsForSelection(anatomicalId?: string | null): HraDetailedOrganKind[] {
  if (!anatomicalId) return [];
  if (anatomicalId === "organ-brain" || anatomicalId === "model:organs:supplement:brain" || anatomicalId.startsWith("model:hra:brain:")) return ["brain"];
  if (anatomicalId === "organ-lungs" || anatomicalId.startsWith("model:hra:lungs:")) return ["lungs"];
  if (anatomicalId === "organ-liver" || anatomicalId.startsWith("model:hra:liver:")) return ["liver"];
  if (anatomicalId === "organ-kidneys" || anatomicalId.startsWith("model:hra:kidney-")) return ["kidney-left", "kidney-right"];
  return [];
}

export const heartInteriorMeshDefinitions: HeartMeshDefinition[] = [
  {
    meshName: "VH_F_interventricular_septum",
    anatomicalId: "model:heart:interventricular-septum",
    name: "Septo interventricular",
    latin: "Septum interventriculare",
    kind: "septum",
    region: "Entre os ventrículos",
    summary: "Parede muscular que separa os ventrículos direito e esquerdo no coração segmentado.",
    function: "Separa as cavidades ventriculares e participa da condução elétrica e da mecânica ventricular.",
    aliases: ["interventricular septum", "septo interventricular"],
    color: "#d9957e",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_left_cardiac_atrium",
    anatomicalId: "model:heart:left-atrium",
    name: "Átrio esquerdo",
    latin: "Atrium sinistrum",
    kind: "chamber",
    region: "Base posterior do coração",
    summary: "Câmara superior esquerda representada como malha anatômica independente.",
    function: "Recebe sangue oxigenado das veias pulmonares e o direciona ao ventrículo esquerdo.",
    aliases: ["left cardiac atrium", "left atrium", "átrio esquerdo"],
    color: "#c85663",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_left_ventricle",
    anatomicalId: "model:heart:left-ventricle",
    name: "Ventrículo esquerdo",
    latin: "Ventriculus sinister",
    kind: "chamber",
    region: "Face esquerda e ápice do coração",
    summary: "Câmara inferior esquerda de parede espessa, segmentada separadamente.",
    function: "Ejeta sangue para a aorta por meio da valva aórtica e sustenta a circulação sistêmica.",
    aliases: ["left ventricle", "ventrículo esquerdo"],
    color: "#b93d50",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_right_cardiac_atrium",
    anatomicalId: "model:heart:right-atrium",
    name: "Átrio direito",
    latin: "Atrium dextrum",
    kind: "chamber",
    region: "Base direita do coração",
    summary: "Câmara superior direita representada como malha anatômica independente.",
    function: "Recebe o retorno venoso sistêmico e o direciona ao ventrículo direito.",
    aliases: ["right cardiac atrium", "right atrium", "átrio direito"],
    color: "#9f4e67",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_right_ventricle",
    anatomicalId: "model:heart:right-ventricle",
    name: "Ventrículo direito",
    latin: "Ventriculus dexter",
    kind: "chamber",
    region: "Face anterior do coração",
    summary: "Câmara inferior direita representada como malha anatômica independente.",
    function: "Ejeta sangue para o tronco pulmonar através da valva pulmonar.",
    aliases: ["right ventricle", "ventrículo direito"],
    color: "#a63f55",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_aortic_valve",
    anatomicalId: "model:heart:aortic-valve",
    name: "Valva aórtica",
    latin: "Valva aortae",
    kind: "valve",
    region: "Saída do ventrículo esquerdo",
    summary: "Valva semilunar aórtica segmentada como malha anatômica independente.",
    function: "Permite a ejeção para a aorta e reduz o refluxo para o ventrículo esquerdo.",
    aliases: ["aortic valve", "valva aórtica"],
    color: "#f0c06c",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_pulmonary_valve",
    anatomicalId: "model:heart:pulmonary-valve",
    name: "Valva pulmonar",
    latin: "Valva trunci pulmonalis",
    kind: "valve",
    region: "Saída do ventrículo direito",
    summary: "Valva semilunar pulmonar segmentada como malha anatômica independente.",
    function: "Permite a ejeção ao tronco pulmonar e reduz o refluxo para o ventrículo direito.",
    aliases: ["pulmonary valve", "valva pulmonar"],
    color: "#e5b467",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_mitral_valve",
    anatomicalId: "model:heart:mitral-valve",
    name: "Valva mitral",
    latin: "Valva atrioventricularis sinistra",
    kind: "valve",
    region: "Óstio atrioventricular esquerdo",
    summary: "Valva atrioventricular esquerda segmentada como malha anatômica independente.",
    function: "Permite o fluxo do átrio esquerdo ao ventrículo esquerdo e reduz o refluxo durante a sístole.",
    aliases: ["mitral valve", "bicuspid valve", "valva mitral"],
    color: "#f2c879",
    sourceId: "nihHraHeart3D",
  },
  {
    meshName: "VH_F_tricuspid_valve",
    anatomicalId: "model:heart:tricuspid-valve",
    name: "Valva tricúspide",
    latin: "Valva atrioventricularis dextra",
    kind: "valve",
    region: "Óstio atrioventricular direito",
    summary: "Valva atrioventricular direita segmentada como malha anatômica independente.",
    function: "Permite o fluxo do átrio direito ao ventrículo direito e reduz o refluxo durante a sístole.",
    aliases: ["tricuspid valve", "valva tricúspide"],
    color: "#ecc171",
    sourceId: "nihHraHeart3D",
  },
  ...[
    ["VH_F_papillary_muscle_of_heart_ant", "anterior", "Músculo papilar anterior"],
    ["VH_F_papillary_muscle_of_heart_antlat", "anterolateral", "Músculo papilar anterolateral"],
    ["VH_F_papillary_muscle_of_heart_med", "medial", "Músculo papilar medial"],
    ["VH_F_papillary_muscle_of_heart_pos", "posterior", "Músculo papilar posterior"],
    ["VH_F_papillary_muscle_of_heart_posmed", "posteromedial", "Músculo papilar posteromedial"],
  ].map(([meshName, slug, name]) => ({
    meshName,
    anatomicalId: `model:heart:papillary-muscle-${slug}`,
    name,
    latin: "Musculus papillaris",
    kind: "papillary-muscle" as const,
    region: "Interior ventricular",
    summary: `${name} representado como malha anatômica independente no coração segmentado.`,
    function: "Tensiona cordas tendíneas durante a sístole e contribui para a competência das valvas atrioventriculares.",
    aliases: [meshName, name],
    color: "#cb765f",
    sourceId: "nihHraHeart3D",
  })),
];

export const heartExteriorMeshDefinitions: HeartMeshDefinition[] = [
  ["FMA7274", "wall", "Parede do coração", "Paries cordis", "wall", "#b53c50"],
  ["FMA3736", "ascending-aorta", "Aorta ascendente", "Aorta ascendens", "vessel", "#d74552"],
  ["FMA3768", "aortic-arch", "Arco da aorta", "Arcus aortae", "vessel", "#d74552"],
  ["FMA3784", "descending-aorta", "Aorta descendente", "Aorta descendens", "vessel", "#d74552"],
  ["FMA3802", "right-coronary-artery", "Artéria coronária direita", "Arteria coronaria dextra", "vessel", "#dc5960"],
  ["FMA3818", "right-marginal-branch", "Ramo marginal direito", "Ramus marginalis dexter", "vessel", "#dc5960"],
  ["FMA3840nsn", "posterior-interventricular-branch", "Ramo interventricular posterior", "Ramus interventricularis posterior", "vessel", "#dc5960"],
  ["FMA4720", "superior-vena-cava", "Veia cava superior", "Vena cava superior", "vessel", "#4b7eaa"],
  ["FMA10951", "inferior-vena-cava", "Veia cava inferior", "Vena cava inferior", "vessel", "#4b7eaa"],
].map(([meshName, slug, name, latin, kind, color]) => ({
  meshName,
  anatomicalId: `model:heart:${slug}`,
  name,
  latin,
  kind: kind as HeartMeshKind,
  region: kind === "wall" ? "Mediastino médio" : "Grandes vasos do coração",
  summary: `${name} representada como malha anatômica independente no modelo externo do coração.`,
  function: kind === "wall"
    ? "Forma o órgão muscular que impulsiona sangue pelas circulações pulmonar e sistêmica."
    : "Conduz sangue na circulação cardíaca ou sistêmica conforme seu território anatômico.",
  aliases: [meshName, name],
  color,
  sourceId: "zAnatomyOrgan3D",
}));

const allHeartMeshes = [...heartInteriorMeshDefinitions, ...heartExteriorMeshDefinitions];
const heartMeshByName = new Map(allHeartMeshes.map((item) => [item.meshName, item]));
const heartMeshById = new Map(allHeartMeshes.map((item) => [item.anatomicalId, item]));

export function heartAnatomyForMeshName(meshName: string) {
  return heartMeshByName.get(meshName);
}

export function heartAnatomyForId(anatomicalId?: string | null) {
  return anatomicalId ? heartMeshById.get(anatomicalId) : undefined;
}

export function isHeartInteriorStructureId(anatomicalId?: string | null) {
  const item = heartAnatomyForId(anatomicalId);
  return Boolean(item && item.sourceId === "nihHraHeart3D");
}

export function heartRepresentationForAvailability(wantsInterior: boolean, detailedAssetAvailable: boolean) {
  if (!wantsInterior) return "exterior" as const;
  return detailedAssetAvailable ? "interior" as const : "exterior-fallback" as const;
}
