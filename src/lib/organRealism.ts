export interface OrganRealismProfile {
  tissue: string;
  color: string;
  highlight: string;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenColor: string;
}

const profiles: Array<[RegExp, OrganRealismProfile]> = [
  [/heart|atri|ventric|coracao|coração|coronary/, { tissue: "Miocárdio", color: "#791d2c", highlight: "#d15f68", roughness: .43, clearcoat: .34, clearcoatRoughness: .38, sheen: .34, sheenColor: "#a7444f" }],
  [/lung|bronch|pulmao|pulmão|pleura/, { tissue: "Parênquima pulmonar", color: "#b56f72", highlight: "#e7aba9", roughness: .67, clearcoat: .12, clearcoatRoughness: .7, sheen: .42, sheenColor: "#d79a99" }],
  [/liver|figado|fígado|gallbladder|vesicula|vesícula/, { tissue: "Parênquima hepático", color: "#642921", highlight: "#a95849", roughness: .48, clearcoat: .28, clearcoatRoughness: .46, sheen: .28, sheenColor: "#81372f" }],
  [/kidney|renal|rim|ureter/, { tissue: "Parênquima renal", color: "#743743", highlight: "#bd7279", roughness: .5, clearcoat: .24, clearcoatRoughness: .48, sheen: .3, sheenColor: "#9a5260" }],
  [/brain|cerebr|cortex|gyrus|encefal|enc[eé]falo|cerebelo/, { tissue: "Tecido nervoso", color: "#c18a7e", highlight: "#ebbbb0", roughness: .62, clearcoat: .14, clearcoatRoughness: .66, sheen: .38, sheenColor: "#daa097" }],
  [/stomach|esophagus|intestin|colon|rectum|duodenum|jejunum|ileum|estomago|estômago|intestino|reto/, { tissue: "Parede gastrointestinal", color: "#ad6f67", highlight: "#e2a69a", roughness: .55, clearcoat: .2, clearcoatRoughness: .56, sheen: .36, sheenColor: "#cd8c82" }],
  [/pancreas|p[aâ]ncreas/, { tissue: "Parênquima pancreático", color: "#c99761", highlight: "#efd09c", roughness: .64, clearcoat: .1, clearcoatRoughness: .72, sheen: .24, sheenColor: "#ddb47e" }],
  [/spleen|baco|baço/, { tissue: "Parênquima esplênico", color: "#59253b", highlight: "#9a586d", roughness: .49, clearcoat: .25, clearcoatRoughness: .48, sheen: .32, sheenColor: "#783a52" }],
  [/bladder|bexiga/, { tissue: "Parede vesical", color: "#b78983", highlight: "#e5bbb1", roughness: .58, clearcoat: .16, clearcoatRoughness: .62, sheen: .34, sheenColor: "#cf9f97" }],
  [/thyroid|adrenal|pituitary|pineal|gland|tireoide|glandula|glândula/, { tissue: "Tecido glandular", color: "#a45d4a", highlight: "#dc977d", roughness: .54, clearcoat: .18, clearcoatRoughness: .57, sheen: .3, sheenColor: "#c47a64" }],
  [/testis|prostate|seminal|uterus|ovary|vagina|testiculo|testículo|prostata|próstata|utero|útero|ovario|ovário/, { tissue: "Tecido reprodutivo", color: "#9d6572", highlight: "#d99aa5", roughness: .56, clearcoat: .18, clearcoatRoughness: .6, sheen: .34, sheenColor: "#bf7f8b" }],
  [/eye|oculus|olho/, { tissue: "Globo ocular", color: "#d4d0c3", highlight: "#ffffff", roughness: .25, clearcoat: .7, clearcoatRoughness: .16, sheen: .18, sheenColor: "#edf5f5" }],
];

const fallback: OrganRealismProfile = {
  tissue: "Tecido visceral",
  color: "#8c5054",
  highlight: "#ca8585",
  roughness: .54,
  clearcoat: .2,
  clearcoatRoughness: .55,
  sheen: .3,
  sheenColor: "#a96869",
};

export function organRealismProfile(name: string): OrganRealismProfile {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return profiles.find(([pattern]) => pattern.test(normalized))?.[1] ?? fallback;
}
