import {
  BufferAttribute,
  type BufferGeometry,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3,
} from "three";
import type { AnatomyRenderPolicy } from "@/lib/anatomyRenderQuality";

export type AnatomyTissue =
  | "skin"
  | "muscle"
  | "tendon"
  | "bone"
  | "artery"
  | "vein"
  | "nerve"
  | "heart"
  | "lung"
  | "liver"
  | "kidney"
  | "brain"
  | "mucosa"
  | "adipose"
  | "visceral";

export interface AnatomyMaterialProfile {
  label: string;
  baseColor: string;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenColor: string;
  specularIntensity: number;
  transmission: number;
  thickness: number;
  normalStrength: number;
  variation: number;
  fiberStrength: number;
  textureFrequency: number;
}

export const anatomyMaterialProfiles: Record<AnatomyTissue, AnatomyMaterialProfile> = {
  skin: { label: "Superfície cutânea", baseColor: "#a96f55", roughness: .74, clearcoat: .01, clearcoatRoughness: .9, sheen: .07, sheenColor: "#d4a28d", specularIntensity: .36, transmission: 0, thickness: .06, normalStrength: .24, variation: .1, fiberStrength: 0, textureFrequency: 22 },
  muscle: { label: "Músculo esquelético", baseColor: "#7b252b", roughness: .68, clearcoat: .008, clearcoatRoughness: .88, sheen: .04, sheenColor: "#9b4b50", specularIntensity: .36, transmission: 0, thickness: 0, normalStrength: .48, variation: .18, fiberStrength: .76, textureFrequency: 30 },
  tendon: { label: "Tendão e aponeurose", baseColor: "#cbbfa5", roughness: .74, clearcoat: .015, clearcoatRoughness: .88, sheen: .12, sheenColor: "#e1d8c5", specularIntensity: .42, transmission: 0, thickness: 0, normalStrength: .3, variation: .08, fiberStrength: .82, textureFrequency: 38 },
  bone: { label: "Tecido ósseo", baseColor: "#d4c5a6", roughness: .82, clearcoat: .008, clearcoatRoughness: .94, sheen: .04, sheenColor: "#e7dcc4", specularIntensity: .35, transmission: 0, thickness: 0, normalStrength: .31, variation: .11, fiberStrength: 0, textureFrequency: 26 },
  artery: { label: "Parede arterial", baseColor: "#9f2e3b", roughness: .55, clearcoat: .035, clearcoatRoughness: .72, sheen: .16, sheenColor: "#c65b62", specularIntensity: .5, transmission: .006, thickness: .05, normalStrength: .22, variation: .08, fiberStrength: .34, textureFrequency: 34 },
  vein: { label: "Parede venosa", baseColor: "#426d8b", roughness: .61, clearcoat: .025, clearcoatRoughness: .78, sheen: .12, sheenColor: "#7692a7", specularIntensity: .44, transmission: .008, thickness: .045, normalStrength: .2, variation: .07, fiberStrength: .28, textureFrequency: 34 },
  nerve: { label: "Tecido nervoso periférico", baseColor: "#cfaa55", roughness: .72, clearcoat: .01, clearcoatRoughness: .9, sheen: .08, sheenColor: "#e1c67f", specularIntensity: .38, transmission: 0, thickness: 0, normalStrength: .18, variation: .08, fiberStrength: .46, textureFrequency: 40 },
  heart: { label: "Miocárdio e epicárdio", baseColor: "#681923", roughness: .5, clearcoat: .065, clearcoatRoughness: .64, sheen: .18, sheenColor: "#963944", specularIntensity: .56, transmission: .006, thickness: .08, normalStrength: .56, variation: .25, fiberStrength: .5, textureFrequency: 28 },
  lung: { label: "Parênquima pulmonar", baseColor: "#a87779", roughness: .7, clearcoat: .018, clearcoatRoughness: .84, sheen: .16, sheenColor: "#c99a98", specularIntensity: .42, transmission: .018, thickness: .1, normalStrength: .24, variation: .14, fiberStrength: 0, textureFrequency: 24 },
  liver: { label: "Parênquima hepático", baseColor: "#5b2824", roughness: .54, clearcoat: .065, clearcoatRoughness: .64, sheen: .12, sheenColor: "#82453e", specularIntensity: .56, transmission: .008, thickness: .1, normalStrength: .2, variation: .12, fiberStrength: 0, textureFrequency: 25 },
  kidney: { label: "Parênquima renal", baseColor: "#743d49", roughness: .58, clearcoat: .045, clearcoatRoughness: .7, sheen: .14, sheenColor: "#9c6770", specularIntensity: .52, transmission: .01, thickness: .09, normalStrength: .23, variation: .13, fiberStrength: 0, textureFrequency: 26 },
  brain: { label: "Tecido nervoso central", baseColor: "#b47f78", roughness: .64, clearcoat: .025, clearcoatRoughness: .82, sheen: .18, sheenColor: "#d0a39a", specularIntensity: .46, transmission: .012, thickness: .07, normalStrength: .15, variation: .09, fiberStrength: 0, textureFrequency: 22 },
  mucosa: { label: "Mucosa", baseColor: "#99585a", roughness: .5, clearcoat: .075, clearcoatRoughness: .58, sheen: .2, sheenColor: "#bd7d78", specularIntensity: .6, transmission: .014, thickness: .07, normalStrength: .2, variation: .12, fiberStrength: 0, textureFrequency: 26 },
  adipose: { label: "Tecido adiposo", baseColor: "#c7aa73", roughness: .68, clearcoat: .012, clearcoatRoughness: .86, sheen: .08, sheenColor: "#ddc492", specularIntensity: .38, transmission: .01, thickness: .06, normalStrength: .28, variation: .2, fiberStrength: 0, textureFrequency: 20 },
  visceral: { label: "Tecido visceral", baseColor: "#83505a", roughness: .58, clearcoat: .035, clearcoatRoughness: .72, sheen: .14, sheenColor: "#a6767b", specularIntensity: .5, transmission: .008, thickness: .07, normalStrength: .21, variation: .12, fiberStrength: 0, textureFrequency: 25 },
};

export function anatomyTissueForName(name: string, fallback: AnatomyTissue = "visceral"): AnatomyTissue {
  const value = normalize(name);
  if (/tendon|tendo\b|aponeuros|fascia|retinacul|ligament|valve|valva/.test(value)) return "tendon";
  if (/\b(bone|osseous|osso|rib|costela|femur|femoral bone|humerus|umero|ulna|radius|radio|tibia|fibula|skull|cranio|mandible|mandibula|maxilla|maxila|patella|clavicle|clavicula|scapula|sternum)\b|\bvertebr(a|ae|al|e)\b/.test(value)) return "bone";
  if (/coracao|heart|myocard|cardiac|atri|ventric|papillar/.test(value)) return "heart";
  if (/vena|vein|veia|cava/.test(value)) return "vein";
  if (/arter|aorta|coronary|coronaria/.test(value)) return "artery";
  if (/nerve|nerv|plexus|gangli|spinal cord|medula espinal/.test(value)) return "nerve";
  if (/muscle|musculo|muscular/.test(value)) return "muscle";
  if (/lung|pulmao|bronch|pleura/.test(value)) return "lung";
  if (/liver|figado|hepatic/.test(value)) return "liver";
  if (/kidney|renal|rim|ureter/.test(value)) return "kidney";
  if (/brain|cerebr|cortex|gyrus|encefal|cerebel|thalam|hippocamp/.test(value)) return "brain";
  if (/mucosa|tongue|lingua|palate|palato|pharyn|faring|gingiv/.test(value)) return "mucosa";
  if (/adipose|fat|omentum|mesent|gordura/.test(value)) return "adipose";
  if (/skin|surface|superficie|cutaneous|integument/.test(value)) return "skin";
  return fallback;
}

interface ApplyTissueOptions {
  active?: boolean;
  baseColor?: string;
  vertexColors?: boolean;
  quality: AnatomyRenderPolicy;
}

export function applyAnatomyTissueMaterial(
  material: MeshPhysicalMaterial,
  geometry: BufferGeometry,
  tissue: AnatomyTissue,
  options: ApplyTissueOptions,
) {
  const profile = anatomyMaterialProfiles[tissue];
  const maps = tissueTextureSet(tissue, options.quality.textureResolution);
  ensureProjectedUv(geometry);
  material.map = maps.albedo;
  material.normalMap = maps.normal;
  material.roughnessMap = maps.roughness;
  material.normalScale.setScalar(profile.normalStrength);
  material.vertexColors = Boolean(options.vertexColors);
  material.color.set(options.vertexColors ? "#ffffff" : options.baseColor ?? profile.baseColor);
  material.emissive.set(options.active ? "#7a291f" : "#000000");
  material.emissiveIntensity = options.active ? .17 : 0;
  material.roughness = profile.roughness;
  material.metalness = 0;
  material.clearcoat = profile.clearcoat;
  material.clearcoatRoughness = profile.clearcoatRoughness;
  material.sheen = profile.sheen;
  material.sheenColor.set(profile.sheenColor);
  material.sheenRoughness = Math.min(1, profile.roughness + .14);
  material.ior = 1.38;
  material.specularIntensity = profile.specularIntensity;
  material.specularColor.set("#d8c1b7");
  material.transmission = profile.transmission;
  material.thickness = profile.thickness;
  material.attenuationColor.set(options.baseColor ?? profile.baseColor);
  material.attenuationDistance = .82;
  material.envMapIntensity = options.active ? 1.04 : .88;
  material.needsUpdate = true;
}

export function clearAnatomyTissueMaps(material: MeshPhysicalMaterial) {
  material.map = null;
  material.normalMap = null;
  material.roughnessMap = null;
  material.normalScale.setScalar(1);
}

export function estimatedTissueTextureBytes(textureResolution: number, tissueCount: number) {
  return textureResolution * textureResolution * 4 * 3 * tissueCount;
}

type TissueTextureSet = { albedo: DataTexture; normal: DataTexture; roughness: DataTexture };
const textureCache = new Map<string, TissueTextureSet>();

function tissueTextureSet(tissue: AnatomyTissue, size: number): TissueTextureSet {
  const key = `${tissue}:${size}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const profile = anatomyMaterialProfiles[tissue];
  const height = new Float32Array(size * size);
  const roughnessValues = new Float32Array(size * size);
  const seed = Array.from(tissue).reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 23);
  const tau = Math.PI * 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const coarse = Math.sin((u * 3.2 + v * 1.7) * tau + seed * .001) * .5
        + Math.sin((u * 7.1 - v * 5.3) * tau - seed * .0007) * .28;
      const cellular = valueNoise(x, y, seed) * 2 - 1;
      const fibers = profile.fiberStrength
        * (Math.sin((u * profile.textureFrequency + Math.sin(v * tau * 3) * .18) * tau) * .72
          + Math.sin((u * profile.textureFrequency * 2.07 + v * .7) * tau) * .28);
      const pores = (tissue === "bone" || tissue === "skin" || tissue === "lung")
        ? Math.min(0, cellular + (tissue === "bone" ? .62 : .78)) * (tissue === "bone" ? 1.6 : .72)
        : 0;
      const value = clamp01(.52 + coarse * profile.variation * .46 + cellular * profile.variation * .24 + fibers * .17 + pores * .22);
      height[y * size + x] = value;
      roughnessValues[y * size + x] = clamp01(.72 + (cellular * .14 - value * .16) * profile.variation * 4.2);
    }
  }

  const albedoData = new Uint8Array(size * size * 4);
  const normalData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const offset = index * 4;
      const value = height[index];
      const tone = Math.round(190 + value * 55);
      albedoData[offset] = clampByte(tone + profile.variation * 20);
      albedoData[offset + 1] = clampByte(tone);
      albedoData[offset + 2] = clampByte(tone - profile.variation * 16);
      albedoData[offset + 3] = 255;

      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const down = height[((y - 1 + size) % size) * size + x];
      const up = height[((y + 1) % size) * size + x];
      const nx = (left - right) * 2.4;
      const ny = (down - up) * 2.4;
      const inverseLength = 1 / Math.hypot(nx, ny, 1);
      normalData[offset] = clampByte((nx * inverseLength * .5 + .5) * 255);
      normalData[offset + 1] = clampByte((ny * inverseLength * .5 + .5) * 255);
      normalData[offset + 2] = clampByte((inverseLength * .5 + .5) * 255);
      normalData[offset + 3] = 255;

      const roughness = clampByte(roughnessValues[index] * 255);
      roughnessData[offset] = roughness;
      roughnessData[offset + 1] = roughness;
      roughnessData[offset + 2] = roughness;
      roughnessData[offset + 3] = 255;
    }
  }

  const result = {
    albedo: makeTexture(albedoData, size, true),
    normal: makeTexture(normalData, size, false),
    roughness: makeTexture(roughnessData, size, false),
  };
  textureCache.set(key, result);
  return result;
}

function makeTexture(data: Uint8Array, size: number, color: boolean) {
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function ensureProjectedUv(geometry: BufferGeometry) {
  if (geometry.getAttribute("uv")) return;
  const positions = geometry.getAttribute("position");
  if (!positions) return;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return;
  const size = bounds.getSize(new Vector3());
  const dimensions = [
    { axis: 0, size: size.x },
    { axis: 1, size: size.y },
    { axis: 2, size: size.z },
  ].sort((a, b) => b.size - a.size);
  const uAxis = dimensions[1].axis;
  const vAxis = dimensions[0].axis;
  const minimum = [bounds.min.x, bounds.min.y, bounds.min.z];
  const extent = [Math.max(size.x, 1e-6), Math.max(size.y, 1e-6), Math.max(size.z, 1e-6)];
  const uv = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    const point = [positions.getX(index), positions.getY(index), positions.getZ(index)];
    uv[index * 2] = ((point[uAxis] - minimum[uAxis]) / extent[uAxis]) * 4;
    uv[index * 2 + 1] = ((point[vAxis] - minimum[vAxis]) / extent[vAxis]) * 4;
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
}

function valueNoise(x: number, y: number, seed: number) {
  const value = Math.sin((x + seed * .013) * 12.9898 + (y - seed * .007) * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
