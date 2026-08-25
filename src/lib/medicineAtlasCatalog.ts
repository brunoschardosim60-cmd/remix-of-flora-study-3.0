import type { AtlasPosition, AtlasView, BodyLayer } from "./medicineData";

export interface AtlasCatalogSeed {
  id: string;
  name: string;
  latin?: string;
  layer: BodyLayer;
  system: string;
  region: string;
  summary: string;
  function: string;
  relations: string;
  nearby: string[];
  synonyms: string[];
  sourceId: string;
  positions: Partial<Record<AtlasView, AtlasPosition>>;
}

type CatalogRow = [
  id: string,
  name: string,
  region: string,
  functionText: string,
  positions: Partial<Record<AtlasView, AtlasPosition>>,
  latin?: string,
  synonyms?: string[],
  sourceId?: string,
];

const point = (x: number, y: number): AtlasPosition => ({ x, y });
const anterior = (x: number, y: number): Partial<Record<AtlasView, AtlasPosition>> => ({ anterior: point(x, y) });
const posterior = (x: number, y: number): Partial<Record<AtlasView, AtlasPosition>> => ({ posterior: point(x, y) });
const both = (x: number, y: number, posteriorX = 100 - x, posteriorY = y): Partial<Record<AtlasView, AtlasPosition>> => ({
  anterior: point(x, y),
  posterior: point(posteriorX, posteriorY),
});

const layerMeta: Record<BodyLayer, { system: string; noun: string }> = {
  surface: { system: "Anatomia de superfície", noun: "região de superfície" },
  muscular: { system: "Musculoesquelético", noun: "estrutura muscular" },
  skeletal: { system: "Esquelético", noun: "estrutura óssea" },
  vascular: { system: "Cardiovascular", noun: "estrutura vascular" },
  nervous: { system: "Nervoso", noun: "estrutura nervosa" },
  organs: { system: "Anatomia visceral", noun: "estrutura visceral ou glandular" },
};

function makeGroup(layer: BodyLayer, defaultSourceId: string, rows: CatalogRow[]): AtlasCatalogSeed[] {
  const meta = layerMeta[layer];
  return rows.map(([id, name, region, functionText, positions, latin, synonyms, sourceId]) => ({
    id,
    name,
    latin,
    layer,
    system: meta.system,
    region,
    summary: `${name} é uma ${meta.noun} identificável na região ${region.toLocaleLowerCase("pt-BR")}.`,
    function: functionText,
    relations: "A posição do marcador é aproximada no modelo de corpo inteiro; use a fonte vinculada e vistas regionais para relações anatômicas detalhadas.",
    nearby: [],
    synonyms: Array.from(new Set([name.toLocaleLowerCase("pt-BR"), ...(synonyms ?? [])])),
    sourceId: sourceId ?? defaultSourceId,
    positions,
  }));
}

const surfaceStructures = makeGroup("surface", "openstaxSkin", [
  ["scalp", "Couro cabeludo", "cabeça", "Reveste e protege a calvária, sustentando pelos e estruturas cutâneas.", both(50, 4, 50, 4), "Cutis capitis"],
  ["frontal-region", "Região frontal", "fronte", "Referência superficial anterior da cabeça.", anterior(50, 6)],
  ["orbital-region", "Região orbital", "face", "Delimita superficialmente a área ao redor dos olhos.", anterior(46, 8)],
  ["nasal-region", "Região nasal", "face", "Referência superficial central da face.", anterior(50, 9)],
  ["oral-region", "Região oral", "face", "Delimita lábios e abertura da cavidade oral.", anterior(50, 11)],
  ["auricular-region", "Região auricular", "cabeça", "Marca a área externa da orelha.", both(42, 9, 58, 9)],
  ["anterior-cervical-region", "Região cervical anterior", "pescoço", "Referência superficial da porção anterior do pescoço.", anterior(50, 15)],
  ["posterior-cervical-region", "Região cervical posterior", "pescoço", "Referência superficial da nuca.", posterior(50, 15)],
  ["acromial-region", "Região acromial", "ombro", "Marca o ponto mais lateral e superior do ombro.", both(36, 19, 64, 19)],
  ["axillary-region", "Região axilar", "axila", "Área de transição entre o membro superior e o tórax.", anterior(38, 25)],
  ["sternal-region", "Região esternal", "tórax", "Referência superficial mediana do tórax anterior.", anterior(50, 25)],
  ["pectoral-region", "Região peitoral", "tórax", "Referência superficial da parede torácica anterior.", anterior(42, 24)],
  ["mammary-region", "Região mamária", "tórax", "Área superficial sobre a parede torácica anterior.", anterior(57, 27)],
  ["abdominal-region", "Região abdominal", "abdome", "Referência superficial entre o tórax e a pelve.", anterior(50, 39)],
  ["umbilical-region", "Região umbilical", "abdome", "Região central do abdome ao redor do umbigo.", anterior(50, 40)],
  ["inguinal-region", "Região inguinal", "virilha", "Transição superficial entre abdome inferior e coxa.", anterior(43, 51)],
  ["dorsal-region", "Região dorsal", "dorso", "Grande área superficial posterior do tronco.", posterior(50, 29)],
  ["scapular-region", "Região escapular", "dorso superior", "Referência superficial sobre a escápula.", posterior(42, 25)],
  ["lumbar-region", "Região lombar", "dorso inferior", "Área superficial entre as costelas inferiores e a pelve.", posterior(50, 42)],
  ["gluteal-region", "Região glútea", "nádega", "Região posterior da pelve e do quadril.", posterior(43, 53)],
  ["brachial-region", "Região braquial", "braço", "Área superficial entre ombro e cotovelo.", both(31, 31, 69, 31)],
  ["antecubital-region", "Região antecubital", "cotovelo anterior", "Área superficial anterior à articulação do cotovelo.", anterior(27, 39)],
  ["olecranal-region", "Região olecraniana", "cotovelo posterior", "Área superficial posterior do cotovelo.", posterior(73, 39)],
  ["antebrachial-region", "Região antebraquial", "antebraço", "Área superficial entre cotovelo e punho.", both(24, 44, 76, 44)],
  ["palmar-region", "Região palmar", "mão", "Superfície anterior da mão.", anterior(18, 51)],
  ["dorsum-hand-region", "Dorso da mão", "mão", "Superfície posterior da mão.", posterior(82, 51)],
  ["femoral-region", "Região femoral", "coxa", "Área superficial entre quadril e joelho.", both(44, 64, 56, 64)],
  ["patellar-region", "Região patelar", "joelho anterior", "Área superficial anterior do joelho.", anterior(44, 76)],
  ["popliteal-region", "Região poplítea", "joelho posterior", "Depressão superficial posterior à articulação do joelho.", posterior(56, 76)],
  ["crural-region", "Região crural", "perna anterior", "Área superficial anterior entre joelho e tornozelo.", anterior(44, 84)],
  ["sural-region", "Região sural", "panturrilha", "Área superficial posterior da perna.", posterior(56, 84)],
  ["plantar-region", "Região plantar", "pé", "Superfície inferior do pé.", posterior(55, 96)],
  ["epidermis", "Epiderme", "revestimento corporal", "Forma a camada epitelial mais superficial da pele e contribui para a barreira contra o meio externo.", both(31, 31, 69, 31), "Epidermis", undefined, "openstaxSkinLayers"],
  ["dermis", "Derme", "pele", "Fornece resistência e elasticidade e abriga vasos, terminações nervosas e anexos cutâneos.", both(29, 34, 71, 34), "Dermis", undefined, "openstaxSkinLayers"],
  ["hypodermis", "Hipoderme", "tecido subcutâneo", "Conecta a pele a planos profundos, armazena tecido adiposo e auxilia isolamento e proteção mecânica.", both(42, 58, 58, 58), "Tela subcutanea", ["tecido subcutâneo"], "openstaxSkinLayers"],
  ["hair-follicle", "Folículo piloso", "pele pilosa", "Produz e ancora o pelo e se relaciona com glândulas sebáceas e músculo eretor do pelo.", both(43, 7, 57, 7), "Folliculus pili", undefined, "openstaxSkinAccessories"],
  ["sebaceous-gland", "Glândula sebácea", "anexo cutâneo", "Produz sebo que lubrifica a pele e os pelos.", both(35, 24, 65, 24), "Glandula sebacea", undefined, "openstaxSkinAccessories"],
  ["sweat-gland", "Glândula sudorípara", "anexo cutâneo", "Produz suor e participa da termorregulação e da excreção de pequenas quantidades de solutos.", both(27, 43, 73, 43), "Glandula sudorifera", undefined, "openstaxSkinAccessories"],
  ["nails", "Unhas", "extremidades dos dedos", "Protegem as falanges distais e oferecem apoio mecânico para manipulação fina.", both(15, 53, 85, 53), "Ungues", undefined, "openstaxSkinAccessories"],
]);

const muscularStructures = makeGroup("muscular", "openstaxMuscle", [
  ["frontalis", "Músculo frontal", "fronte", "Eleva as sobrancelhas e enruga a pele da fronte.", anterior(50, 5), "Venter frontalis musculi occipitofrontalis"],
  ["temporalis", "Músculo temporal", "região temporal", "Eleva e retrai a mandíbula durante a mastigação.", both(44, 7, 56, 7), "Musculus temporalis"],
  ["masseter", "Músculo masseter", "face lateral", "Eleva a mandíbula e participa da mastigação.", anterior(44, 10), "Musculus masseter"],
  ["orbicularis-oculi", "Músculo orbicular do olho", "órbita", "Fecha as pálpebras.", anterior(47, 8), "Musculus orbicularis oculi"],
  ["orbicularis-oris", "Músculo orbicular da boca", "boca", "Fecha e projeta os lábios.", anterior(50, 11), "Musculus orbicularis oris"],
  ["sternocleidomastoid", "Esternocleidomastoideo", "pescoço", "Flexiona o pescoço bilateralmente e roda a cabeça para o lado oposto unilateralmente.", anterior(45, 15), "Musculus sternocleidomastoideus", ["esternocleidomastóideo", "ecm"]],
  ["trapezius", "Músculo trapézio", "pescoço e dorso superior", "Move e estabiliza a escápula e participa da extensão cervical.", posterior(50, 20), "Musculus trapezius"],
  ["pectoralis-major", "Peitoral maior", "tórax anterior", "Adduz e roda medialmente o braço; sua porção clavicular auxilia a flexão.", anterior(43, 24), "Musculus pectoralis major"],
  ["serratus-anterior", "Serrátil anterior", "parede torácica lateral", "Protrai e estabiliza a escápula contra a parede torácica.", anterior(37, 29), "Musculus serratus anterior"],
  ["rectus-abdominis", "Reto do abdome", "abdome anterior", "Flexiona o tronco e auxilia a compressão abdominal.", anterior(48, 39), "Musculus rectus abdominis"],
  ["external-oblique", "Oblíquo externo", "abdome lateral", "Comprime o abdome e participa da flexão e rotação do tronco.", anterior(40, 40), "Musculus obliquus externus abdominis"],
  ["latissimus-dorsi", "Latíssimo do dorso", "dorso inferior", "Estende, aduz e roda medialmente o braço.", posterior(42, 34), "Musculus latissimus dorsi"],
  ["erector-spinae", "Eretores da espinha", "dorso paravertebral", "Estendem e auxiliam a flexão lateral da coluna vertebral.", posterior(46, 39), "Musculus erector spinae"],
  ["biceps-brachii", "Bíceps braquial", "braço anterior", "Flexiona o cotovelo e supina o antebraço.", anterior(30, 31), "Musculus biceps brachii"],
  ["brachialis", "Músculo braquial", "braço distal anterior", "É importante flexor do cotovelo.", anterior(29, 36), "Musculus brachialis"],
  ["triceps-brachii", "Tríceps braquial", "braço posterior", "Estende o cotovelo; a cabeça longa também atua no ombro.", posterior(70, 32), "Musculus triceps brachii"],
  ["brachioradialis", "Braquiorradial", "antebraço lateral", "Flexiona o cotovelo, especialmente com o antebraço em posição neutra.", anterior(25, 42), "Musculus brachioradialis"],
  ["forearm-flexors", "Grupo flexor do antebraço", "antebraço anterior", "Flexiona punho e dedos e participa da pronação.", anterior(23, 45)],
  ["forearm-extensors", "Grupo extensor do antebraço", "antebraço posterior", "Estende punho e dedos e participa da supinação.", posterior(77, 45)],
  ["thenar-muscles", "Músculos tenares", "palma lateral", "Movem o polegar, incluindo oposição e abdução.", anterior(18, 51)],
  ["hypothenar-muscles", "Músculos hipotenares", "palma medial", "Movem o dedo mínimo.", anterior(21, 52)],
  ["gluteus-maximus", "Glúteo máximo", "região glútea", "Estende e roda lateralmente a coxa e auxilia a estabilização do quadril.", posterior(43, 54), "Musculus gluteus maximus"],
  ["gluteus-medius", "Glúteo médio", "quadril posterolateral", "Abduz a coxa e estabiliza a pelve durante a marcha.", posterior(42, 50), "Musculus gluteus medius"],
  ["iliopsoas", "Iliopsoas", "quadril anterior profundo", "É um potente flexor do quadril.", anterior(46, 52), "Musculus iliopsoas"],
  ["adductor-longus", "Adutor longo", "coxa medial", "Aduz a coxa e auxilia sua flexão.", anterior(48, 59), "Musculus adductor longus"],
  ["gracilis", "Músculo grácil", "coxa medial", "Aduz a coxa e auxilia a flexão e rotação medial da perna.", anterior(48, 67), "Musculus gracilis"],
  ["sartorius", "Músculo sartório", "coxa anterior", "Flexiona, abduz e roda lateralmente a coxa e flexiona o joelho.", anterior(43, 63), "Musculus sartorius"],
  ["rectus-femoris", "Reto femoral", "coxa anterior", "Estende o joelho e auxilia a flexão do quadril.", anterior(44, 64), "Musculus rectus femoris"],
  ["vastus-lateralis", "Vasto lateral", "coxa anterolateral", "Estende o joelho.", anterior(40, 66), "Musculus vastus lateralis"],
  ["vastus-medialis", "Vasto medial", "coxa anteromedial", "Estende o joelho e contribui para a estabilidade patelar.", anterior(47, 70), "Musculus vastus medialis"],
  ["biceps-femoris", "Bíceps femoral", "coxa posterior lateral", "Flexiona o joelho e participa da extensão do quadril.", posterior(59, 65), "Musculus biceps femoris"],
  ["semitendinosus", "Semitendíneo", "coxa posterior medial", "Estende o quadril e flexiona o joelho.", posterior(54, 65), "Musculus semitendinosus"],
  ["semimembranosus", "Semimembranáceo", "coxa posterior medial profunda", "Estende o quadril e flexiona o joelho.", posterior(52, 68), "Musculus semimembranosus"],
  ["tibialis-anterior", "Tibial anterior", "perna anterior", "Dorsiflete e inverte o pé.", anterior(46, 84), "Musculus tibialis anterior"],
  ["fibularis-longus", "Fibular longo", "perna lateral", "Everta e auxilia a flexão plantar do pé.", anterior(40, 84), "Musculus fibularis longus"],
  ["gastrocnemius", "Gastrocnêmio", "panturrilha", "Realiza flexão plantar do tornozelo e auxilia a flexão do joelho.", posterior(56, 83), "Musculus gastrocnemius"],
  ["soleus", "Músculo sóleo", "panturrilha profunda", "Realiza flexão plantar e contribui para a postura em pé.", posterior(58, 87), "Musculus soleus"],
  ["calcaneal-tendon", "Tendão calcâneo", "tornozelo posterior", "Transmite ao calcâneo a força do tríceps sural para a flexão plantar.", posterior(55, 93), "Tendo calcaneus", ["tendão de aquiles"]],
  ["occipitalis", "Músculo occipital", "couro cabeludo posterior", "Retrai o couro cabeludo e integra o músculo occipitofrontal.", posterior(50, 6), "Venter occipitalis musculi occipitofrontalis"],
  ["splenius-capitis", "Esplênio da cabeça", "nuca", "Estende a cabeça bilateralmente e participa de rotação e flexão lateral unilateral.", posterior(54, 15), "Musculus splenius capitis"],
  ["levator-scapulae", "Levantador da escápula", "pescoço posterior e escápula", "Eleva a escápula e participa de sua rotação inferior.", posterior(58, 20), "Musculus levator scapulae"],
  ["rhomboid-minor", "Romboide menor", "dorso superior", "Retrai e estabiliza a escápula contra a parede torácica.", posterior(55, 23), "Musculus rhomboideus minor"],
  ["rhomboid-major", "Romboide maior", "dorso superior", "Retrai a escápula e participa de sua rotação inferior.", posterior(56, 27), "Musculus rhomboideus major"],
  ["supraspinatus", "Supraespinal", "fossa supraespinal da escápula", "Inicia a abdução do braço e contribui para estabilizar a cabeça do úmero.", posterior(61, 22), "Musculus supraspinatus"],
  ["infraspinatus", "Infraespinal", "fossa infraespinal da escápula", "Roda lateralmente o braço e estabiliza a articulação glenoumeral.", posterior(62, 25), "Musculus infraspinatus"],
  ["teres-minor", "Redondo menor", "ombro posterior", "Roda lateralmente o braço e integra o manguito rotador.", posterior(64, 27), "Musculus teres minor"],
  ["teres-major", "Redondo maior", "axila posterior", "Aduz, estende e roda medialmente o braço.", posterior(63, 29), "Musculus teres major"],
  ["quadratus-lumborum", "Quadrado lombar", "parede abdominal posterior", "Auxilia a flexão lateral do tronco e estabiliza a décima segunda costela.", posterior(56, 42), "Musculus quadratus lumborum"],
  ["gluteus-minimus", "Glúteo mínimo", "quadril posterolateral profundo", "Abduz e roda medialmente a coxa e ajuda a estabilizar a pelve.", posterior(60, 51), "Musculus gluteus minimus"],
  ["popliteus", "Músculo poplíteo", "joelho posterior", "Auxilia o desbloqueio do joelho no início da flexão e estabiliza sua face posterior.", posterior(55, 77), "Musculus popliteus"],
  ["tibialis-posterior", "Tibial posterior", "perna posterior profunda", "Realiza flexão plantar e inversão e participa da sustentação do arco medial do pé.", posterior(54, 86), "Musculus tibialis posterior"],
  ["plantaris", "Músculo plantar", "joelho e perna posterior", "Auxilia discretamente a flexão plantar e a flexão do joelho.", posterior(58, 81), "Musculus plantaris"],
]);

const individualVertebraRows: CatalogRow[] = [
  ...Array.from({ length: 7 }, (_, index) => {
    const number = index + 1;
    const specialName = number === 1 ? "Atlas (C1)" : number === 2 ? "Áxis (C2)" : `Vértebra cervical C${number}`;
    const functionText = number === 1
      ? "Sustenta o crânio e participa principalmente do movimento de flexão e extensão da cabeça."
      : number === 2
        ? "Seu processo odontoide forma o pivô principal da rotação entre atlas e áxis."
        : "Protege a medula cervical, transmite cargas e participa da mobilidade do pescoço.";
    return [
      `vertebra-c${number}`,
      specialName,
      "coluna cervical",
      functionText,
      posterior(49.6 + (index % 2) * 0.8, 13.2 + index * 0.85),
      `Vertebra cervicalis ${number}`,
      [`c${number}`, `vértebra c${number}`],
    ] as CatalogRow;
  }),
  ...Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    return [
      `vertebra-t${number}`,
      `Vértebra torácica T${number}`,
      "coluna torácica",
      "Protege a medula, transmite cargas e articula-se com as costelas na caixa torácica.",
      posterior(49.5 + (index % 2) * 1, 19.5 + index * 1.62),
      `Vertebra thoracica ${number}`,
      [`t${number}`, `vértebra t${number}`],
    ] as CatalogRow;
  }),
  ...Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return [
      `vertebra-l${number}`,
      `Vértebra lombar L${number}`,
      "coluna lombar",
      "Suporta grande parte da carga do tronco e protege as estruturas neurais lombares.",
      posterior(49.5 + (index % 2) * 1, 39 + index * 1.9),
      `Vertebra lumbalis ${number}`,
      [`l${number}`, `vértebra l${number}`],
    ] as CatalogRow;
  }),
  ...Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return [
      `sacral-segment-s${number}`,
      `Segmento sacral S${number}`,
      "sacro",
      "Compõe o sacro fusionado, participa da parede posterior da pelve e transmite carga à cintura pélvica.",
      posterior(49.6 + (index % 2) * 0.8, 48.8 + index * 1.05),
      `Vertebra sacralis ${number}`,
      [`s${number}`, `segmento s${number}`],
    ] as CatalogRow;
  }),
  ...Array.from({ length: 4 }, (_, index) => {
    const number = index + 1;
    return [
      `coccygeal-segment-co${number}`,
      `Segmento coccígeo Co${number}`,
      "cóccix",
      "Compõe a extremidade inferior da coluna e oferece inserção a ligamentos e músculos do assoalho pélvico.",
      posterior(49.7 + (index % 2) * 0.6, 54.1 + index * 0.75),
      `Vertebra coccygea ${number}`,
      [`co${number}`, `segmento coccígeo ${number}`],
    ] as CatalogRow;
  }),
];

const individualRibRows: CatalogRow[] = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  return [
    `rib-${number}`,
    `${number}ª costela`,
    "caixa torácica posterior",
    "Protege as vísceras torácicas, oferece inserções musculares e participa da mecânica respiratória.",
    posterior(58.5 + (index % 2) * 1.1, 21 + index * 1.35),
    `Costa ${number}`,
    [`costela ${number}`, `${number}ª costela`],
  ];
});

const detailedHandBoneRows: CatalogRow[] = [
  ["scaphoid", "Escafoide", "carpo", "Participa da fileira proximal do carpo e da articulação radiocárpica.", posterior(79.2, 48.5), "Os scaphoideum"],
  ["lunate", "Semilunar", "carpo", "Ocupa a fileira proximal do carpo e articula-se proximalmente com o rádio.", posterior(80.3, 48.2), "Os lunatum"],
  ["triquetrum", "Piramidal", "carpo", "Integra a fileira proximal do carpo no lado ulnar.", posterior(81.4, 48.3), "Os triquetrum"],
  ["pisiform", "Pisiforme", "carpo", "Osso sesamoide no tendão do flexor ulnar do carpo.", posterior(82.3, 48.5), "Os pisiforme"],
  ["trapezium", "Trapézio", "carpo", "Articula-se com o primeiro metacarpal e permite grande mobilidade do polegar.", posterior(79.3, 49.7), "Os trapezium"],
  ["trapezoid", "Trapezoide", "carpo", "Articula-se principalmente com o segundo metacarpal.", posterior(80.4, 49.5), "Os trapezoideum"],
  ["capitate", "Capitato", "carpo", "É o maior osso do carpo e ocupa posição central na fileira distal.", posterior(81.4, 49.5), "Os capitatum", ["osso grande"]],
  ["hamate", "Hamato", "carpo", "Integra a fileira distal ulnar do carpo e apresenta o hâmulo do hamato.", posterior(82.4, 49.7), "Os hamatum", ["unciforme"]],
  ...Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return [
      `metacarpal-${number}`,
      `${number}º metacarpal`,
      "mão",
      "Forma um dos raios ósseos da palma e transmite forças entre carpo e falanges.",
      posterior(79.2 + index * 1.35, 51.2 + Math.abs(2 - index) * 0.25),
      `Os metacarpale ${number}`,
      [`metacarpo ${number}`],
    ] as CatalogRow;
  }),
  ...[1, 2, 3, 4, 5].flatMap((digit): CatalogRow[] => {
    const isThumb = digit === 1;
    const segments = isThumb ? ["proximal", "distal"] : ["proximal", "media", "distal"];
    return segments.map((segment, segmentIndex) => {
      const segmentLabel = segment === "media" ? "média" : segment;
      const romanDigit = ["I", "II", "III", "IV", "V"][digit - 1];
      return [
        `hand-phalanx-${digit}-${segment}`,
        `Falange ${segmentLabel} do dedo ${romanDigit} da mão`,
        "dedos da mão",
        "Compõe o esqueleto digital e participa dos movimentos finos e da preensão.",
        posterior(79.1 + (digit - 1) * 1.45, 52.7 + segmentIndex * 0.75),
        `Phalanx ${segment} digiti ${digit} manus`,
        [`falange ${segmentLabel} do dedo ${digit}`],
      ];
    });
  }),
];

const detailedFootBoneRows: CatalogRow[] = [
  ["navicular-bone", "Navicular", "mediopé", "Contribui para o arco longitudinal medial e articula tálus e cuneiformes.", posterior(55.7, 94.3), "Os naviculare"],
  ["cuboid-bone", "Cuboide", "mediopé lateral", "Contribui para a coluna lateral do pé e articula-se com o calcâneo.", posterior(59.1, 94.5), "Os cuboideum"],
  ["medial-cuneiform", "Cuneiforme medial", "mediopé", "Articula-se com o primeiro metatarsal e participa do arco medial.", posterior(55.8, 95.2), "Os cuneiforme mediale"],
  ["intermediate-cuneiform", "Cuneiforme intermédio", "mediopé", "Articula-se principalmente com o segundo metatarsal.", posterior(57.1, 95.1), "Os cuneiforme intermedium"],
  ["lateral-cuneiform", "Cuneiforme lateral", "mediopé", "Articula-se com metatarsais centrais e com outros ossos do tarso.", posterior(58.2, 95.2), "Os cuneiforme laterale"],
  ...Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return [
      `metatarsal-${number}`,
      `${number}º metatarsal`,
      "antepé",
      "Forma um dos raios do antepé e participa da sustentação dos arcos e da propulsão.",
      posterior(55.2 + index * 1.3, 96.2 + Math.abs(2 - index) * 0.16),
      `Os metatarsale ${number}`,
      [`metatarso ${number}`],
    ] as CatalogRow;
  }),
  ...[1, 2, 3, 4, 5].flatMap((digit): CatalogRow[] => {
    const isHallux = digit === 1;
    const segments = isHallux ? ["proximal", "distal"] : ["proximal", "media", "distal"];
    return segments.map((segment, segmentIndex) => {
      const segmentLabel = segment === "media" ? "média" : segment;
      const romanDigit = ["I", "II", "III", "IV", "V"][digit - 1];
      return [
        `foot-phalanx-${digit}-${segment}`,
        `Falange ${segmentLabel} do dedo ${romanDigit} do pé`,
        "dedos do pé",
        "Compõe o esqueleto digital do pé e auxilia equilíbrio e propulsão durante a marcha.",
        posterior(55.1 + (digit - 1) * 1.4, 97.4 + segmentIndex * 0.55),
        `Phalanx ${segment} digiti ${digit} pedis`,
        [`falange ${segmentLabel} do dedo ${digit} do pé`],
      ];
    });
  }),
];

const skeletalStructures = makeGroup("skeletal", "openstaxSkeleton", [
  ["frontal-bone", "Osso frontal", "crânio anterior", "Forma a fronte e parte das órbitas e da base anterior do crânio.", anterior(50, 5), "Os frontale"],
  ["parietal-bone", "Osso parietal", "calvária", "Forma grande parte das paredes superior e lateral do crânio.", both(46, 4, 54, 4), "Os parietale"],
  ["temporal-bone", "Osso temporal", "crânio lateral", "Contribui para a parede lateral e a base do crânio e abriga estruturas da audição.", both(43, 8, 57, 8), "Os temporale"],
  ["occipital-bone", "Osso occipital", "crânio posterior", "Forma a porção posterior e parte da base do crânio.", posterior(50, 7), "Os occipitale"],
  ["zygomatic-bone", "Osso zigomático", "face lateral", "Forma a proeminência da bochecha e parte da órbita.", anterior(44, 9), "Os zygomaticum"],
  ["maxilla", "Maxila", "face média", "Sustenta os dentes superiores e participa das cavidades oral, nasal e orbital.", anterior(48, 10), "Maxilla"],
  ["mandible", "Mandíbula", "face inferior", "Sustenta os dentes inferiores e articula-se com o osso temporal.", anterior(50, 12), "Mandibula"],
  ["cervical-vertebrae", "Vértebras cervicais", "coluna cervical", "Sustentam a cabeça, protegem a medula e permitem mobilidade cervical.", both(50, 15, 50, 15), "Vertebrae cervicales"],
  ["thoracic-vertebrae", "Vértebras torácicas", "coluna torácica", "Articulam-se com as costelas e protegem a medula espinal.", posterior(50, 29), "Vertebrae thoracicae"],
  ["lumbar-vertebrae", "Vértebras lombares", "coluna lombar", "Suportam grande parte da carga do tronco.", posterior(50, 42), "Vertebrae lumbales"],
  ["clavicle", "Clavícula", "cintura escapular anterior", "Mantém o membro superior afastado do tronco e transmite forças ao esqueleto axial.", anterior(43, 19), "Clavicula"],
  ["scapula", "Escápula", "dorso superior", "Oferece inserção muscular e participa da articulação do ombro.", posterior(42, 25), "Scapula"],
  ["sternum", "Esterno", "tórax anterior", "Protege estruturas mediastinais e articula-se com clavículas e cartilagens costais.", anterior(50, 27), "Sternum"],
  ["ribs", "Costelas", "caixa torácica", "Protegem órgãos torácicos e participam da mecânica respiratória.", both(41, 28, 59, 28), "Costae"],
  ["humerus", "Úmero", "braço", "Forma o esqueleto do braço e participa das articulações do ombro e cotovelo.", both(31, 31, 69, 31), "Humerus"],
  ["radius", "Rádio", "antebraço lateral", "Participa das articulações do cotovelo e punho e permite pronação e supinação.", both(23, 44, 77, 44), "Radius"],
  ["ulna", "Ulna", "antebraço medial", "Estabiliza o antebraço e forma importante articulação com o úmero.", both(27, 44, 73, 44), "Ulna"],
  ["carpals", "Ossos do carpo", "punho", "Formam o esqueleto proximal da mão e permitem mobilidade do punho.", both(20, 49, 80, 49), "Ossa carpi"],
  ["metacarpals", "Metacarpos", "palma", "Formam o esqueleto da palma da mão.", both(18, 51, 82, 51), "Ossa metacarpi"],
  ["hand-phalanges", "Falanges da mão", "dedos da mão", "Formam o esqueleto dos dedos e permitem preensão fina.", both(15, 53, 85, 53), "Phalanges manus"],
  ["sacrum", "Sacro", "pelve posterior", "Transmite carga da coluna para a cintura pélvica.", posterior(50, 50), "Os sacrum"],
  ["coccyx", "Cóccix", "extremidade inferior da coluna", "Serve de inserção para ligamentos e músculos do assoalho pélvico.", posterior(50, 54), "Os coccygis"],
  ["hip-bone", "Osso do quadril", "cintura pélvica", "Transmite peso aos membros inferiores e protege vísceras pélvicas.", both(42, 50, 58, 50), "Os coxae", ["osso coxal"]],
  ["ilium", "Ílio", "pelve superior", "Forma a maior porção superior do osso do quadril.", both(42, 49, 58, 49), "Ilium"],
  ["ischium", "Ísquio", "pelve posteroinferior", "Forma a porção posteroinferior do osso do quadril e suporta peso ao sentar.", posterior(57, 54), "Ischium"],
  ["pubis", "Púbis", "pelve anterior", "Forma a porção anterior do osso do quadril e participa da sínfise púbica.", anterior(48, 53), "Pubis"],
  ["patella", "Patela", "joelho anterior", "Protege a face anterior do joelho e aumenta a eficiência do quadríceps.", anterior(44, 76), "Patella"],
  ["tibia", "Tíbia", "perna medial", "Principal osso de sustentação de peso da perna.", both(45, 84, 55, 84), "Tibia"],
  ["fibula", "Fíbula", "perna lateral", "Estabiliza o tornozelo e oferece inserções musculares.", both(40, 84, 60, 84), "Fibula"],
  ["talus", "Tálus", "tornozelo", "Transmite carga entre a perna e o pé.", both(45, 93, 55, 93), "Talus"],
  ["calcaneus", "Calcâneo", "calcanhar", "Forma o calcanhar e recebe o tendão calcâneo.", both(44, 95, 56, 95), "Calcaneus"],
  ["tarsals", "Ossos do tarso", "retropé e mediopé", "Formam a porção proximal do esqueleto do pé.", both(43, 94, 57, 94), "Ossa tarsi"],
  ["metatarsals", "Metatarsos", "antepé", "Formam o esqueleto intermediário do pé e participam dos arcos plantares.", both(42, 96, 58, 96), "Ossa metatarsi"],
  ["foot-phalanges", "Falanges do pé", "dedos do pé", "Formam o esqueleto dos dedos e auxiliam equilíbrio e propulsão.", both(40, 98, 60, 98), "Phalanges pedis"],
  ...individualVertebraRows,
  ...individualRibRows,
  ...detailedHandBoneRows,
  ...detailedFootBoneRows,
]);

const vascularStructures = makeGroup("vascular", "openstaxCirculation", [
  ["ascending-aorta", "Aorta ascendente", "mediastino", "Conduz sangue do ventrículo esquerdo ao arco aórtico.", anterior(52, 25)],
  ["aortic-arch", "Arco da aorta", "mediastino superior", "Origina os grandes ramos arteriais para cabeça, pescoço e membros superiores.", anterior(52, 22)],
  ["thoracic-aorta", "Aorta torácica", "tórax posterior", "Distribui ramos à parede e às vísceras torácicas.", anterior(53, 31)],
  ["abdominal-aorta", "Aorta abdominal", "abdome", "Origina os principais ramos arteriais abdominais e termina nas ilíacas comuns.", anterior(53, 42)],
  ["brachiocephalic-trunk", "Tronco braquiocefálico", "mediastino superior", "Origina as artérias carótida comum direita e subclávia direita.", anterior(54, 20)],
  ["common-carotid-artery", "Artéria carótida comum", "pescoço", "Conduz sangue para cabeça e pescoço antes de sua bifurcação.", anterior(52, 15)],
  ["internal-carotid-artery", "Artéria carótida interna", "pescoço superior", "Supre principalmente o encéfalo e estruturas orbitárias.", anterior(51, 10)],
  ["external-carotid-artery", "Artéria carótida externa", "face e pescoço", "Supre grande parte das estruturas superficiais da cabeça e do pescoço.", anterior(47, 11)],
  ["subclavian-artery", "Artéria subclávia", "base do pescoço", "Conduz sangue ao membro superior e fornece ramos cervicais e torácicos.", anterior(43, 19)],
  ["axillary-artery", "Artéria axilar", "axila", "Continuação da subclávia que supre axila e membro superior.", anterior(37, 24)],
  ["brachial-artery", "Artéria braquial", "braço", "Principal artéria do braço; divide-se em radial e ulnar.", anterior(30, 33)],
  ["radial-artery", "Artéria radial", "antebraço lateral", "Supre o antebraço lateral e participa dos arcos palmares.", anterior(23, 44)],
  ["ulnar-artery", "Artéria ulnar", "antebraço medial", "Supre o antebraço medial e participa principalmente do arco palmar superficial.", anterior(27, 44)],
  ["superficial-palmar-arch", "Arco palmar superficial", "palma", "Distribui fluxo arterial para a mão e os dedos.", anterior(19, 51)],
  ["celiac-trunk", "Tronco celíaco", "abdome superior", "Origina ramos para estruturas do intestino anterior.", anterior(52, 34)],
  ["superior-mesenteric-artery", "Artéria mesentérica superior", "abdome", "Supre estruturas derivadas do intestino médio.", anterior(51, 40)],
  ["renal-artery", "Artéria renal", "abdome posterior", "Leva sangue aos rins.", anterior(57, 38)],
  ["inferior-mesenteric-artery", "Artéria mesentérica inferior", "abdome inferior", "Supre estruturas derivadas do intestino posterior.", anterior(51, 45)],
  ["common-iliac-artery", "Artéria ilíaca comum", "pelve superior", "Ramo terminal da aorta abdominal que se divide em ilíacas interna e externa.", anterior(48, 49)],
  ["internal-iliac-artery", "Artéria ilíaca interna", "pelve", "Supre grande parte das vísceras e paredes pélvicas.", anterior(49, 52)],
  ["external-iliac-artery", "Artéria ilíaca externa", "pelve", "Continua-se como artéria femoral após o ligamento inguinal.", anterior(44, 52)],
  ["femoral-artery", "Artéria femoral", "coxa anterior", "Principal via arterial do membro inferior proximal.", anterior(44, 61)],
  ["popliteal-artery", "Artéria poplítea", "fossa poplítea", "Continuação da femoral que fornece ramos ao joelho e à perna.", posterior(56, 76)],
  ["anterior-tibial-artery", "Artéria tibial anterior", "perna anterior", "Supre o compartimento anterior da perna e continua-se no dorso do pé.", anterior(45, 84)],
  ["posterior-tibial-artery", "Artéria tibial posterior", "perna posterior", "Supre compartimentos posteriores e planta do pé.", posterior(55, 84)],
  ["dorsalis-pedis-artery", "Artéria dorsal do pé", "dorso do pé", "Continua a tibial anterior e supre o dorso do pé.", anterior(43, 96)],
  ["superior-vena-cava", "Veia cava superior", "mediastino superior", "Retorna ao átrio direito sangue da cabeça, pescoço, tórax e membros superiores.", anterior(55, 22)],
  ["inferior-vena-cava", "Veia cava inferior", "abdome e tórax inferior", "Retorna ao átrio direito sangue das regiões inferiores ao diafragma.", anterior(56, 40)],
  ["internal-jugular-vein", "Veia jugular interna", "pescoço", "Drena encéfalo e estruturas profundas da cabeça e do pescoço.", anterior(48, 15)],
  ["subclavian-vein", "Veia subclávia", "base do pescoço", "Drena o membro superior e une-se à jugular interna.", anterior(40, 20)],
  ["cephalic-vein", "Veia cefálica", "membro superior lateral", "Drena superficialmente o lado lateral do membro superior.", anterior(27, 36)],
  ["basilic-vein", "Veia basílica", "membro superior medial", "Drena superficialmente o lado medial do membro superior.", anterior(32, 37)],
  ["median-cubital-vein", "Veia mediana cubital", "fossa cubital", "Conecta veias superficiais do antebraço e é local comum de venopunção.", anterior(28, 39)],
  ["hepatic-portal-vein", "Veia porta hepática", "abdome superior", "Leva ao fígado sangue proveniente de grande parte do trato gastrointestinal e órgãos associados.", anterior(48, 35)],
  ["renal-vein", "Veia renal", "abdome posterior", "Drena os rins para a veia cava inferior.", anterior(55, 38)],
  ["common-iliac-vein", "Veia ilíaca comum", "pelve superior", "Drena pelve e membros inferiores em direção à veia cava inferior.", anterior(53, 49)],
  ["femoral-vein", "Veia femoral", "coxa", "Principal via venosa profunda da coxa.", anterior(47, 62)],
  ["great-saphenous-vein", "Veia safena magna", "membro inferior medial", "Drena superficialmente o membro inferior e desemboca na veia femoral.", anterior(48, 78)],
]);

const nervousStructures = makeGroup("nervous", "openstaxPns", [
  ["cerebrum", "Cérebro", "cavidade craniana", "Participa de percepção, movimento voluntário, linguagem, memória e outras funções superiores.", both(50, 5, 50, 5), "Cerebrum", undefined, "openstaxCns"],
  ["cerebellum", "Cerebelo", "fossa craniana posterior", "Coordena movimentos, equilíbrio e aprendizagem motora.", posterior(50, 9), "Cerebellum", undefined, "openstaxCns"],
  ["brainstem", "Tronco encefálico", "base do encéfalo", "Conecta encéfalo e medula e participa de funções autonômicas vitais.", posterior(50, 12), "Truncus encephali", undefined, "openstaxCns"],
  ["spinal-cord", "Medula espinal", "canal vertebral", "Conduz sinais entre encéfalo e corpo e integra reflexos.", posterior(50, 34), "Medulla spinalis", ["medula espinhal"], "openstaxCns"],
  ["cauda-equina", "Cauda equina", "canal vertebral lombossacral", "Conjunto de raízes nervosas inferiores ao término da medula espinal.", posterior(50, 49), "Cauda equina"],
  ["optic-nerve", "Nervo óptico", "órbita", "Conduz informação visual da retina ao sistema nervoso central.", anterior(48, 8), "Nervus opticus"],
  ["trigeminal-nerve", "Nervo trigêmeo", "face", "Conduz sensibilidade da face e participa da mastigação.", anterior(45, 10), "Nervus trigeminus"],
  ["facial-nerve", "Nervo facial", "face", "Inerva músculos da expressão facial e conduz fibras autonômicas e gustativas específicas.", anterior(43, 10), "Nervus facialis"],
  ["vagus-nerve", "Nervo vago", "pescoço, tórax e abdome", "Fornece importante inervação parassimpática às vísceras torácicas e abdominais.", anterior(53, 17), "Nervus vagus"],
  ["cervical-plexus", "Plexo cervical", "pescoço", "Origina ramos sensitivos e motores para pescoço e regiões adjacentes.", anterior(46, 16), "Plexus cervicalis"],
  ["brachial-plexus", "Plexo braquial", "base do pescoço e axila", "Origina a maior parte da inervação do membro superior.", anterior(39, 21), "Plexus brachialis"],
  ["lumbar-plexus", "Plexo lombar", "parede posterior do abdome", "Origina nervos para parede abdominal e parte do membro inferior.", posterior(53, 44), "Plexus lumbalis"],
  ["sacral-plexus", "Plexo sacral", "pelve posterior", "Origina nervos para pelve, região glútea e grande parte do membro inferior.", posterior(54, 52), "Plexus sacralis"],
  ["phrenic-nerve", "Nervo frênico", "pescoço e tórax", "Fornece a inervação motora principal do diafragma.", anterior(52, 27), "Nervus phrenicus"],
  ["axillary-nerve", "Nervo axilar", "ombro", "Inerva deltoide e redondo menor e conduz sensibilidade do ombro lateral.", posterior(65, 24), "Nervus axillaris"],
  ["musculocutaneous-nerve", "Nervo musculocutâneo", "braço anterior", "Inerva músculos anteriores do braço e conduz sensibilidade do antebraço lateral.", anterior(31, 32), "Nervus musculocutaneus"],
  ["median-nerve", "Nervo mediano", "membro superior", "Inerva muitos flexores do antebraço e músculos da mão e conduz sensibilidade palmar lateral.", anterior(27, 42), "Nervus medianus"],
  ["ulnar-nerve", "Nervo ulnar", "membro superior medial", "Inerva diversos músculos da mão e parte dos flexores do antebraço.", anterior(31, 40), "Nervus ulnaris"],
  ["radial-nerve", "Nervo radial", "membro superior posterior", "Inerva músculos extensores do braço e antebraço e áreas cutâneas posteriores.", posterior(70, 37), "Nervus radialis"],
  ["intercostal-nerves", "Nervos intercostais", "parede torácica", "Inervam músculos intercostais e pele da parede torácica e abdominal superior.", anterior(42, 30), "Nervi intercostales"],
  ["femoral-nerve", "Nervo femoral", "pelve e coxa anterior", "Inerva o compartimento anterior da coxa e conduz sensibilidade de parte do membro inferior.", anterior(44, 58), "Nervus femoralis"],
  ["obturator-nerve", "Nervo obturatório", "pelve e coxa medial", "Inerva principalmente músculos adutores da coxa.", anterior(48, 59), "Nervus obturatorius"],
  ["superior-gluteal-nerve", "Nervo glúteo superior", "região glútea", "Inerva glúteos médio e mínimo e tensor da fáscia lata.", posterior(58, 52), "Nervus gluteus superior"],
  ["inferior-gluteal-nerve", "Nervo glúteo inferior", "região glútea", "Inerva o glúteo máximo.", posterior(58, 55), "Nervus gluteus inferior"],
  ["tibial-nerve", "Nervo tibial", "perna posterior", "Inerva músculos posteriores da perna e músculos plantares.", posterior(55, 82), "Nervus tibialis"],
  ["common-fibular-nerve", "Nervo fibular comum", "joelho lateral", "Divide-se em ramos superficial e profundo para a perna e o pé.", posterior(60, 77), "Nervus fibularis communis", ["nervo peroneal comum"]],
  ["deep-fibular-nerve", "Nervo fibular profundo", "perna anterior", "Inerva o compartimento anterior da perna e conduz sensibilidade interdigital específica.", anterior(44, 85), "Nervus fibularis profundus"],
  ["superficial-fibular-nerve", "Nervo fibular superficial", "perna lateral", "Inerva músculos fibulares e conduz sensibilidade de grande parte do dorso do pé.", anterior(40, 85), "Nervus fibularis superficialis"],
  ["saphenous-nerve", "Nervo safeno", "perna medial", "Ramo sensitivo do femoral para a face medial da perna e do pé.", anterior(48, 84), "Nervus saphenus"],
  ["sural-nerve", "Nervo sural", "perna posterolateral", "Conduz sensibilidade da face posterolateral da perna e lateral do pé.", posterior(60, 86), "Nervus suralis"],
  ["medial-plantar-nerve", "Nervo plantar medial", "planta do pé", "Inerva músculos e pele da porção medial da planta.", posterior(54, 96), "Nervus plantaris medialis"],
  ["lateral-plantar-nerve", "Nervo plantar lateral", "planta do pé", "Inerva músculos e pele da porção lateral da planta.", posterior(58, 96), "Nervus plantaris lateralis"],
]);

const organStructures = makeGroup("organs", "openstax", [
  ["eyes", "Olhos", "órbitas", "Recebem estímulos luminosos e iniciam o processamento visual.", anterior(47, 8), "Oculi", undefined, "openstaxCns"],
  ["retina", "Retina", "parede interna do olho", "Contém fotorreceptores que convertem energia luminosa em sinais neurais.", anterior(46.5, 8), "Retina", undefined, "openstaxSenses"],
  ["lens-eye", "Cristalino", "segmento anterior do olho", "Modifica sua curvatura para ajudar a focalizar a imagem sobre a retina.", anterior(47.4, 8.2), "Lens", ["lente do olho"], "openstaxSenses"],
  ["cochlea", "Cóclea", "orelha interna", "Abriga o órgão sensorial da audição e participa da transdução de vibrações sonoras.", both(42.4, 9, 57.6, 9), "Cochlea", undefined, "openstaxSenses"],
  ["semicircular-canals", "Canais semicirculares", "orelha interna", "Detectam acelerações angulares da cabeça e participam do equilíbrio.", both(42, 8.4, 58, 8.4), "Canales semicirculares", undefined, "openstaxSenses"],
  ["olfactory-epithelium", "Epitélio olfatório", "cavidade nasal superior", "Contém receptores que iniciam a transdução de moléculas odoríferas.", anterior(50, 8.7), "Epithelium olfactorium", undefined, "openstaxSenses"],
  ["tongue", "Língua", "cavidade oral", "Participa da gustação, manipulação do alimento, deglutição e articulação da fala.", anterior(50, 11.2), "Lingua", undefined, "openstaxSenses"],
  ["taste-buds", "Botões gustativos", "língua e cavidade oral", "Reúnem células receptoras envolvidas na percepção dos sabores.", anterior(49.5, 11.4), "Caliculi gustatorii", ["papilas gustativas"], "openstaxSenses"],
  ["nasal-cavity", "Cavidade nasal", "nariz", "Filtra, aquece e umidifica o ar e participa do olfato.", anterior(50, 9), "Cavitas nasi", undefined, "openstaxRespiratory"],
  ["oral-cavity", "Cavidade oral", "face inferior", "Inicia digestão mecânica e química e participa de fala e deglutição.", anterior(50, 11), "Cavitas oris", undefined, "openstaxDigestive"],
  ["parotid-gland", "Glândula parótida", "face lateral", "Produz secreção salivar serosa conduzida à cavidade oral.", anterior(43, 11), "Glandula parotidea", undefined, "openstaxDigestive"],
  ["pharynx", "Faringe", "cabeça e pescoço", "Conduz ar à laringe e alimento ao esôfago.", anterior(50, 13), "Pharynx", undefined, "openstaxRespiratory"],
  ["larynx", "Laringe", "pescoço anterior", "Protege a via aérea inferior e participa da produção da voz.", anterior(50, 16), "Larynx", undefined, "openstaxRespiratory"],
  ["thyroid-gland", "Glândula tireoide", "pescoço anterior", "Produz hormônios que participam da regulação metabólica e da homeostase do cálcio.", anterior(50, 17), "Glandula thyroidea", undefined, "openstaxEndocrine"],
  ["parathyroid-glands", "Glândulas paratireoides", "face posterior da tireoide", "Secretam paratormônio, importante na homeostase do cálcio.", posterior(50, 17), "Glandulae parathyroideae", undefined, "openstaxEndocrine"],
  ["trachea", "Traqueia", "pescoço e mediastino superior", "Conduz ar entre laringe e brônquios principais.", anterior(50, 20), "Trachea", undefined, "openstaxRespiratory"],
  ["main-bronchi", "Brônquios principais", "tórax", "Conduzem ar da traqueia para cada pulmão.", anterior(50, 23), "Bronchi principales", undefined, "openstaxRespiratory"],
  ["thymus", "Timo", "mediastino anterior", "Participa da maturação de linfócitos T, especialmente no início da vida.", anterior(50, 23), "Thymus", undefined, "openstaxImmune"],
  ["esophagus", "Esôfago", "pescoço, tórax e abdome superior", "Transporta o bolo alimentar da faringe ao estômago.", anterior(54, 29), "Oesophagus", undefined, "openstaxDigestive"],
  ["diaphragm", "Diafragma", "limite toracoabdominal", "É o principal músculo da inspiração e separa tórax e abdome.", anterior(50, 31), "Diaphragma", undefined, "openstaxRespiratory"],
  ["stomach", "Estômago", "abdome superior esquerdo", "Armazena e mistura alimento e inicia etapas da digestão proteica.", anterior(57, 35), "Gaster", undefined, "openstaxDigestive"],
  ["gallbladder", "Vesícula biliar", "abdome superior direito", "Armazena e concentra a bile entre as refeições.", anterior(45, 36), "Vesica biliaris", undefined, "openstaxDigestive"],
  ["pancreas", "Pâncreas", "abdome superior", "Produz enzimas digestivas e hormônios envolvidos no metabolismo energético.", anterior(53, 37), "Pancreas", undefined, "openstaxDigestive"],
  ["spleen", "Baço", "abdome superior esquerdo", "Filtra sangue e participa de respostas imunes.", anterior(61, 35), "Splen", undefined, "openstaxImmune"],
  ["duodenum", "Duodeno", "abdome superior", "Recebe quimo, bile e secreção pancreática e participa da digestão e absorção.", anterior(52, 39), "Duodenum", undefined, "openstaxDigestive"],
  ["jejunum", "Jejuno", "abdome central", "Participa intensamente da digestão e absorção de nutrientes.", anterior(53, 44), "Jejunum", undefined, "openstaxDigestive"],
  ["ileum", "Íleo", "abdome inferior", "Absorve nutrientes específicos e termina na junção ileocecal.", anterior(48, 47), "Ileum", undefined, "openstaxDigestive"],
  ["cecum", "Ceco", "quadrante inferior direito", "Recebe conteúdo do íleo e inicia o intestino grosso.", anterior(43, 48), "Caecum", undefined, "openstaxDigestive"],
  ["vermiform-appendix", "Apêndice vermiforme", "quadrante inferior direito", "Estrutura linfoide estreita ligada ao ceco.", anterior(42, 50), "Appendix vermiformis", ["apêndice"], "openstaxDigestive"],
  ["ascending-colon", "Cólon ascendente", "abdome direito", "Conduz conteúdo intestinal do ceco à flexura cólica direita.", anterior(42, 43), "Colon ascendens", undefined, "openstaxDigestive"],
  ["transverse-colon", "Cólon transverso", "abdome superior", "Conduz conteúdo entre as flexuras cólicas direita e esquerda.", anterior(50, 40), "Colon transversum", undefined, "openstaxDigestive"],
  ["descending-colon", "Cólon descendente", "abdome esquerdo", "Conduz conteúdo da flexura esquerda ao cólon sigmoide.", anterior(59, 44), "Colon descendens", undefined, "openstaxDigestive"],
  ["sigmoid-colon", "Cólon sigmoide", "pelve e abdome inferior esquerdo", "Conduz conteúdo do cólon descendente ao reto.", anterior(56, 50), "Colon sigmoideum", undefined, "openstaxDigestive"],
  ["rectum", "Reto", "pelve", "Armazena temporariamente fezes antes da defecação.", anterior(50, 53), "Rectum", undefined, "openstaxDigestive"],
  ["adrenal-glands", "Glândulas suprarrenais", "retroperitônio superior", "Produzem hormônios corticais e catecolaminas medulares.", posterior(56, 36), "Glandulae suprarenales", undefined, "openstaxEndocrine"],
  ["ureters", "Ureteres", "retroperitônio e pelve", "Conduzem urina dos rins à bexiga.", anterior(55, 44), "Ureteres", undefined, "openstaxKidney"],
  ["urinary-bladder", "Bexiga urinária", "pelve anterior", "Armazena urina até a micção.", anterior(50, 53), "Vesica urinaria", ["bexiga"], "openstaxKidney"],
  ["urethra", "Uretra", "pelve e períneo", "Conduz urina da bexiga ao exterior.", anterior(50, 56), "Urethra", undefined, "openstaxKidney"],
  ["ovaries", "Ovários", "pelve", "Produzem oócitos e hormônios que participam da função reprodutiva.", anterior(43, 52), "Ovaria", ["ovário"], "openstaxReproductive"],
  ["uterine-tubes", "Tubas uterinas", "pelve", "Conduzem o oócito em direção ao útero e são o local mais comum de fecundação.", anterior(46, 51), "Tubae uterinae", ["trompas uterinas", "trompas de falópio"], "openstaxReproductive"],
  ["uterus", "Útero", "pelve menor", "Órgão muscular que recebe o embrião implantado e sustenta o desenvolvimento durante a gestação.", anterior(50, 52), "Uterus", undefined, "openstaxReproductive"],
  ["cervix", "Colo do útero", "pelve menor", "Forma a porção inferior do útero e se projeta no canal vaginal.", anterior(50, 54), "Cervix uteri", ["cérvix"], "openstaxReproductive"],
  ["vagina", "Vagina", "pelve e períneo", "Canal fibromuscular que se estende do colo do útero ao vestíbulo.", anterior(50, 56), "Vagina", undefined, "openstaxReproductive"],
  ["vulva", "Vulva", "períneo anterior", "Conjunto das estruturas genitais externas típicas da anatomia ovariana.", anterior(50, 57), "Pudendum femininum", undefined, "openstaxReproductive"],
  ["testes", "Testículos", "escroto", "Produzem espermatozoides nos túbulos seminíferos e secretam hormônios androgênicos.", anterior(48, 58), "Testes", ["testículo"], "openstaxReproductive"],
  ["epididymis", "Epidídimo", "escroto", "Recebe espermatozoides do testículo e participa de sua maturação e armazenamento.", anterior(47, 57.5), "Epididymis", undefined, "openstaxReproductive"],
  ["ductus-deferens", "Ducto deferente", "escroto, canal inguinal e pelve", "Conduz espermatozoides do epidídimo em direção ao ducto ejaculatório.", anterior(47, 54), "Ductus deferens", ["canal deferente"], "openstaxReproductive"],
  ["seminal-vesicles", "Vesículas seminais", "pelve posterior à bexiga", "Produzem parte importante do fluido seminal.", anterior(53, 52.5), "Glandulae vesiculosae", undefined, "openstaxReproductive"],
  ["prostate", "Próstata", "pelve inferior à bexiga", "Produz secreção que contribui para o sêmen e circunda a uretra prostática.", anterior(50, 54.5), "Prostata", undefined, "openstaxReproductive"],
  ["penis", "Pênis", "períneo anterior", "Contém tecidos eréteis e conduz a uretra em seu segmento distal.", anterior(50, 58), "Penis", undefined, "openstaxReproductive"],
  ["pituitary-gland", "Hipófise", "base do crânio", "Secreta hormônios que regulam múltiplos eixos endócrinos.", anterior(50, 8), "Hypophysis", ["glândula pituitária"], "openstaxEndocrine"],
  ["pineal-gland", "Glândula pineal", "encéfalo", "Secreta melatonina e participa da regulação circadiana.", posterior(50, 7), "Glandula pinealis", undefined, "openstaxEndocrine"],
  ["palatine-tonsils", "Tonsilas palatinas", "orofaringe", "Participam da vigilância imune na entrada dos tratos respiratório e digestório.", anterior(48, 12), "Tonsillae palatinae", ["amígdalas"], "openstaxImmune"],
  ["cervical-lymph-nodes", "Linfonodos cervicais", "pescoço", "Filtram linfa de territórios da cabeça e do pescoço.", anterior(44, 16), "Nodi lymphoidei cervicales", undefined, "openstaxImmune"],
  ["axillary-lymph-nodes", "Linfonodos axilares", "axila", "Filtram linfa de grande parte do membro superior, parede torácica e mama.", anterior(37, 24), "Nodi lymphoidei axillares", undefined, "openstaxImmune"],
  ["inguinal-lymph-nodes", "Linfonodos inguinais", "virilha", "Filtram linfa de territórios superficiais do membro inferior e regiões adjacentes.", anterior(43, 53), "Nodi lymphoidei inguinales", undefined, "openstaxImmune"],
]);

const deepLayerWithPosteriorContext = new Set<BodyLayer>(["vascular", "nervous", "organs"]);

export const medicineAtlasCatalog: AtlasCatalogSeed[] = [
  ...surfaceStructures,
  ...muscularStructures,
  ...skeletalStructures,
  ...vascularStructures,
  ...nervousStructures,
  ...organStructures,
].map((structure) => {
  if (structure.positions.posterior || !structure.positions.anterior || !deepLayerWithPosteriorContext.has(structure.layer)) return structure;
  const front = structure.positions.anterior;
  return {
    ...structure,
    positions: {
      ...structure.positions,
      posterior: point(100 - front.x, front.y),
    },
  };
});
