export interface HistologySource {
  title: string;
  organization: string;
  url: string;
  reviewedAt: string;
  license: string;
  attribution: string;
}

export type HistologyAssetKind = "micrograph" | "schematic" | "anatomical" | "model3d";
export type MicroscopeObjective = "4x" | "10x" | "40x" | "100x";

export interface HistologyHotspot {
  id: string;
  name: string;
  latin?: string;
  summary: string;
  function: string;
  sourceId: string;
  x: number;
  y: number;
}

export interface MicroscopeLevel {
  objective: MicroscopeObjective;
  label: string;
  image: string;
  assetKind: HistologyAssetKind;
  alt: string;
  note: string;
  sourceId: string;
  hotspots: HistologyHotspot[];
}

export interface HistologySpecimen {
  id: string;
  name: string;
  latin?: string;
  category: "sensorial" | "oral" | "tecido básico";
  summary: string;
  function: string;
  sourceId: string;
  levels: MicroscopeLevel[];
}

export interface CellOrganelle extends HistologyHotspot {
  latin: string;
}

export interface BasicTissue {
  id: string;
  name: string;
  summary: string;
  function: string;
  subtypes: string[];
  image: string;
  assetKind: HistologyAssetKind;
  sourceId: string;
}

export const histologySources: Record<string, HistologySource> = {
  "zanatomy-models": {
    title: "Modelos anatômicos tridimensionais",
    organization: "Z-Anatomy / BodyParts3D",
    url: "https://www.z-anatomy.com/",
    reviewedAt: "2026-08-26",
    license: "CC BY-SA 4.0",
    attribution: "Z-Anatomy e BodyParts3D; conversões GLB e atribuições detalhadas em public/medicine/models/ATTRIBUTION.md.",
  },
  "openstax-cell": {
    title: "Citoplasma e organelas celulares",
    organization: "OpenStax — Anatomy and Physiology 2e",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/3-2-the-cytoplasm-and-cellular-organelles",
    reviewedAt: "2026-08-26",
    license: "CC BY 4.0",
    attribution: "OpenStax, Rice University. A&P 2e, seção 3.2.",
  },
  "openstax-tissues": {
    title: "Tipos de tecidos",
    organization: "OpenStax — Anatomy and Physiology 2e",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/4-1-types-of-tissues",
    reviewedAt: "2026-08-26",
    license: "CC BY 4.0",
    attribution: "OpenStax, Rice University. A&P 2e, capítulo 4.",
  },
  "openstax-eye": {
    title: "Percepção sensorial — olho e retina",
    organization: "OpenStax — Anatomy and Physiology",
    url: "https://openstax.org/books/anatomy-and-physiology/pages/14-1-sensory-perception",
    reviewedAt: "2026-08-26",
    license: "CC BY 4.0",
    attribution: "OpenStax, Rice University. Seção sobre olho e retina.",
  },
  "openstax-eye-muscles": {
    title: "Músculos axiais da cabeça, pescoço e dorso",
    organization: "OpenStax — Anatomy and Physiology 2e",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back",
    reviewedAt: "2026-08-26",
    license: "CC BY 4.0",
    attribution: "OpenStax, Rice University. A&P 2e, seção 11.3.",
  },
  "openstax-oral": {
    title: "Boca, faringe e esôfago",
    organization: "OpenStax — Anatomy and Physiology 2e",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/23-3-the-mouth-pharynx-and-esophagus",
    reviewedAt: "2026-08-26",
    license: "CC BY 4.0",
    attribution: "OpenStax, Rice University. A&P 2e, seção 23.3.",
  },
  "commons-eye-photo": {
    title: "Fotografia em alta resolução de olho humano",
    organization: "Wikimedia Commons / Lourie Pieterse",
    url: "https://commons.wikimedia.org/wiki/File:Close_up_of_eye.jpg",
    reviewedAt: "2026-08-26",
    license: "CC BY-SA 3.0",
    attribution: "Lourie Pieterse. Close up of eye. Wikimedia Commons.",
  },
  "commons-mouth-external": {
    title: "Fotografia em alta resolução da boca humana",
    organization: "Wikimedia Commons / Wikimedia Sverige",
    url: "https://commons.wikimedia.org/wiki/File:Adult_human_mouth.jpg",
    reviewedAt: "2026-08-26",
    license: "CC BY-SA 4.0",
    attribution: "Genusfotografen (Tomas Gunnarsson) / Wikimedia Sverige.",
  },
  "commons-oral-photo": {
    title: "Fotografia clínica do palato e da úvula",
    organization: "Wikimedia Commons / Luigithemetal64",
    url: "https://commons.wikimedia.org/wiki/File:Palatine_Uvula.jpg",
    reviewedAt: "2026-08-26",
    license: "CC BY-SA 3.0",
    attribution: "Luigithemetal64. Palatine Uvula. Wikimedia Commons.",
  },
  "nih-hela": {
    title: "Células HeLa em microscopia multiphoton",
    organization: "National Institutes of Health / Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:HeLa-I.jpg",
    reviewedAt: "2026-08-26",
    license: "Domínio público — obra do governo federal dos EUA",
    attribution: "National Institutes of Health (NIH). HeLa-I.",
  },
  "commons-retina": {
    title: "Retina — série de micrografias em ampliações crescentes",
    organization: "Wikimedia Commons / Librepath",
    url: "https://commons.wikimedia.org/wiki/Category:Histology_of_retina",
    reviewedAt: "2026-08-26",
    license: "CC BY-SA 3.0",
    attribution: "Librepath. Optic nerve head and retina; Retina intermed mag; Retina high mag.",
  },
  "commons-nervous": {
    title: "Tecido nervoso",
    organization: "Wikimedia Commons / OpenStax College",
    url: "https://commons.wikimedia.org/wiki/File:416_Nervous_Tissue-new.jpg",
    reviewedAt: "2026-08-26",
    license: "CC BY 3.0",
    attribution: "OpenStax College, 416 Nervous Tissue-new.",
  },
  "commons-salivary": {
    title: "Corte histológico de glândula salivar",
    organization: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Histological_section_of_salivary_gland,_with_zoom.jpg",
    reviewedAt: "2026-08-26",
    license: "CC BY 4.0",
    attribution: "Otávio Astor Vaz Costa.",
  },
};

const retinaCommon = (id: string, name: string, summary: string, fn: string, x: number, y: number): HistologyHotspot => ({
  id, name, summary, function: fn, sourceId: "commons-retina", x, y,
});

export const histologySpecimens: HistologySpecimen[] = [
  {
    id: "retina",
    name: "Retina",
    latin: "Retina",
    category: "sensorial",
    summary: "Tecido nervoso estratificado que converte luz em sinais elétricos e inicia o processamento visual.",
    function: "Bastonetes e cones realizam fototransdução; circuitos internos modulam o sinal antes de ele seguir pelo nervo óptico.",
    sourceId: "openstax-eye",
    levels: [
      {
        objective: "4x", label: "Baixa ampliação", image: "/medicine/histology/commons/retina-low.jpg", assetKind: "micrograph",
        alt: "Micrografia real de retina e cabeça do nervo óptico em baixa ampliação.",
        note: "Visão panorâmica do tecido. O valor 4x indica a etapa didática do seletor; a ampliação de aquisição deve ser conferida na fonte.",
        sourceId: "commons-retina", hotspots: [retinaCommon("optic-disc", "Disco óptico", "Região onde os axônios deixam o globo ocular.", "Forma a cabeça do nervo óptico e corresponde ao ponto cego fisiológico.", 43, 50)],
      },
      {
        objective: "10x", label: "Ampliação intermediária", image: "/medicine/histology/commons/retina-intermediate.jpg", assetKind: "micrograph",
        alt: "Micrografia real de retina em ampliação intermediária.",
        note: "A estratificação da retina torna-se mais evidente. O valor 10x é uma etapa didática, não uma alegação sobre a objetiva usada na captura.",
        sourceId: "commons-retina", hotspots: [retinaCommon("retinal-layers", "Camadas da retina", "Conjunto ordenado de camadas nucleares e plexiformes.", "Organiza a transmissão entre fotorreceptores, células bipolares e células ganglionares.", 57, 48)],
      },
      {
        objective: "40x", label: "Alta ampliação", image: "/medicine/histology/commons/retina-high.jpg", assetKind: "micrograph",
        alt: "Micrografia real de retina em alta ampliação.",
        note: "Micrografia real para observar a organização celular. O valor 40x representa a etapa didática do microscópio.",
        sourceId: "commons-retina", hotspots: [retinaCommon("ganglion-cell-layer", "Camada de células ganglionares", "Camada interna contendo corpos celulares de neurônios de saída da retina.", "Seus axônios convergem para formar o nervo óptico.", 54, 34)],
      },
      {
        objective: "100x", label: "Detalhe celular esquemático", image: "/medicine/histology/openstax/retina-photoreceptors.jpg", assetKind: "schematic",
        alt: "Esquema rotulado de bastonetes e cones da retina.",
        note: "Esquema didático rotulado — não é uma micrografia nem simula um aumento inexistente.",
        sourceId: "openstax-eye", hotspots: [
          { id: "rods", name: "Bastonetes", latin: "Cellulae bacilliformes", summary: "Fotorreceptores muito sensíveis à luz.", function: "Sustentam a visão em baixa luminosidade, sem discriminação fina de cores.", sourceId: "openstax-eye", x: 40, y: 42 },
          { id: "cones", name: "Cones", latin: "Cellulae coniformes", summary: "Fotorreceptores especializados em acuidade e cor.", function: "Respondem de modo diferencial aos comprimentos de onda e predominam na fóvea.", sourceId: "openstax-eye", x: 62, y: 45 },
          { id: "ganglion-cells", name: "Células ganglionares", summary: "Neurônios de saída da retina.", function: "Integram sinais das células bipolares e enviam potenciais de ação ao encéfalo.", sourceId: "openstax-eye", x: 53, y: 76 },
        ],
      },
    ],
  },
  {
    id: "salivary-gland",
    name: "Glândula salivar",
    latin: "Glandula salivaria",
    category: "oral",
    summary: "Glândula exócrina organizada em unidades secretoras e ductos.",
    function: "Produz e conduz saliva, contribuindo para lubrificação, proteção e digestão inicial.",
    sourceId: "openstax-oral",
    levels: [{
      objective: "40x", label: "Tecido glandular", image: "/medicine/histology/commons/salivary-gland.jpg", assetKind: "micrograph",
      alt: "Micrografia real de corte histológico de glândula salivar.", note: "Micrografia real licenciada. A estrutura exata deve ser confirmada pela legenda da fonte.",
      sourceId: "commons-salivary", hotspots: [
        { id: "salivary-acini", name: "Ácinos", summary: "Unidades terminais secretoras.", function: "Produzem os componentes aquosos, enzimáticos ou mucosos da saliva.", sourceId: "openstax-oral", x: 32, y: 44 },
        { id: "salivary-duct", name: "Ducto glandular", summary: "Canal revestido por epitélio.", function: "Conduz e modifica a secreção antes de ela alcançar a cavidade oral.", sourceId: "openstax-oral", x: 70, y: 50 },
      ],
    }],
  },
  {
    id: "tooth",
    name: "Dente em corte",
    latin: "Dens",
    category: "oral",
    summary: "Estrutura mineralizada composta por esmalte, dentina e uma cavidade pulpar vascularizada e inervada.",
    function: "Corta ou tritura alimentos e transmite forças mastigatórias ao periodonto.",
    sourceId: "openstax-oral",
    levels: [{
      objective: "100x", label: "Corte esquemático", image: "/medicine/histology/openstax/tooth-section.jpg", assetKind: "schematic",
      alt: "Esquema rotulado de um dente em corte.", note: "Esquema anatômico rotulado — não é uma lâmina histológica nem uma falsa micrografia.",
      sourceId: "openstax-oral", hotspots: [
        { id: "tooth-enamel-micro", name: "Esmalte", summary: "Revestimento altamente mineralizado da coroa.", function: "Resiste ao desgaste e protege a dentina subjacente.", sourceId: "openstax-oral", x: 49, y: 26 },
        { id: "tooth-dentin-micro", name: "Dentina", summary: "Tecido mineralizado que constitui a maior parte do dente.", function: "Sustenta o esmalte e envolve a cavidade pulpar.", sourceId: "openstax-oral", x: 51, y: 42 },
        { id: "tooth-pulp-micro", name: "Polpa dentária", summary: "Tecido conjuntivo interno com vasos e nervos.", function: "Nutre o dente, conduz sensibilidade e participa de reparo.", sourceId: "openstax-oral", x: 51, y: 55 },
      ],
    }],
  },
  {
    id: "tongue-papillae",
    name: "Papilas e botões gustativos",
    latin: "Papillae linguales",
    category: "oral",
    summary: "Especializações da mucosa lingual com funções mecânicas ou gustativas, conforme o tipo de papila.",
    function: "Organizam a superfície da língua e, quando contêm botões gustativos, participam da transdução química do paladar.",
    sourceId: "openstax-oral",
    levels: [{
      objective: "100x", label: "Esquema gustativo", image: "/medicine/histology/openstax/tongue-taste.jpg", assetKind: "schematic",
      alt: "Esquema rotulado das papilas da língua e de um botão gustativo.", note: "Esquema didático rotulado — não é uma micrografia.",
      sourceId: "openstax-oral", hotspots: [
        { id: "taste-bud", name: "Botão gustativo", summary: "Conjunto de células receptoras e de suporte no epitélio.", function: "Converte estímulos químicos dissolvidos em sinais neurais gustativos.", sourceId: "openstax-oral", x: 67, y: 53 },
        { id: "taste-pore", name: "Poro gustativo", summary: "Pequena abertura apical do botão gustativo.", function: "Permite que substâncias dissolvidas alcancem microvilosidades receptoras.", sourceId: "openstax-oral", x: 75, y: 38 },
      ],
    }],
  },
  {
    id: "epithelial",
    name: "Tecido epitelial",
    latin: "Textus epithelialis",
    category: "tecido básico",
    summary: "Tecido de células justapostas que reveste superfícies e forma unidades glandulares.",
    function: "Protege, absorve, secreta, filtra e controla trocas conforme sua organização.",
    sourceId: "openstax-tissues",
    levels: [{
      objective: "40x", label: "Tipos de epitélio", image: "/medicine/histology/openstax/epithelial-types.jpg", assetKind: "schematic",
      alt: "Quadro esquemático dos principais tipos de epitélio.", note: "Quadro esquemático de referência — cada subtipo é identificado como ilustração, não como micrografia.",
      sourceId: "openstax-tissues", hotspots: [
        { id: "simple-epithelium", name: "Epitélio simples", summary: "Epitélio formado por uma camada de células.", function: "Favorece trocas, absorção ou secreção, conforme o formato celular.", sourceId: "openstax-tissues", x: 30, y: 36 },
        { id: "stratified-epithelium", name: "Epitélio estratificado", summary: "Epitélio com duas ou mais camadas celulares.", function: "Oferece proteção mecânica e renovação nas superfícies expostas.", sourceId: "openstax-tissues", x: 70, y: 62 },
      ],
    }],
  },
  {
    id: "connective",
    name: "Tecido conjuntivo",
    latin: "Textus connectivus",
    category: "tecido básico",
    summary: "Tecido cujas células se distribuem em matriz extracelular com fibras e substância fundamental.",
    function: "Conecta, sustenta, protege, armazena energia e participa de transporte e reparo.",
    sourceId: "openstax-tissues",
    levels: [{
      objective: "40x", label: "Conjuntivo denso", image: "/medicine/histology/openstax/connective-dense.jpg", assetKind: "schematic",
      alt: "Referência didática de tecido conjuntivo denso.", note: "Prancha didática licenciada. Consulte o crédito incorporado e a fonte para os detalhes de aquisição.",
      sourceId: "openstax-tissues", hotspots: [
        { id: "collagen-fibers", name: "Fibras colágenas", summary: "Feixes proteicos resistentes à tração.", function: "Conferem resistência mecânica ao tecido conjuntivo.", sourceId: "openstax-tissues", x: 46, y: 48 },
        { id: "fibroblasts", name: "Fibroblastos", summary: "Células residentes produtoras de matriz extracelular.", function: "Sintetizam fibras e componentes da substância fundamental.", sourceId: "openstax-tissues", x: 65, y: 55 },
      ],
    }],
  },
  {
    id: "muscular",
    name: "Tecido muscular",
    latin: "Textus muscularis",
    category: "tecido básico",
    summary: "Tecido formado por células especializadas na contração por filamentos de actina e miosina.",
    function: "Produz movimento, estabiliza estruturas e impulsiona sangue ou conteúdos viscerais.",
    sourceId: "openstax-tissues",
    levels: [{
      objective: "40x", label: "Três tipos musculares", image: "/medicine/histology/openstax/muscle-types.jpg", assetKind: "schematic",
      alt: "Prancha comparativa de músculo esquelético, cardíaco e liso.", note: "Prancha didática comparativa licenciada; os créditos originais permanecem vinculados à fonte.",
      sourceId: "openstax-tissues", hotspots: [
        { id: "skeletal-muscle", name: "Músculo esquelético", summary: "Fibras longas, estriadas e multinucleadas.", function: "Produz movimento voluntário e estabilização postural.", sourceId: "openstax-tissues", x: 21, y: 52 },
        { id: "cardiac-muscle", name: "Músculo cardíaco", summary: "Células estriadas ramificadas unidas por discos intercalares.", function: "Gera contrações rítmicas coordenadas do coração.", sourceId: "openstax-tissues", x: 50, y: 52 },
        { id: "smooth-muscle", name: "Músculo liso", summary: "Células fusiformes não estriadas ao microscópio óptico.", function: "Controla o calibre e a motilidade de vísceras e vasos.", sourceId: "openstax-tissues", x: 79, y: 52 },
      ],
    }],
  },
  {
    id: "nervous-tissue",
    name: "Tecido nervoso",
    latin: "Textus nervosus",
    category: "tecido básico",
    summary: "Tecido formado por neurônios e células da glia.",
    function: "Recebe, integra e transmite informações por sinais elétricos e químicos.",
    sourceId: "openstax-tissues",
    levels: [{
      objective: "40x", label: "Neurônios e neuroglia", image: "/medicine/histology/commons/nervous-tissue.jpg", assetKind: "micrograph",
      alt: "Micrografia rotulada de tecido nervoso.", note: "Imagem educacional licenciada com micrografia e rótulos de referência.",
      sourceId: "commons-nervous", hotspots: [
        { id: "neuron-soma", name: "Corpo celular do neurônio", summary: "Região que contém núcleo e grande parte das organelas.", function: "Mantém o metabolismo e integra sinais que chegam ao neurônio.", sourceId: "commons-nervous", x: 50, y: 49 },
      ],
    }],
  },
];

export const cellOrganelles: CellOrganelle[] = [
  { id: "nucleus", name: "Núcleo", latin: "Nucleus", summary: "Compartimento delimitado pelo envoltório nuclear.", function: "Armazena o DNA e coordena a expressão gênica.", sourceId: "openstax-cell", x: 46, y: 43 },
  { id: "mitochondrion", name: "Mitocôndria", latin: "Mitochondrium", summary: "Organela com dupla membrana e cristas internas.", function: "Participa da respiração celular e da produção de ATP.", sourceId: "openstax-cell", x: 66, y: 67 },
  { id: "rough-er", name: "Retículo endoplasmático rugoso", latin: "Reticulum endoplasmicum granulosum", summary: "Rede membranosa associada a ribossomos.", function: "Sintetiza e inicia o processamento de proteínas secretadas ou de membrana.", sourceId: "openstax-cell", x: 34, y: 56 },
  { id: "smooth-er", name: "Retículo endoplasmático liso", latin: "Reticulum endoplasmicum agranulare", summary: "Rede membranosa sem ribossomos aderidos.", function: "Participa da síntese lipídica, detoxificação e armazenamento de cálcio.", sourceId: "openstax-cell", x: 71, y: 36 },
  { id: "golgi", name: "Complexo de Golgi", latin: "Apparatus Golgiensis", summary: "Conjunto de cisternas membranosas empilhadas.", function: "Modifica, classifica e direciona proteínas e lipídios.", sourceId: "openstax-cell", x: 62, y: 48 },
  { id: "plasma-membrane", name: "Membrana plasmática", latin: "Membrana cellularis", summary: "Bicamada lipídica que delimita a célula.", function: "Controla trocas e participa da comunicação celular.", sourceId: "openstax-cell", x: 85, y: 55 },
  { id: "cytoplasm", name: "Citoplasma", latin: "Cytoplasma", summary: "Conteúdo celular entre a membrana e o núcleo.", function: "Abriga organelas e muitas reações metabólicas.", sourceId: "openstax-cell", x: 57, y: 59 },
];

export const realCellImage = "/medicine/histology/real/hela-cell-real.jpg";

export const realCellFeatures: HistologyHotspot[] = [
  {
    id: "hela-nucleus", name: "Núcleo (DNA em ciano)", summary: "Região nuclear evidenciada pela contracoloração fluorescente do DNA.",
    function: "Armazena o material genético e organiza processos como transcrição e replicação.", sourceId: "nih-hela", x: 54, y: 51,
  },
  {
    id: "hela-golgi", name: "Complexo de Golgi (laranja)", summary: "Compartimento marcado por proteína fluorescente direcionada ao aparelho de Golgi.",
    function: "Modifica, classifica e encaminha proteínas e lipídios para seus destinos celulares.", sourceId: "nih-hela", x: 48, y: 59,
  },
  {
    id: "hela-microtubules", name: "Microtúbulos (verde)", summary: "Rede do citoesqueleto revelada por marcação fluorescente específica.",
    function: "Contribui para forma celular, transporte intracelular, posicionamento de organelas e divisão celular.", sourceId: "nih-hela", x: 64, y: 47,
  },
];

export const basicTissues: BasicTissue[] = [
  { id: "epithelial", name: "Tecido epitelial", summary: "Células justapostas com pouca matriz extracelular, apoiadas sobre membrana basal.", function: "Reveste superfícies e participa de proteção, absorção, secreção e filtração.", subtypes: ["Simples pavimentoso", "Simples cúbico", "Simples colunar", "Estratificado pavimentoso"], image: "/medicine/histology/openstax/epithelial-types.jpg", assetKind: "schematic", sourceId: "openstax-tissues" },
  { id: "connective", name: "Tecido conjuntivo", summary: "Células distribuídas em matriz extracelular com fibras e substância fundamental.", function: "Sustenta, conecta, protege, armazena energia e participa do transporte.", subtypes: ["Frouxo", "Denso", "Adiposo", "Cartilaginoso", "Ósseo"], image: "/medicine/histology/openstax/connective-dense.jpg", assetKind: "schematic", sourceId: "openstax-tissues" },
  { id: "muscular", name: "Tecido muscular", summary: "Tecido especializado em contração por interação de filamentos proteicos.", function: "Produz movimento, estabiliza estruturas e impulsiona conteúdos corporais.", subtypes: ["Liso", "Esquelético", "Cardíaco"], image: "/medicine/histology/openstax/muscle-types.jpg", assetKind: "schematic", sourceId: "openstax-tissues" },
  { id: "nervous", name: "Tecido nervoso", summary: "Neurônios e células gliais organizados para comunicação rápida.", function: "Detecta estímulos, integra informações e coordena respostas.", subtypes: ["Neurônios", "Astrócitos", "Oligodendrócitos", "Micróglia"], image: "/medicine/histology/commons/nervous-tissue.jpg", assetKind: "micrograph", sourceId: "commons-nervous" },
];

export function histologySourceFor(sourceId: string) {
  return histologySources[sourceId];
}
