export type AnatomyBodyProfileId = "adult-male" | "adult-female" | "child" | "newborn";

export type AnatomySkinToneId = "light" | "medium" | "olive" | "deep";

export interface AnatomyBodyProfile {
  id: AnatomyBodyProfileId;
  label: string;
  shortLabel: string;
  description: string;
  developmentalStage: string;
  scale: [number, number, number];
  offset: [number, number, number];
  atlasScale: [number, number];
  cameraScale: number;
  evidenceNote: string;
}

const BODY_FLOOR_Y = -4.35;

function groundedOffset(scaleY: number): [number, number, number] {
  return [0, BODY_FLOOR_Y * (1 - scaleY), 0];
}

export const anatomyBodyProfiles: AnatomyBodyProfile[] = [
  {
    id: "adult-male",
    label: "Homem adulto",
    shortLabel: "Homem",
    description: "Proporções adultas com tórax discretamente mais amplo.",
    developmentalStage: "Adulto",
    scale: [1.045, 1, 1.025],
    offset: groundedOffset(1),
    atlasScale: [1.035, 1],
    cameraScale: 1,
    evidenceNote: "Estruturas reprodutivas femininas são ocultadas neste perfil.",
  },
  {
    id: "adult-female",
    label: "Mulher adulta",
    shortLabel: "Mulher",
    description: "Proporções adultas com pelve relativamente mais ampla.",
    developmentalStage: "Adulto",
    scale: [0.985, 0.995, 1.01],
    offset: groundedOffset(0.995),
    atlasScale: [0.985, 1],
    cameraScale: 1,
    evidenceNote: "Estruturas reprodutivas masculinas são ocultadas neste perfil.",
  },
  {
    id: "child",
    label: "Criança",
    shortLabel: "Criança",
    description: "Comparação proporcional aproximada da idade escolar.",
    developmentalStage: "Infância",
    scale: [0.77, 0.72, 0.81],
    offset: groundedOffset(0.72),
    atlasScale: [0.82, 0.75],
    cameraScale: 0.77,
    evidenceNote: "Morfometria didática; a malha interna de referência permanece baseada no atlas adulto.",
  },
  {
    id: "newborn",
    label: "Recém-nascido",
    shortLabel: "Bebê",
    description: "Comparação proporcional neonatal, com corpo mais curto e largo.",
    developmentalStage: "Neonatal",
    scale: [0.56, 0.39, 0.66],
    offset: groundedOffset(0.39),
    atlasScale: [0.68, 0.48],
    cameraScale: 0.55,
    evidenceNote: "Visão proporcional; não representa ossificação, fontanelas ou anatomia neonatal de alta fidelidade.",
  },
];

export const anatomySkinTones: Array<{ id: AnatomySkinToneId; label: string; color: string }> = [
  { id: "light", label: "Pele clara", color: "#d7a083" },
  { id: "medium", label: "Pele média", color: "#ad7152" },
  { id: "olive", label: "Pele oliva", color: "#936548" },
  { id: "deep", label: "Pele escura", color: "#5f382b" },
];

export function anatomyBodyProfile(profileId: AnatomyBodyProfileId) {
  return anatomyBodyProfiles.find((profile) => profile.id === profileId) ?? anatomyBodyProfiles[0];
}

export function anatomySkinTone(toneId: AnatomySkinToneId) {
  return anatomySkinTones.find((tone) => tone.id === toneId) ?? anatomySkinTones[1];
}

export function transformAnatomyPoint(point: [number, number, number], profileId: AnatomyBodyProfileId): [number, number, number] {
  const profile = anatomyBodyProfile(profileId);
  return [
    point[0] * profile.scale[0] + profile.offset[0],
    point[1] * profile.scale[1] + profile.offset[1],
    point[2] * profile.scale[2] + profile.offset[2],
  ];
}

export function transformAnatomyDistance(distance: number, profileId: AnatomyBodyProfileId) {
  return distance * anatomyBodyProfile(profileId).cameraScale;
}

type ProfiledStructure = { id: string; name: string; latin?: string | null; layer: string };

const femaleSpecific = /uter|ovar|vagin|clitor|mamm|tuba uterina|fallopian/;
const maleSpecific = /prostat|testic|penis|peniano|seminal|deferent|bulbouretral/;

function normalizedStructureName(structure: ProfiledStructure | string) {
  const value = typeof structure === "string"
    ? structure
    : `${structure.id} ${structure.name} ${structure.latin ?? ""}`;
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function anatomyStructureVisibleForProfile(structure: ProfiledStructure, profileId: AnatomyBodyProfileId) {
  if (structure.layer !== "organs") return true;
  const normalized = normalizedStructureName(structure);
  if (profileId === "adult-male") return !femaleSpecific.test(normalized);
  if (profileId === "adult-female") return !maleSpecific.test(normalized);
  return !femaleSpecific.test(normalized) && !maleSpecific.test(normalized);
}

export function anatomyOrganNameVisibleForProfile(name: string, profileId: AnatomyBodyProfileId) {
  const normalized = normalizedStructureName(name);
  if (profileId === "adult-male") return !femaleSpecific.test(normalized);
  if (profileId === "adult-female") return !maleSpecific.test(normalized);
  return !femaleSpecific.test(normalized) && !maleSpecific.test(normalized);
}
