export interface OrganRealismProfile {
  tissue: string;
  color: string;
  highlight: string;
  vascularColor: string;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenColor: string;
  specularIntensity: number;
  transmission: number;
  thickness: number;
  variation: number;
  vascularity: number;
}

const profiles: Array<[RegExp, OrganRealismProfile]> = [
  [/heart|atri|ventric|coracao|coração|coronary/, { tissue: "Miocárdio", color: "#6f1826", highlight: "#b83f4e", vascularColor: "#34101a", roughness: .34, clearcoat: .46, clearcoatRoughness: .29, sheen: .24, sheenColor: "#8f2d3d", specularIntensity: .92, transmission: .045, thickness: .22, variation: .2, vascularity: .34 }],
  [/lung|bronch|pulmao|pulmão|pleura/, { tissue: "Parênquima pulmonar", color: "#ad7779", highlight: "#d6aaa7", vascularColor: "#70484e", roughness: .58, clearcoat: .19, clearcoatRoughness: .54, sheen: .38, sheenColor: "#ca9292", specularIntensity: .62, transmission: .085, thickness: .34, variation: .16, vascularity: .2 }],
  [/liver|figado|fígado|gallbladder|vesicula|vesícula/, { tissue: "Parênquima hepático", color: "#56221d", highlight: "#893a32", vascularColor: "#32151a", roughness: .36, clearcoat: .5, clearcoatRoughness: .31, sheen: .18, sheenColor: "#743028", specularIntensity: .96, transmission: .035, thickness: .28, variation: .15, vascularity: .22 }],
  [/kidney|renal|rim|ureter/, { tissue: "Parênquima renal", color: "#6d3440", highlight: "#a85b66", vascularColor: "#3e1d2d", roughness: .39, clearcoat: .42, clearcoatRoughness: .35, sheen: .22, sheenColor: "#914955", specularIntensity: .88, transmission: .055, thickness: .25, variation: .18, vascularity: .26 }],
  [/brain|cerebr|cortex|gyrus|encefal|enc[eé]falo|cerebelo/, { tissue: "Tecido nervoso", color: "#b98277", highlight: "#ddb0a5", vascularColor: "#7a3e45", roughness: .48, clearcoat: .31, clearcoatRoughness: .44, sheen: .3, sheenColor: "#cd948b", specularIntensity: .72, transmission: .07, thickness: .18, variation: .12, vascularity: .3 }],
  [/stomach|esophagus|intestin|colon|rectum|duodenum|jejunum|ileum|estomago|estômago|intestino|reto/, { tissue: "Serosa gastrointestinal", color: "#9d625b", highlight: "#cc9387", vascularColor: "#65333b", roughness: .42, clearcoat: .42, clearcoatRoughness: .36, sheen: .28, sheenColor: "#b97870", specularIntensity: .86, transmission: .075, thickness: .21, variation: .2, vascularity: .3 }],
  [/omentum|meso-|mesocol|mesent|adipose|fat/, { tissue: "Peritônio e tecido adiposo", color: "#c5a16a", highlight: "#dfc58f", vascularColor: "#8b5550", roughness: .52, clearcoat: .22, clearcoatRoughness: .5, sheen: .18, sheenColor: "#d4b47d", specularIntensity: .58, transmission: .07, thickness: .18, variation: .28, vascularity: .2 }],
  [/pharynx|palate|tongue|uvula|gingiva|mucosa|epiglottis|faringe|palato|lingua|língua|gengiva/, { tissue: "Mucosa vascularizada", color: "#9f5859", highlight: "#ca8580", vascularColor: "#602d3c", roughness: .39, clearcoat: .45, clearcoatRoughness: .34, sheen: .3, sheenColor: "#b96e6c", specularIntensity: .86, transmission: .08, thickness: .16, variation: .18, vascularity: .34 }],
  [/trachea|bronchus|bronchial|cartilage|traqueia|brônquio|bronquio/, { tissue: "Mucosa e cartilagem respiratória", color: "#b37f76", highlight: "#d7aaa0", vascularColor: "#76434d", roughness: .48, clearcoat: .28, clearcoatRoughness: .45, sheen: .28, sheenColor: "#c39389", specularIntensity: .68, transmission: .07, thickness: .22, variation: .14, vascularity: .22 }],
  [/duct|urethra|ductus|uretra|ducto/, { tissue: "Parede ductal", color: "#ad7770", highlight: "#d29f94", vascularColor: "#70404a", roughness: .48, clearcoat: .28, clearcoatRoughness: .46, sheen: .26, sheenColor: "#c18b83", specularIntensity: .68, transmission: .065, thickness: .14, variation: .14, vascularity: .2 }],
  [/pancreas|p[aâ]ncreas/, { tissue: "Parênquima pancreático lobulado", color: "#bd8d59", highlight: "#ddb981", vascularColor: "#79513c", roughness: .57, clearcoat: .18, clearcoatRoughness: .58, sheen: .2, sheenColor: "#cda36f", specularIntensity: .58, transmission: .045, thickness: .19, variation: .24, vascularity: .16 }],
  [/spleen|baco|baço/, { tissue: "Parênquima esplênico", color: "#4e2034", highlight: "#82455a", vascularColor: "#2c1128", roughness: .37, clearcoat: .44, clearcoatRoughness: .34, sheen: .22, sheenColor: "#6b2f49", specularIntensity: .9, transmission: .04, thickness: .26, variation: .16, vascularity: .24 }],
  [/bladder|bexiga/, { tissue: "Parede vesical distensível", color: "#a97e79", highlight: "#d0aaa2", vascularColor: "#76505a", roughness: .47, clearcoat: .3, clearcoatRoughness: .44, sheen: .3, sheenColor: "#be918b", specularIntensity: .72, transmission: .095, thickness: .18, variation: .13, vascularity: .2 }],
  [/thyroid|adrenal|pituitary|pineal|gland|tireoide|glandula|glândula/, { tissue: "Tecido glandular vascularizado", color: "#92503f", highlight: "#bd7860", vascularColor: "#572b32", roughness: .42, clearcoat: .34, clearcoatRoughness: .39, sheen: .24, sheenColor: "#a96250", specularIntensity: .76, transmission: .05, thickness: .2, variation: .19, vascularity: .27 }],
  [/testis|prostate|seminal|uterus|ovary|vagina|testiculo|testículo|prostata|próstata|utero|útero|ovario|ovário|cavernosum|spongiosum|glans|epididymis/, { tissue: "Tecido reprodutivo", color: "#8f5a68", highlight: "#bd8791", vascularColor: "#60313f", roughness: .45, clearcoat: .32, clearcoatRoughness: .42, sheen: .28, sheenColor: "#a96f7b", specularIntensity: .72, transmission: .06, thickness: .2, variation: .16, vascularity: .24 }],
  [/eye|oculus|olho/, { tissue: "Globo ocular e túnicas", color: "#c9c5b8", highlight: "#f4f5ef", vascularColor: "#9c5b61", roughness: .16, clearcoat: .84, clearcoatRoughness: .1, sheen: .12, sheenColor: "#eaf0ee", specularIntensity: 1, transmission: .18, thickness: .12, variation: .05, vascularity: .1 }],
];

const fallback: OrganRealismProfile = {
  tissue: "Tecido visceral", color: "#7d464b", highlight: "#ad7171", vascularColor: "#4a2530",
  roughness: .42, clearcoat: .36, clearcoatRoughness: .39, sheen: .25, sheenColor: "#946065",
  specularIntensity: .76, transmission: .05, thickness: .2, variation: .17, vascularity: .22,
};

export function organRealismProfile(name: string): OrganRealismProfile {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return profiles.find(([pattern]) => pattern.test(normalized))?.[1] ?? fallback;
}

export function organTissueVertexColors(name: string, positions: ArrayLike<number>, originalColors?: ArrayLike<number>): Float32Array {
  const profile = organRealismProfile(name);
  const base = hexToRgb(profile.color);
  const vessel = hexToRgb(profile.vascularColor);
  const result = new Float32Array(positions.length);
  const bounds = positionBounds(positions);
  const seed = Array.from(name).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 17);

  for (let index = 0; index < positions.length; index += 3) {
    const x = normalizeAxis(Number(positions[index]), bounds.minX, bounds.maxX);
    const y = normalizeAxis(Number(positions[index + 1]), bounds.minY, bounds.maxY);
    const z = normalizeAxis(Number(positions[index + 2]), bounds.minZ, bounds.maxZ);
    const coarse = (Math.sin(x * 16.7 + seed * .0017) + Math.sin(y * 21.3 - seed * .0011) + Math.sin(z * 18.1 + seed * .0007)) / 3;
    const fine = Math.sin((x * 73.1) + (y * 51.7) + (z * 61.3) + seed * .0031);
    const mottling = .9 + profile.variation * (.48 * coarse + .16 * fine);
    const vesselField = Math.abs(Math.sin((x * 29.2) + (y * 18.7) + (z * 23.9) + Math.sin(y * 8.1) * 2.4 + seed * .0023));
    const vesselMask = clamp01((vesselField - .945) / .055) * profile.vascularity;
    const hasOriginal = Boolean(originalColors && originalColors.length >= index + 3);

    for (let channel = 0; channel < 3; channel += 1) {
      const source = hasOriginal ? Number(originalColors![index + channel]) : base[channel];
      const tissue = (base[channel] * .92 + source * .08) * mottling;
      result[index + channel] = clamp01(tissue * (1 - vesselMask) + vessel[channel] * vesselMask);
    }
  }

  return result;
}

function positionBounds(positions: ArrayLike<number>) {
  let minX = Infinity; let minY = Infinity; let minZ = Infinity;
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  for (let index = 0; index < positions.length; index += 3) {
    const x = Number(positions[index]); const y = Number(positions[index + 1]); const z = Number(positions[index + 2]);
    minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

function normalizeAxis(value: number, minimum: number, maximum: number) {
  return maximum > minimum ? (value - minimum) / (maximum - minimum) : .5;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    srgbToLinear(((value >> 16) & 255) / 255),
    srgbToLinear(((value >> 8) & 255) / 255),
    srgbToLinear((value & 255) / 255),
  ];
}

function srgbToLinear(value: number) {
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
