export type HraSex = "female" | "male";

export type HraSystem = "Nervoso" | "Cardiovascular" | "Respiratório" | "Digestório" | "Urinário" | "Linfático e imune" | "Reprodutor" | "Sentidos" | "Musculoesquelético";

export interface HraOrganPart {
  /** Caminho público do GLB (comprimido com Draco). */
  path: string;
  label: string;
  /** Contagens medidas nos arquivos distribuídos; os testes conferem a presença e o tamanho. */
  meshCount: number;
  triangleCount: number;
  expectedMinimumBytes: number;
}

export interface HraOrgan {
  id: string;
  name: string;
  latin: string;
  system: HraSystem;
  color: string;
  summary: string;
  function: string;
  sourceId: string;
  models: Partial<Record<HraSex, HraOrganPart[]>>;
}

export const hraSystemOrder: HraSystem[] = ["Nervoso", "Cardiovascular", "Respiratório", "Digestório", "Urinário", "Linfático e imune", "Reprodutor", "Sentidos", "Musculoesquelético"];

export const hraSexLabel: Record<HraSex, string> = { female: "Mulher", male: "Homem" };

/**
 * Biblioteca de órgãos isolados do Human Reference Atlas (HRA) v1.2 — CC BY 4.0.
 * Os arquivos femininos de encéfalo, coração, pulmões, fígado e rins são os mesmos já usados no Corpo 3D.
 * Os demais foram preparados por scripts/prepare_hra_organs.sh a partir de ccf-releases/v1.2/models.
 */
export const hraOrgans: HraOrgan[] = [
  {
    id: "brain",
    name: "Encéfalo",
    latin: "Encephalon",
    system: "Nervoso",
    color: "#d9a6a0",
    summary: "Centro de controle do sistema nervoso, dentro do crânio, reunindo cérebro, cerebelo e tronco encefálico.",
    function: "Integra informações sensoriais, comanda movimentos e funções autonômicas e sustenta cognição, memória e linguagem.",
    sourceId: "nihHraBrain3D",
    models: {
      female: [{ path: "/medicine/models/nih-hra-brain-female-v1.glb", label: "Encéfalo", meshCount: 283, triangleCount: 656268, expectedMinimumBytes: 10780095 }],
      male: [{ path: "/medicine/models/hra/hra-brain-male-v1.glb", label: "Encéfalo", meshCount: 283, triangleCount: 656266, expectedMinimumBytes: 2298114 }],
    },
  },
  {
    id: "spinal-cord",
    name: "Medula espinhal",
    latin: "Medulla spinalis",
    system: "Nervoso",
    color: "#e8d7b5",
    summary: "Cordão nervoso que desce do forame magno pelo canal vertebral e termina, no adulto, na altura de L1–L2.",
    function: "Conduz sinais entre o encéfalo e o corpo e coordena os reflexos espinhais.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-spinal-cord-female-v1.glb", label: "Medula espinhal", meshCount: 29, triangleCount: 288912, expectedMinimumBytes: 536972 }],
      male: [{ path: "/medicine/models/hra/hra-spinal-cord-male-v1.glb", label: "Medula espinhal", meshCount: 30, triangleCount: 16358, expectedMinimumBytes: 84438 }],
    },
  },
  {
    id: "heart",
    name: "Coração",
    latin: "Cor",
    system: "Cardiovascular",
    color: "#c0505f",
    summary: "Órgão muscular oco de quatro câmaras, situado no mediastino médio, com valvas e septos segmentados.",
    function: "Bombeia sangue pelas circulações pulmonar e sistêmica.",
    sourceId: "nihHraHeart3D",
    models: {
      female: [{ path: "/medicine/models/nih-hra-heart-interior-v1.glb", label: "Coração", meshCount: 14, triangleCount: 85914, expectedMinimumBytes: 1570755 }],
      male: [{ path: "/medicine/models/hra/hra-heart-male-v1.glb", label: "Coração", meshCount: 14, triangleCount: 163321, expectedMinimumBytes: 382417 }],
    },
  },
  {
    id: "lungs",
    name: "Pulmões",
    latin: "Pulmones",
    system: "Respiratório",
    color: "#e0a3a0",
    summary: "Órgãos pares nas cavidades pleurais, divididos em lobos e segmentos broncopulmonares.",
    function: "Realizam as trocas gasosas: o oxigênio entra no sangue e o dióxido de carbono é eliminado.",
    sourceId: "nihHraLung3D",
    models: {
      female: [{ path: "/medicine/models/nih-hra-lung-female-v1.glb", label: "Pulmões", meshCount: 56, triangleCount: 297097, expectedMinimumBytes: 20928574 }],
      male: [{ path: "/medicine/models/hra/hra-lung-male-v1.glb", label: "Pulmões", meshCount: 67, triangleCount: 288447, expectedMinimumBytes: 890776 }],
    },
  },
  {
    id: "liver",
    name: "Fígado",
    latin: "Hepar",
    system: "Digestório",
    color: "#8e4a3c",
    summary: "Maior glândula do corpo, no hipocôndrio direito e no epigástrio, com impressões dos órgãos vizinhos.",
    function: "Metaboliza nutrientes, produz bile e proteínas plasmáticas, armazena glicogênio e processa substâncias vindas da veia porta.",
    sourceId: "nihHraLiver3D",
    models: {
      female: [{ path: "/medicine/models/nih-hra-liver-female-v1.glb", label: "Fígado", meshCount: 26, triangleCount: 93303, expectedMinimumBytes: 1564228 }],
      male: [{ path: "/medicine/models/hra/hra-liver-male-v1.glb", label: "Fígado", meshCount: 26, triangleCount: 60369, expectedMinimumBytes: 169797 }],
    },
  },
  {
    id: "pancreas",
    name: "Pâncreas",
    latin: "Pancreas",
    system: "Digestório",
    color: "#d9b27c",
    summary: "Glândula retroperitoneal com cabeça, processo uncinado, corpo e cauda; a cabeça se encaixa na curva do duodeno.",
    function: "Tem função exócrina (enzimas digestivas e bicarbonato) e endócrina (insulina e glucagon).",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-pancreas-female-v1.glb", label: "Pâncreas", meshCount: 5, triangleCount: 11480, expectedMinimumBytes: 35802 }],
      male: [{ path: "/medicine/models/hra/hra-pancreas-male-v1.glb", label: "Pâncreas", meshCount: 5, triangleCount: 14170, expectedMinimumBytes: 41450 }],
    },
  },
  {
    id: "small-intestine",
    name: "Intestino delgado",
    latin: "Intestinum tenue",
    system: "Digestório",
    color: "#d99a8a",
    summary: "Segmento do tubo digestório entre o estômago e o intestino grosso: duodeno, jejuno e íleo.",
    function: "Conclui a digestão e absorve a maior parte dos nutrientes.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-small-intestine-female-v1.glb", label: "Intestino delgado", meshCount: 9, triangleCount: 43752, expectedMinimumBytes: 126720 }],
      male: [{ path: "/medicine/models/hra/hra-small-intestine-male-v1.glb", label: "Intestino delgado", meshCount: 10, triangleCount: 33524, expectedMinimumBytes: 101548 }],
    },
  },
  {
    id: "large-intestine",
    name: "Intestino grosso",
    latin: "Intestinum crassum",
    system: "Digestório",
    color: "#c88f72",
    summary: "Segmento final do tubo digestório, que emoldura o intestino delgado: cólons ascendente, transverso e descendente, com suas flexuras.",
    function: "Absorve água e eletrólitos e forma e armazena as fezes.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-large-intestine-female-v1.glb", label: "Intestino grosso", meshCount: 10, triangleCount: 20421, expectedMinimumBytes: 68918 }],
      male: [{ path: "/medicine/models/hra/hra-large-intestine-male-v1.glb", label: "Intestino grosso", meshCount: 10, triangleCount: 34178, expectedMinimumBytes: 112050 }],
    },
  },
  {
    id: "kidneys",
    name: "Rins",
    latin: "Renes",
    system: "Urinário",
    color: "#a8514a",
    summary: "Órgãos pares retroperitoneais, com cápsula, córtex, pirâmides, colunas renais e hilo.",
    function: "Filtram o sangue, regulam líquidos, eletrólitos e pH, produzem urina e secretam hormônios como eritropoetina e renina.",
    sourceId: "nihHraKidney3D",
    models: {
      female: [{ path: "/medicine/models/nih-hra-kidney-left-female-v1.glb", label: "Rim esquerdo", meshCount: 15, triangleCount: 72788, expectedMinimumBytes: 1197810 }, { path: "/medicine/models/nih-hra-kidney-right-female-v1.glb", label: "Rim direito", meshCount: 14, triangleCount: 74283, expectedMinimumBytes: 1221278 }],
      male: [{ path: "/medicine/models/hra/hra-kidney-left-male-v1.glb", label: "Rim esquerdo", meshCount: 22, triangleCount: 83692, expectedMinimumBytes: 232246 }, { path: "/medicine/models/hra/hra-kidney-right-male-v1.glb", label: "Rim direito", meshCount: 24, triangleCount: 84088, expectedMinimumBytes: 236804 }],
    },
  },
  {
    id: "urinary-bladder",
    name: "Bexiga urinária",
    latin: "Vesica urinaria",
    system: "Urinário",
    color: "#d2a090",
    summary: "Órgão muscular oco da pelve, com cúpula, base, colo e óstios ureterais.",
    function: "Armazena a urina e a elimina pela uretra por contração do músculo detrusor.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-urinary-bladder-female-v1.glb", label: "Bexiga urinária", meshCount: 6, triangleCount: 41290, expectedMinimumBytes: 77709 }],
      male: [{ path: "/medicine/models/hra/hra-urinary-bladder-male-v1.glb", label: "Bexiga urinária", meshCount: 6, triangleCount: 10073, expectedMinimumBytes: 31489 }],
    },
  },
  {
    id: "spleen",
    name: "Baço",
    latin: "Splen / Lien",
    system: "Linfático e imune",
    color: "#7e4058",
    summary: "Maior órgão linfático, no hipocôndrio esquerdo, com faces diafragmática, gástrica e cólica.",
    function: "Filtra o sangue, remove hemácias envelhecidas e participa de respostas imunes.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-spleen-female-v1.glb", label: "Baço", meshCount: 5, triangleCount: 8544, expectedMinimumBytes: 44827 }],
      male: [{ path: "/medicine/models/hra/hra-spleen-male-v1.glb", label: "Baço", meshCount: 5, triangleCount: 16872, expectedMinimumBytes: 84412 }],
    },
  },
  {
    id: "thymus",
    name: "Timo",
    latin: "Thymus",
    system: "Linfático e imune",
    color: "#e3c4a8",
    summary: "Órgão linfático do mediastino superior, com dois lobos; é mais ativo na infância e involui com a idade.",
    function: "É o local de maturação dos linfócitos T.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-thymus-female-v1.glb", label: "Timo", meshCount: 2, triangleCount: 3864, expectedMinimumBytes: 12978 }],
      male: [{ path: "/medicine/models/hra/hra-thymus-male-v1.glb", label: "Timo", meshCount: 2, triangleCount: 2730, expectedMinimumBytes: 10432 }],
    },
  },
  {
    id: "lymph-node",
    name: "Linfonodo",
    latin: "Nodus lymphaticus",
    system: "Linfático e imune",
    color: "#b9a27c",
    summary: "Estrutura em forma de feijão ao longo dos vasos linfáticos, com cápsula, folículos e vasos aferentes e eferentes.",
    function: "Filtra a linfa e abriga respostas imunes de linfócitos B e T.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-lymph-node-female-v1.glb", label: "Linfonodo", meshCount: 7, triangleCount: 254663, expectedMinimumBytes: 694090 }],
      male: [{ path: "/medicine/models/hra/hra-lymph-node-male-v1.glb", label: "Linfonodo", meshCount: 7, triangleCount: 254663, expectedMinimumBytes: 695595 }],
    },
  },
  {
    id: "uterus",
    name: "Útero",
    latin: "Uterus",
    system: "Reprodutor",
    color: "#cf8f98",
    summary: "Órgão muscular oco da pelve feminina, com fundo, corpo e colo, ligado às tubas uterinas.",
    function: "Abriga a implantação e o desenvolvimento do embrião e do feto; o endométrio descama na menstruação.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-uterus-female-v1.glb", label: "Útero", meshCount: 10, triangleCount: 37184, expectedMinimumBytes: 92098 }],
    },
  },
  {
    id: "placenta",
    name: "Placenta",
    latin: "Placenta",
    system: "Reprodutor",
    color: "#a24a52",
    summary: "Órgão materno-fetal formado na gestação, com placa basal, placa coriônica e vasos placentários.",
    function: "Permite a troca de gases, nutrientes e resíduos entre mãe e feto e produz hormônios, como a hCG e a progesterona.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-placenta-female-v1.glb", label: "Placenta", meshCount: 8, triangleCount: 188361, expectedMinimumBytes: 397922 }],
    },
  },
  {
    id: "prostate",
    name: "Próstata e vesículas seminais",
    latin: "Prostata",
    system: "Reprodutor",
    color: "#d6a58f",
    summary: "Glândula do sistema reprodutor masculino logo abaixo da bexiga, ao redor da uretra; a malha inclui também as vesículas seminais e os ductos deferentes.",
    function: "A próstata e as vesículas seminais produzem a maior parte do líquido seminal.",
    sourceId: "hraReferenceLibrary",
    models: {
      male: [{ path: "/medicine/models/hra/hra-prostate-male-v1.glb", label: "Próstata", meshCount: 18, triangleCount: 224676, expectedMinimumBytes: 453888 }],
    },
  },
  {
    id: "eye",
    name: "Olhos",
    latin: "Oculi",
    system: "Sentidos",
    color: "#e4dccb",
    summary: "Globos oculares com esclera, córnea, íris, pupila, cristalino, corpo ciliar, coroide, retina (com mácula, fóvea e disco óptico), humores aquoso e vítreo, além da conjuntiva das pálpebras.",
    function: "Focalizam a luz sobre a retina, onde fotorreceptores a convertem em sinais nervosos enviados ao encéfalo pelo nervo óptico.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-eye-left-female-v1.glb", label: "Olho esquerdo", meshCount: 23, triangleCount: 455290, expectedMinimumBytes: 900000 }, { path: "/medicine/models/hra/hra-eye-right-female-v1.glb", label: "Olho direito", meshCount: 23, triangleCount: 455082, expectedMinimumBytes: 900000 }],
      male: [{ path: "/medicine/models/hra/hra-eye-left-male-v1.glb", label: "Olho esquerdo", meshCount: 23, triangleCount: 455290, expectedMinimumBytes: 900000 }, { path: "/medicine/models/hra/hra-eye-right-male-v1.glb", label: "Olho direito", meshCount: 23, triangleCount: 455082, expectedMinimumBytes: 900000 }],
    },
  },
  {
    id: "uterine-tube",
    name: "Tubas uterinas",
    latin: "Tubae uterinae",
    system: "Reprodutor",
    color: "#d89aa0",
    summary: "Pares de tubos musculares que ligam a região dos ovários ao útero, divididos em infundíbulo com fímbrias, ampola e istmo.",
    function: "Captam o oócito ovulado, é nelas que costuma ocorrer a fecundação, e transportam o embrião inicial até o útero.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-fallopian-tube-left-female-v1.glb", label: "Tuba uterina esquerda", meshCount: 4, triangleCount: 18281, expectedMinimumBytes: 45000 }, { path: "/medicine/models/hra/hra-fallopian-tube-right-female-v1.glb", label: "Tuba uterina direita", meshCount: 4, triangleCount: 17770, expectedMinimumBytes: 45000 }],
    },
  },
  {
    id: "ureter",
    name: "Ureteres e vias coletoras",
    latin: "Ureteres",
    system: "Urinário",
    color: "#d7b46a",
    summary: "Cálices menores e maiores, pelve renal e ureteres, que levam a urina de cada rim até a bexiga.",
    function: "Coletam a urina formada no rim e a conduzem por peristaltismo até a bexiga urinária.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-ureter-left-female-v1.glb", label: "Ureter esquerdo", meshCount: 27, triangleCount: 36964, expectedMinimumBytes: 110000 }, { path: "/medicine/models/hra/hra-ureter-right-female-v1.glb", label: "Ureter direito", meshCount: 25, triangleCount: 33171, expectedMinimumBytes: 100000 }],
      male: [{ path: "/medicine/models/hra/hra-ureter-left-male-v1.glb", label: "Ureter esquerdo", meshCount: 14, triangleCount: 30618, expectedMinimumBytes: 85000 }, { path: "/medicine/models/hra/hra-ureter-right-male-v1.glb", label: "Ureter direito", meshCount: 13, triangleCount: 28410, expectedMinimumBytes: 80000 }],
    },
  },
  {
    id: "knee",
    name: "Joelho esquerdo",
    latin: "Genu",
    system: "Musculoesquelético",
    color: "#e6dcc3",
    summary: "Fêmur, tíbia, fíbula e patela com cartilagem articular, menisco, côndilos, fossa intercondilar e as inserções dos ligamentos cruzados.",
    function: "Permite flexão e extensão do membro inferior, suporta carga e contribui para a estabilidade da marcha.",
    sourceId: "hraReferenceLibrary",
    models: {
      female: [{ path: "/medicine/models/hra/hra-knee-left-female-v1.glb", label: "Joelho esquerdo", meshCount: 20, triangleCount: 17844, expectedMinimumBytes: 60000 }],
      male: [{ path: "/medicine/models/hra/hra-knee-left-male-v1.glb", label: "Joelho esquerdo", meshCount: 20, triangleCount: 22892, expectedMinimumBytes: 70000 }],
    },
  },
];

export function hraOrganById(id: string) {
  return hraOrgans.find((organ) => organ.id === id);
}

export function hraAvailableSexes(organ: HraOrgan): HraSex[] {
  return (["female", "male"] as const).filter((sex) => (organ.models[sex]?.length ?? 0) > 0);
}

/** Mantém o sexo pedido quando existe para o órgão; caso contrário usa o que estiver disponível. */
export function hraResolveSex(organ: HraOrgan, preferred: HraSex): HraSex {
  const available = hraAvailableSexes(organ);
  return available.includes(preferred) ? preferred : available[0];
}

export function hraPartsFor(organ: HraOrgan, sex: HraSex): HraOrganPart[] {
  return organ.models[hraResolveSex(organ, sex)] ?? [];
}

export function hraModelTotals(parts: HraOrganPart[]) {
  return parts.reduce((total, part) => ({
    meshCount: total.meshCount + part.meshCount,
    triangleCount: total.triangleCount + part.triangleCount,
  }), { meshCount: 0, triangleCount: 0 });
}

/** Nome da malha como aparece no modelo (inglês), sem prefixos de origem e sem sublinhados. */
export function cleanHraMeshName(raw: string) {
  return raw
    .replace(/^(?:VH|Allen|Yao|SBU|NIH)_(?:[FM]_)?/, "")
    .replace(/_+/g, " ")
    .trim();
}
