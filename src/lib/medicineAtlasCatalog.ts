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
  organs: { system: "Anatomia de órgãos e sentidos", noun: "estrutura anatômica" },
};

const organSystemIds: Record<string, Set<string>> = {
  "Sentidos especiais": new Set(["eyes", "retina", "lens-eye", "cornea", "iris", "sclera", "lacrimal-gland", "cochlea", "semicircular-canals", "tympanic-membrane", "olfactory-epithelium", "tongue", "taste-buds"]),
  Respiratório: new Set(["nasal-cavity", "pharynx", "larynx", "epiglottis", "trachea", "main-bronchi", "bronchioles", "alveoli", "pleura", "diaphragm"]),
  Digestório: new Set(["oral-cavity", "parotid-gland", "submandibular-gland", "sublingual-gland", "esophagus", "stomach", "gallbladder", "common-bile-duct", "duodenum", "jejunum", "ileum", "cecum", "vermiform-appendix", "ascending-colon", "transverse-colon", "descending-colon", "sigmoid-colon", "rectum", "anal-canal"]),
  "Digestório e endócrino": new Set(["pancreas"]),
  Endócrino: new Set(["thyroid-gland", "parathyroid-glands", "adrenal-glands", "pituitary-gland", "pineal-gland", "hypothalamus"]),
  Cardiovascular: new Set(["pericardium", "right-atrium", "left-atrium", "right-ventricle", "left-ventricle", "tricuspid-valve", "mitral-valve", "pulmonary-valve", "aortic-valve"]),
  "Linfático e imune": new Set(["thymus", "spleen", "palatine-tonsils", "cervical-lymph-nodes", "axillary-lymph-nodes", "inguinal-lymph-nodes"]),
  Urinário: new Set(["ureters", "urinary-bladder", "urethra"]),
  Reprodutor: new Set(["mammary-glands", "ovaries", "uterine-tubes", "uterus", "cervix", "vagina", "vulva", "clitoris", "testes", "epididymis", "ductus-deferens", "seminal-vesicles", "bulbourethral-glands", "prostate", "scrotum", "penis"]),
};

function organSystemFor(id: string) {
  return Object.entries(organSystemIds).find(([, ids]) => ids.has(id))?.[0] ?? layerMeta.organs.system;
}

function makeGroup(layer: BodyLayer, defaultSourceId: string, rows: CatalogRow[]): AtlasCatalogSeed[] {
  const meta = layerMeta[layer];
  return rows.map(([id, name, region, functionText, positions, latin, synonyms, sourceId]) => ({
    id,
    name,
    latin,
    layer,
    system: layer === "organs" ? organSystemFor(id) : meta.system,
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
  ["buccal-region", "Região bucal", "bochecha", "Referência superficial lateral à cavidade oral.", anterior(44, 10), "Regio buccalis", undefined, "openstaxSurfaceAnatomy"],
  ["mental-region", "Região mentual", "queixo", "Referência superficial sobre a porção anterior da mandíbula.", anterior(50, 12.5), "Regio mentalis", ["região do queixo"], "openstaxSurfaceAnatomy"],
  ["costal-region", "Região costal", "parede torácica lateral", "Marca superficialmente o território das costelas.", both(36, 29, 64, 29), "Regio costalis", undefined, "openstaxSurfaceAnatomy"],
  ["epigastric-region", "Região epigástrica", "abdome superior mediano", "Divide topograficamente o abdome superior para descrição clínica.", anterior(50, 34), "Regio epigastrica", ["epigástrio"], "openstaxSurfaceAnatomy"],
  ["hypochondriac-region", "Região hipocondríaca", "abdome superior lateral", "Referência topográfica bilateral do abdome superior sob os arcos costais.", anterior(41, 34), "Regio hypochondriaca", ["hipocôndrio"], "openstaxSurfaceAnatomy"],
  ["lateral-abdominal-region", "Região lateral do abdome", "flanco", "Referência topográfica bilateral entre as regiões hipocondríaca e inguinal.", both(39, 41, 61, 41), "Regio lateralis abdominis", ["flanco"], "openstaxSurfaceAnatomy"],
  ["hypogastric-region", "Região hipogástrica", "abdome inferior mediano", "Referência topográfica mediana inferior do abdome.", anterior(50, 48), "Regio hypogastrica", ["hipogástrio", "região púbica"], "openstaxSurfaceAnatomy"],
  ["sacral-region", "Região sacral", "dorso da pelve", "Referência superficial posterior sobre o sacro.", posterior(50, 49), "Regio sacralis", undefined, "openstaxSurfaceAnatomy"],
  ["perineal-region", "Região perineal", "assoalho da pelve", "Área superficial inferior à cavidade pélvica entre as coxas.", posterior(50, 57), "Regio perinealis", ["períneo"], "openstaxSurfaceAnatomy"],
  ["coxal-region", "Região coxal", "quadril", "Referência superficial lateral da cintura pélvica.", both(39, 52, 61, 52), "Regio coxalis", ["região do quadril"], "openstaxSurfaceAnatomy"],
  ["carpal-region", "Região carpal", "punho", "Área superficial de transição entre antebraço e mão.", both(20, 48, 80, 48), "Regio carpalis", ["punho"], "openstaxSurfaceAnatomy"],
  ["digital-hand-region", "Região digital da mão", "dedos da mão", "Referência superficial dos dedos da mão.", both(15, 54, 85, 54), "Regio digitalis manus", undefined, "openstaxSurfaceAnatomy"],
  ["calcaneal-region", "Região calcânea", "calcanhar", "Referência superficial posterior do calcanhar.", posterior(55, 95), "Regio calcanea", ["calcanhar"], "openstaxSurfaceAnatomy"],
  ["dorsum-foot-region", "Dorso do pé", "pé", "Superfície superior do pé entre o tornozelo e os dedos.", anterior(44, 96), "Dorsum pedis", undefined, "openstaxSurfaceAnatomy"],
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
  ["buccinator", "Músculo bucinador", "bochecha", "Comprime a bochecha contra os dentes e auxilia mastigação, sucção e sopro.", anterior(44, 10.5), "Musculus buccinator", undefined, "openstaxAxialMuscles"],
  ["zygomaticus-major", "Zigomático maior", "face", "Eleva e desloca lateralmente o ângulo da boca.", anterior(44, 9.8), "Musculus zygomaticus major", undefined, "openstaxAxialMuscles"],
  ["platysma", "Platisma", "pescoço anterior superficial", "Tensiona a pele do pescoço e auxilia a depressão da mandíbula e do lábio inferior.", anterior(46, 15), "Platysma", undefined, "openstaxAxialMuscles"],
  ["scalene-muscles", "Músculos escalenos", "pescoço lateral", "Flexionam lateralmente o pescoço e elevam as duas primeiras costelas na inspiração forçada.", both(43, 16, 57, 16), "Musculi scaleni", ["escalenos"], "openstaxAxialMuscles"],
  ["digastric", "Músculo digástrico", "região suprahióidea", "Eleva o hioide e auxilia a depressão da mandíbula durante deglutição e abertura da boca.", anterior(48, 13), "Musculus digastricus", undefined, "openstaxAxialMuscles"],
  ["mylohyoid", "Músculo milo-hióideo", "assoalho da boca", "Eleva o assoalho da boca e o hioide durante deglutição e fala.", anterior(50, 13.5), "Musculus mylohyoideus", ["milo-hioideo"], "openstaxAxialMuscles"],
  ["pectoralis-minor", "Peitoral menor", "tórax anterior profundo", "Estabiliza e traciona a escápula anteriormente e inferiormente.", anterior(40, 24), "Musculus pectoralis minor", undefined, "openstaxAxialMuscles"],
  ["external-intercostals", "Intercostais externos", "parede torácica", "Elevam as costelas e auxiliam a inspiração.", anterior(39, 28), "Musculi intercostales externi", undefined, "openstaxAxialMuscles"],
  ["internal-oblique", "Oblíquo interno", "parede abdominal lateral", "Comprime as vísceras e participa da flexão e rotação do tronco.", anterior(42, 41), "Musculus obliquus internus abdominis", undefined, "openstaxAxialMuscles"],
  ["transversus-abdominis", "Transverso do abdome", "parede abdominal profunda", "Comprime o conteúdo abdominal e contribui para estabilização do tronco.", anterior(44, 42), "Musculus transversus abdominis", undefined, "openstaxAxialMuscles"],
  ["multifidus", "Multífido", "dorso profundo", "Estabiliza vértebras e auxilia extensão e rotação da coluna.", posterior(52, 37), "Musculus multifidus", undefined, "openstaxAxialMuscles"],
  ["subscapularis", "Subescapular", "face anterior da escápula", "Roda medialmente o braço e estabiliza a articulação glenoumeral.", anterior(37, 24), "Musculus subscapularis", undefined, "openstaxAppendicularMuscles"],
  ["pronator-teres", "Pronador redondo", "antebraço anterior proximal", "Prona o antebraço e auxilia a flexão do cotovelo.", anterior(27, 40), "Musculus pronator teres", undefined, "openstaxAppendicularMuscles"],
  ["flexor-carpi-radialis", "Flexor radial do carpo", "antebraço anterior", "Flexiona e abduz o punho.", anterior(24, 45), "Musculus flexor carpi radialis", undefined, "openstaxAppendicularMuscles"],
  ["flexor-carpi-ulnaris", "Flexor ulnar do carpo", "antebraço anterior medial", "Flexiona e aduz o punho.", anterior(29, 45), "Musculus flexor carpi ulnaris", undefined, "openstaxAppendicularMuscles"],
  ["extensor-digitorum", "Extensor dos dedos", "antebraço posterior", "Estende os dedos II a V e auxilia a extensão do punho.", posterior(76, 45), "Musculus extensor digitorum", undefined, "openstaxAppendicularMuscles"],
  ["tensor-fasciae-latae", "Tensor da fáscia lata", "quadril lateral", "Tensiona o trato iliotibial e auxilia flexão e abdução da coxa.", anterior(39, 57), "Musculus tensor fasciae latae", undefined, "openstaxAppendicularMuscles"],
  ["pectineus", "Músculo pectíneo", "coxa superomedial", "Aduz e flexiona a coxa.", anterior(47, 57), "Musculus pectineus", undefined, "openstaxAppendicularMuscles"],
  ["adductor-magnus", "Adutor magno", "coxa medial profunda", "Aduz a coxa; suas porções também auxiliam flexão ou extensão do quadril.", anterior(48, 64), "Musculus adductor magnus", undefined, "openstaxAppendicularMuscles"],
  ["vastus-intermedius", "Vasto intermédio", "coxa anterior profunda", "Estende o joelho como parte do quadríceps femoral.", anterior(44, 65), "Musculus vastus intermedius", undefined, "openstaxAppendicularMuscles"],
  ["piriformis", "Músculo piriforme", "pelve posterior e região glútea", "Roda lateralmente a coxa estendida e estabiliza a cabeça do fêmur.", posterior(55, 53), "Musculus piriformis", undefined, "openstaxAppendicularMuscles"],
  ["fibularis-brevis", "Fibular curto", "perna lateral", "Everta o pé e auxilia a flexão plantar.", anterior(41, 87), "Musculus fibularis brevis", ["peroneal curto"], "openstaxAppendicularMuscles"],
  ["extensor-digitorum-longus", "Extensor longo dos dedos", "perna anterior", "Estende os dedos II a V e dorsiflete o tornozelo.", anterior(43, 86), "Musculus extensor digitorum longus", undefined, "openstaxAppendicularMuscles"],
  ["flexor-digitorum-longus", "Flexor longo dos dedos", "perna posterior profunda", "Flexiona os dedos laterais e auxilia flexão plantar e sustentação dos arcos.", posterior(54, 87), "Musculus flexor digitorum longus", undefined, "openstaxAppendicularMuscles"],
  ["extensor-hallucis-longus", "Extensor longo do hálux", "perna anterior profunda", "Estende o hálux e auxilia a dorsiflexão.", anterior(45, 88), "Musculus extensor hallucis longus", undefined, "openstaxAppendicularMuscles"],
  ["flexor-hallucis-longus", "Flexor longo do hálux", "perna posterior profunda", "Flexiona o hálux e contribui para propulsão e sustentação do arco medial.", posterior(57, 88), "Musculus flexor hallucis longus", undefined, "openstaxAppendicularMuscles"],
  ["levator-ani", "Levantador do ânus", "assoalho pélvico", "Sustenta vísceras pélvicas e participa da continência e do controle da pressão abdominal.", posterior(50, 55), "Musculus levator ani", undefined, "openstaxAxialMuscles"],
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
  ["sphenoid-bone", "Osso esfenoide", "base do crânio", "Contribui para a base craniana, órbitas e fossas temporal e infratemporal.", both(47, 8, 53, 8), "Os sphenoidale", undefined, "openstaxSkull"],
  ["ethmoid-bone", "Osso etmoide", "base anterior do crânio e cavidade nasal", "Forma partes da base craniana, septo nasal, paredes nasais e órbitas.", anterior(50, 7.8), "Os ethmoidale", undefined, "openstaxSkull"],
  ["nasal-bone", "Osso nasal", "ponte do nariz", "Forma a porção óssea superior da ponte nasal.", anterior(50, 8.7), "Os nasale", undefined, "openstaxSkull"],
  ["lacrimal-bone", "Osso lacrimal", "parede medial da órbita", "Integra a parede medial da órbita e participa do sulco lacrimal.", anterior(48, 8.2), "Os lacrimale", undefined, "openstaxSkull"],
  ["palatine-bone", "Osso palatino", "palato duro posterior", "Forma a porção posterior do palato duro e contribui para cavidades nasal e orbital.", anterior(50, 10.5), "Os palatinum", undefined, "openstaxSkull"],
  ["inferior-nasal-concha", "Concha nasal inferior", "parede lateral da cavidade nasal", "Aumenta a área de contato do ar com a mucosa nasal.", anterior(49, 9), "Concha nasalis inferior", ["corneto nasal inferior"], "openstaxSkull"],
  ["vomer", "Vômer", "septo nasal", "Forma a porção posteroinferior do septo nasal ósseo.", anterior(50, 9.5), "Vomer", undefined, "openstaxSkull"],
  ["hyoid-bone", "Osso hioide", "pescoço superior", "Sustenta a língua e oferece inserção a músculos da deglutição e da fonação.", anterior(50, 14), "Os hyoideum", ["hioide"], "openstaxSkull"],
  ["malleus", "Martelo", "orelha média", "Transmite vibrações da membrana timpânica para a bigorna.", both(42.2, 9, 57.8, 9), "Malleus", undefined, "openstaxSkull"],
  ["incus", "Bigorna", "orelha média", "Transmite vibrações do martelo para o estribo.", both(42.5, 9.1, 57.5, 9.1), "Incus", undefined, "openstaxSkull"],
  ["stapes", "Estribo", "orelha média", "Transmite vibrações da bigorna para a janela oval da orelha interna.", both(42.8, 9.2, 57.2, 9.2), "Stapes", undefined, "openstaxSkull"],
  ["clavicle", "Clavícula", "cintura escapular anterior", "Mantém o membro superior afastado do tronco e transmite forças ao esqueleto axial.", anterior(43, 19), "Clavicula"],
  ["scapula", "Escápula", "dorso superior", "Oferece inserção muscular e participa da articulação do ombro.", posterior(42, 25), "Scapula"],
  ["sternum", "Esterno", "tórax anterior", "Protege estruturas mediastinais e articula-se com clavículas e cartilagens costais.", anterior(50, 27), "Sternum"],
  ["humerus", "Úmero", "braço", "Forma o esqueleto do braço e participa das articulações do ombro e cotovelo.", both(31, 31, 69, 31), "Humerus"],
  ["radius", "Rádio", "antebraço lateral", "Participa das articulações do cotovelo e punho e permite pronação e supinação.", both(23, 44, 77, 44), "Radius"],
  ["ulna", "Ulna", "antebraço medial", "Estabiliza o antebraço e forma importante articulação com o úmero.", both(27, 44, 73, 44), "Ulna"],
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
  ...individualVertebraRows,
  ...individualRibRows,
  ...detailedHandBoneRows,
  ...detailedFootBoneRows,
]);

const vascularStructures = makeGroup("vascular", "openstaxCirculation", [
  ["pulmonary-trunk", "Tronco pulmonar", "mediastino", "Conduz sangue do ventrículo direito às artérias pulmonares.", anterior(49, 26), "Truncus pulmonalis"],
  ["pulmonary-arteries", "Artérias pulmonares", "hilos pulmonares", "Levam sangue do tronco pulmonar aos pulmões para as trocas gasosas.", anterior(50, 24), "Arteriae pulmonales"],
  ["pulmonary-veins", "Veias pulmonares", "hilos pulmonares", "Retornam sangue oxigenado dos pulmões ao átrio esquerdo.", anterior(52, 25), "Venae pulmonales"],
  ["right-coronary-artery", "Artéria coronária direita", "superfície do coração", "Supre regiões do miocárdio direito e partes do sistema de condução, com variação anatômica.", anterior(51, 27), "Arteria coronaria dextra"],
  ["left-coronary-artery", "Artéria coronária esquerda", "superfície do coração", "Origina ramos que suprem grande parte do miocárdio esquerdo e septal.", anterior(53, 27), "Arteria coronaria sinistra"],
  ["ascending-aorta", "Aorta ascendente", "mediastino", "Conduz sangue do ventrículo esquerdo ao arco aórtico.", anterior(52, 25)],
  ["aortic-arch", "Arco da aorta", "mediastino superior", "Origina os grandes ramos arteriais para cabeça, pescoço e membros superiores.", anterior(52, 22)],
  ["thoracic-aorta", "Aorta torácica", "tórax posterior", "Distribui ramos à parede e às vísceras torácicas.", anterior(53, 31)],
  ["abdominal-aorta", "Aorta abdominal", "abdome", "Origina os principais ramos arteriais abdominais e termina nas ilíacas comuns.", anterior(53, 42)],
  ["brachiocephalic-trunk", "Tronco braquiocefálico", "mediastino superior", "Origina as artérias carótida comum direita e subclávia direita.", anterior(54, 20)],
  ["common-carotid-artery", "Artéria carótida comum", "pescoço", "Conduz sangue para cabeça e pescoço antes de sua bifurcação.", anterior(52, 15)],
  ["internal-carotid-artery", "Artéria carótida interna", "pescoço superior", "Supre principalmente o encéfalo e estruturas orbitárias.", anterior(51, 10)],
  ["external-carotid-artery", "Artéria carótida externa", "face e pescoço", "Supre grande parte das estruturas superficiais da cabeça e do pescoço.", anterior(47, 11)],
  ["vertebral-artery", "Artéria vertebral", "pescoço posterior e cavidade craniana", "Ascende pelos forames transversários cervicais e participa da circulação posterior do encéfalo.", posterior(52, 13), "Arteria vertebralis"],
  ["basilar-artery", "Artéria basilar", "base do encéfalo", "Forma-se pela união das artérias vertebrais e supre estruturas da circulação posterior.", posterior(50, 8), "Arteria basilaris"],
  ["middle-cerebral-artery", "Artéria cerebral média", "encéfalo", "Supre grande parte da superfície lateral dos hemisférios cerebrais.", anterior(48, 6), "Arteria cerebri media"],
  ["subclavian-artery", "Artéria subclávia", "base do pescoço", "Conduz sangue ao membro superior e fornece ramos cervicais e torácicos.", anterior(43, 19)],
  ["axillary-artery", "Artéria axilar", "axila", "Continuação da subclávia que supre axila e membro superior.", anterior(37, 24)],
  ["brachial-artery", "Artéria braquial", "braço", "Principal artéria do braço; divide-se em radial e ulnar.", anterior(30, 33)],
  ["radial-artery", "Artéria radial", "antebraço lateral", "Supre o antebraço lateral e participa dos arcos palmares.", anterior(23, 44)],
  ["ulnar-artery", "Artéria ulnar", "antebraço medial", "Supre o antebraço medial e participa principalmente do arco palmar superficial.", anterior(27, 44)],
  ["superficial-palmar-arch", "Arco palmar superficial", "palma", "Distribui fluxo arterial para a mão e os dedos.", anterior(19, 51)],
  ["deep-palmar-arch", "Arco palmar profundo", "palma profunda", "Conecta principalmente ramos radial e ulnar e contribui para a irrigação profunda da mão.", anterior(19, 50.5), "Arcus palmaris profundus"],
  ["common-palmar-digital-arteries", "Artérias digitais palmares comuns", "palma e dedos", "Originam ramos digitais próprios para os dedos.", anterior(16, 53), "Arteriae digitales palmares communes"],
  ["celiac-trunk", "Tronco celíaco", "abdome superior", "Origina ramos para estruturas do intestino anterior.", anterior(52, 34)],
  ["left-gastric-artery", "Artéria gástrica esquerda", "abdome superior", "Supre parte do estômago e do esôfago abdominal.", anterior(53, 34.5), "Arteria gastrica sinistra"],
  ["common-hepatic-artery", "Artéria hepática comum", "abdome superior", "Leva sangue arterial a territórios hepáticos e origina ramos para estômago e duodeno.", anterior(47, 35), "Arteria hepatica communis"],
  ["splenic-artery", "Artéria esplênica", "abdome superior", "Percorre a borda superior do pâncreas em direção ao baço.", anterior(58, 35), "Arteria splenica", ["artéria lienal"]],
  ["superior-mesenteric-artery", "Artéria mesentérica superior", "abdome", "Supre estruturas derivadas do intestino médio.", anterior(51, 40)],
  ["renal-artery", "Artéria renal", "abdome posterior", "Leva sangue aos rins.", anterior(57, 38)],
  ["gonadal-artery", "Artéria gonadal", "abdome e pelve", "Supre testículo ou ovário conforme o perfil anatômico.", anterior(55, 45), "Arteria gonadalis", ["artéria testicular", "artéria ovárica"]],
  ["inferior-mesenteric-artery", "Artéria mesentérica inferior", "abdome inferior", "Supre estruturas derivadas do intestino posterior.", anterior(51, 45)],
  ["common-iliac-artery", "Artéria ilíaca comum", "pelve superior", "Ramo terminal da aorta abdominal que se divide em ilíacas interna e externa.", anterior(48, 49)],
  ["internal-iliac-artery", "Artéria ilíaca interna", "pelve", "Supre grande parte das vísceras e paredes pélvicas.", anterior(49, 52)],
  ["external-iliac-artery", "Artéria ilíaca externa", "pelve", "Continua-se como artéria femoral após o ligamento inguinal.", anterior(44, 52)],
  ["femoral-artery", "Artéria femoral", "coxa anterior", "Principal via arterial do membro inferior proximal.", anterior(44, 61)],
  ["deep-femoral-artery", "Artéria profunda da coxa", "coxa proximal", "Principal ramo profundo da femoral para músculos e estruturas da coxa.", anterior(42, 62), "Arteria profunda femoris", ["artéria femoral profunda"]],
  ["popliteal-artery", "Artéria poplítea", "fossa poplítea", "Continuação da femoral que fornece ramos ao joelho e à perna.", posterior(56, 76)],
  ["anterior-tibial-artery", "Artéria tibial anterior", "perna anterior", "Supre o compartimento anterior da perna e continua-se no dorso do pé.", anterior(45, 84)],
  ["posterior-tibial-artery", "Artéria tibial posterior", "perna posterior", "Supre compartimentos posteriores e planta do pé.", posterior(55, 84)],
  ["fibular-artery", "Artéria fibular", "perna posterolateral", "Supre compartimentos laterais e posteriores da perna.", posterior(59, 86), "Arteria fibularis", ["artéria peroneal"]],
  ["dorsalis-pedis-artery", "Artéria dorsal do pé", "dorso do pé", "Continua a tibial anterior e supre o dorso do pé.", anterior(43, 96)],
  ["plantar-arterial-arch", "Arco arterial plantar", "planta do pé", "Distribui fluxo para metatarsos e dedos e conecta ramos plantares.", posterior(56, 96), "Arcus plantaris"],
  ["superior-vena-cava", "Veia cava superior", "mediastino superior", "Retorna ao átrio direito sangue da cabeça, pescoço, tórax e membros superiores.", anterior(55, 22)],
  ["inferior-vena-cava", "Veia cava inferior", "abdome e tórax inferior", "Retorna ao átrio direito sangue das regiões inferiores ao diafragma.", anterior(56, 40)],
  ["internal-jugular-vein", "Veia jugular interna", "pescoço", "Drena encéfalo e estruturas profundas da cabeça e do pescoço.", anterior(48, 15)],
  ["external-jugular-vein", "Veia jugular externa", "pescoço superficial", "Drena territórios superficiais da cabeça e do pescoço para a veia subclávia.", anterior(44, 15), "Vena jugularis externa"],
  ["brachiocephalic-veins", "Veias braquiocefálicas", "mediastino superior", "Recebem as veias jugulares internas e subclávias e formam a veia cava superior.", anterior(51, 20), "Venae brachiocephalicae"],
  ["subclavian-vein", "Veia subclávia", "base do pescoço", "Drena o membro superior e une-se à jugular interna.", anterior(40, 20)],
  ["axillary-vein", "Veia axilar", "axila", "Recebe veias do membro superior e continua-se como veia subclávia.", anterior(37, 24), "Vena axillaris"],
  ["brachial-veins", "Veias braquiais", "braço profundo", "Acompanham a artéria braquial e drenam o compartimento profundo do braço.", anterior(31, 34), "Venae brachiales"],
  ["radial-veins", "Veias radiais", "antebraço lateral profundo", "Acompanham a artéria radial e participam da drenagem profunda do antebraço.", anterior(23, 44), "Venae radiales"],
  ["ulnar-veins", "Veias ulnares", "antebraço medial profundo", "Acompanham a artéria ulnar e participam da drenagem profunda do antebraço.", anterior(28, 44), "Venae ulnares"],
  ["cephalic-vein", "Veia cefálica", "membro superior lateral", "Drena superficialmente o lado lateral do membro superior.", anterior(27, 36)],
  ["basilic-vein", "Veia basílica", "membro superior medial", "Drena superficialmente o lado medial do membro superior.", anterior(32, 37)],
  ["median-cubital-vein", "Veia mediana cubital", "fossa cubital", "Conecta veias superficiais do antebraço e é local comum de venopunção.", anterior(28, 39)],
  ["hepatic-portal-vein", "Veia porta hepática", "abdome superior", "Leva ao fígado sangue proveniente de grande parte do trato gastrointestinal e órgãos associados.", anterior(48, 35)],
  ["hepatic-veins", "Veias hepáticas", "abdome superior", "Drenam o fígado diretamente para a veia cava inferior.", anterior(50, 34), "Venae hepaticae"],
  ["renal-vein", "Veia renal", "abdome posterior", "Drena os rins para a veia cava inferior.", anterior(55, 38)],
  ["gonadal-vein", "Veia gonadal", "abdome e pelve", "Drena testículo ou ovário; o trajeto terminal difere entre os lados.", anterior(54, 45), "Vena gonadalis", ["veia testicular", "veia ovárica"]],
  ["common-iliac-vein", "Veia ilíaca comum", "pelve superior", "Drena pelve e membros inferiores em direção à veia cava inferior.", anterior(53, 49)],
  ["femoral-vein", "Veia femoral", "coxa", "Principal via venosa profunda da coxa.", anterior(47, 62)],
  ["popliteal-vein", "Veia poplítea", "fossa poplítea", "Recebe veias profundas da perna e continua-se como veia femoral.", posterior(55, 76), "Vena poplitea"],
  ["anterior-tibial-veins", "Veias tibiais anteriores", "perna anterior profunda", "Drenam o compartimento anterior da perna.", anterior(46, 84), "Venae tibiales anteriores"],
  ["posterior-tibial-veins", "Veias tibiais posteriores", "perna posterior profunda", "Drenam a planta e o compartimento posterior da perna.", posterior(54, 84), "Venae tibiales posteriores"],
  ["great-saphenous-vein", "Veia safena magna", "membro inferior medial", "Drena superficialmente o membro inferior e desemboca na veia femoral.", anterior(48, 78)],
  ["small-saphenous-vein", "Veia safena parva", "perna posterior", "Drena superficialmente a região posterolateral da perna e geralmente termina na veia poplítea.", posterior(58, 86), "Vena saphena parva", ["veia safena pequena"]],
]);

const nervousStructures = makeGroup("nervous", "openstaxPns", [
  ["cerebrum", "Cérebro", "cavidade craniana", "Participa de percepção, movimento voluntário, linguagem, memória e outras funções superiores.", both(50, 5, 50, 5), "Cerebrum", undefined, "openstaxCns"],
  ["cerebellum", "Cerebelo", "fossa craniana posterior", "Coordena movimentos, equilíbrio e aprendizagem motora.", posterior(50, 9), "Cerebellum", undefined, "openstaxCns"],
  ["brainstem", "Tronco encefálico", "base do encéfalo", "Conecta encéfalo e medula e participa de funções autonômicas vitais.", posterior(50, 12), "Truncus encephali", undefined, "openstaxCns"],
  ["spinal-cord", "Medula espinal", "canal vertebral", "Conduz sinais entre encéfalo e corpo e integra reflexos.", posterior(50, 34), "Medulla spinalis", ["medula espinhal"], "openstaxCns"],
  ["cauda-equina", "Cauda equina", "canal vertebral lombossacral", "Conjunto de raízes nervosas inferiores ao término da medula espinal.", posterior(50, 49), "Cauda equina"],
  ["olfactory-nerve", "Nervo olfatório (I)", "cavidade nasal e base do encéfalo", "Conduz aferências especiais relacionadas ao olfato.", anterior(50, 7.5), "Nervus olfactorius", ["primeiro nervo craniano"], "openstaxCranialNerves"],
  ["optic-nerve", "Nervo óptico", "órbita", "Conduz informação visual da retina ao sistema nervoso central.", anterior(48, 8), "Nervus opticus"],
  ["oculomotor-nerve", "Nervo oculomotor (III)", "órbita e mesencéfalo", "Inerva a maioria dos músculos extraoculares, eleva a pálpebra e conduz fibras parassimpáticas para a pupila.", anterior(47, 8.4), "Nervus oculomotorius", ["terceiro nervo craniano"], "openstaxCranialNerves"],
  ["trochlear-nerve", "Nervo troclear (IV)", "órbita e mesencéfalo", "Inerva o músculo oblíquo superior do olho.", anterior(46.5, 8.6), "Nervus trochlearis", ["quarto nervo craniano"], "openstaxCranialNerves"],
  ["trigeminal-nerve", "Nervo trigêmeo", "face", "Conduz sensibilidade da face e participa da mastigação.", anterior(45, 10), "Nervus trigeminus"],
  ["abducens-nerve", "Nervo abducente (VI)", "órbita e ponte", "Inerva o músculo reto lateral e participa da abdução do olho.", anterior(47.5, 8.8), "Nervus abducens", ["sexto nervo craniano"], "openstaxCranialNerves"],
  ["facial-nerve", "Nervo facial", "face", "Inerva músculos da expressão facial e conduz fibras autonômicas e gustativas específicas.", anterior(43, 10), "Nervus facialis"],
  ["vestibulocochlear-nerve", "Nervo vestibulococlear (VIII)", "orelha interna e tronco encefálico", "Conduz informações da audição e do equilíbrio.", both(42, 9, 58, 9), "Nervus vestibulocochlearis", ["oitavo nervo craniano", "nervo auditivo"], "openstaxCranialNerves"],
  ["glossopharyngeal-nerve", "Nervo glossofaríngeo (IX)", "orofaringe e tronco encefálico", "Participa de sensibilidade e gustação da língua posterior, deglutição e reflexos viscerais.", anterior(49, 12.5), "Nervus glossopharyngeus", ["nono nervo craniano"], "openstaxCranialNerves"],
  ["vagus-nerve", "Nervo vago", "pescoço, tórax e abdome", "Fornece importante inervação parassimpática às vísceras torácicas e abdominais.", anterior(53, 17), "Nervus vagus"],
  ["accessory-nerve", "Nervo acessório (XI)", "pescoço", "Fornece inervação motora ao esternocleidomastoideo e trapézio.", posterior(56, 16), "Nervus accessorius", ["décimo primeiro nervo craniano"], "openstaxCranialNerves"],
  ["hypoglossal-nerve", "Nervo hipoglosso (XII)", "língua e pescoço superior", "Inerva músculos intrínsecos e extrínsecos da língua, exceto o palatoglosso.", anterior(49, 12), "Nervus hypoglossus", ["décimo segundo nervo craniano"], "openstaxCranialNerves"],
  ["greater-occipital-nerve", "Nervo occipital maior", "couro cabeludo posterior", "Conduz sensibilidade de grande parte do couro cabeludo posterior.", posterior(52, 7), "Nervus occipitalis major"],
  ["cervical-plexus", "Plexo cervical", "pescoço", "Origina ramos sensitivos e motores para pescoço e regiões adjacentes.", anterior(46, 16), "Plexus cervicalis"],
  ["brachial-plexus", "Plexo braquial", "base do pescoço e axila", "Origina a maior parte da inervação do membro superior.", anterior(39, 21), "Plexus brachialis"],
  ["dorsal-scapular-nerve", "Nervo dorsal da escápula", "pescoço e dorso superior", "Inerva principalmente levantador da escápula e romboides.", posterior(58, 22), "Nervus dorsalis scapulae"],
  ["long-thoracic-nerve", "Nervo torácico longo", "parede torácica lateral", "Inerva o serrátil anterior.", anterior(37, 29), "Nervus thoracicus longus"],
  ["suprascapular-nerve", "Nervo supraescapular", "escápula posterior", "Inerva supraespinal e infraespinal e fornece ramos articulares ao ombro.", posterior(61, 23), "Nervus suprascapularis"],
  ["thoracodorsal-nerve", "Nervo toracodorsal", "axila e dorso", "Inerva o músculo latíssimo do dorso.", posterior(65, 31), "Nervus thoracodorsalis"],
  ["lumbar-plexus", "Plexo lombar", "parede posterior do abdome", "Origina nervos para parede abdominal e parte do membro inferior.", posterior(53, 44), "Plexus lumbalis"],
  ["sacral-plexus", "Plexo sacral", "pelve posterior", "Origina nervos para pelve, região glútea e grande parte do membro inferior.", posterior(54, 52), "Plexus sacralis"],
  ["phrenic-nerve", "Nervo frênico", "pescoço e tórax", "Fornece a inervação motora principal do diafragma.", anterior(52, 27), "Nervus phrenicus"],
  ["axillary-nerve", "Nervo axilar", "ombro", "Inerva deltoide e redondo menor e conduz sensibilidade do ombro lateral.", posterior(65, 24), "Nervus axillaris"],
  ["musculocutaneous-nerve", "Nervo musculocutâneo", "braço anterior", "Inerva músculos anteriores do braço e conduz sensibilidade do antebraço lateral.", anterior(31, 32), "Nervus musculocutaneus"],
  ["median-nerve", "Nervo mediano", "membro superior", "Inerva muitos flexores do antebraço e músculos da mão e conduz sensibilidade palmar lateral.", anterior(27, 42), "Nervus medianus"],
  ["ulnar-nerve", "Nervo ulnar", "membro superior medial", "Inerva diversos músculos da mão e parte dos flexores do antebraço.", anterior(31, 40), "Nervus ulnaris"],
  ["radial-nerve", "Nervo radial", "membro superior posterior", "Inerva músculos extensores do braço e antebraço e áreas cutâneas posteriores.", posterior(70, 37), "Nervus radialis"],
  ["intercostal-nerves", "Nervos intercostais", "parede torácica", "Inervam músculos intercostais e pele da parede torácica e abdominal superior.", anterior(42, 30), "Nervi intercostales"],
  ["sympathetic-trunk", "Tronco simpático", "paravertebral", "Distribui fibras simpáticas por cadeias ganglionares ao longo da coluna vertebral.", posterior(52, 34), "Truncus sympathicus", ["cadeia simpática"]],
  ["iliohypogastric-nerve", "Nervo ílio-hipogástrico", "parede abdominal inferior", "Conduz fibras motoras e sensitivas para parede abdominal e região suprapúbica.", anterior(43, 47), "Nervus iliohypogastricus"],
  ["ilioinguinal-nerve", "Nervo ilioinguinal", "canal inguinal", "Conduz sensibilidade da região inguinal e genital externa e fibras motoras para a parede abdominal.", anterior(43, 51), "Nervus ilioinguinalis"],
  ["genitofemoral-nerve", "Nervo genitofemoral", "abdome posterior e região inguinal", "Divide-se em ramos genital e femoral para territórios inguinais e genitais.", anterior(46, 52), "Nervus genitofemoralis"],
  ["lateral-femoral-cutaneous-nerve", "Nervo cutâneo lateral da coxa", "pelve e coxa lateral", "Conduz sensibilidade da face anterolateral da coxa.", anterior(39, 60), "Nervus cutaneus femoris lateralis"],
  ["pudendal-nerve", "Nervo pudendo", "pelve e períneo", "Fornece inervação somática importante ao períneo e aos esfíncteres externos.", posterior(52, 56), "Nervus pudendus"],
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
  ["eyes", "Olhos", "órbitas", "Recebem estímulos luminosos e iniciam o processamento visual.", anterior(47, 8), "Oculi", undefined, "openstaxSenses"],
  ["cornea", "Córnea", "segmento anterior do olho", "Forma a superfície transparente anterior e fornece grande parte do poder refrativo do olho.", anterior(47, 8), "Cornea", undefined, "openstaxSenses"],
  ["iris", "Íris", "segmento anterior do olho", "Modula o diâmetro pupilar e a quantidade de luz que alcança a retina.", anterior(47.2, 8.1), "Iris", undefined, "openstaxSenses"],
  ["sclera", "Esclera", "túnica externa do olho", "Protege o globo ocular e oferece inserção aos músculos extraoculares.", anterior(46.8, 8), "Sclera", undefined, "openstaxSenses"],
  ["lacrimal-gland", "Glândula lacrimal", "órbita superolateral", "Produz a porção aquosa do filme lacrimal que lubrifica e protege a superfície ocular.", anterior(44.8, 7.5), "Glandula lacrimalis", undefined, "openstaxSenses"],
  ["retina", "Retina", "parede interna do olho", "Contém fotorreceptores que convertem energia luminosa em sinais neurais.", anterior(46.5, 8), "Retina", undefined, "openstaxSenses"],
  ["lens-eye", "Cristalino", "segmento anterior do olho", "Modifica sua curvatura para ajudar a focalizar a imagem sobre a retina.", anterior(47.4, 8.2), "Lens", ["lente do olho"], "openstaxSenses"],
  ["cochlea", "Cóclea", "orelha interna", "Abriga o órgão sensorial da audição e participa da transdução de vibrações sonoras.", both(42.4, 9, 57.6, 9), "Cochlea", undefined, "openstaxSenses"],
  ["semicircular-canals", "Canais semicirculares", "orelha interna", "Detectam acelerações angulares da cabeça e participam do equilíbrio.", both(42, 8.4, 58, 8.4), "Canales semicirculares", undefined, "openstaxSenses"],
  ["tympanic-membrane", "Membrana timpânica", "limite entre orelhas externa e média", "Vibra com ondas sonoras e transmite energia mecânica aos ossículos da audição.", both(42, 9, 58, 9), "Membrana tympanica", ["tímpano"], "openstaxSenses"],
  ["olfactory-epithelium", "Epitélio olfatório", "cavidade nasal superior", "Contém receptores que iniciam a transdução de moléculas odoríferas.", anterior(50, 8.7), "Epithelium olfactorium", undefined, "openstaxSenses"],
  ["tongue", "Língua", "cavidade oral", "Participa da gustação, manipulação do alimento, deglutição e articulação da fala.", anterior(50, 11.2), "Lingua", undefined, "openstaxSenses"],
  ["taste-buds", "Botões gustativos", "língua e cavidade oral", "Reúnem células receptoras envolvidas na percepção dos sabores.", anterior(49.5, 11.4), "Caliculi gustatorii", ["calículos gustatórios"], "openstaxSenses"],
  ["nasal-cavity", "Cavidade nasal", "nariz", "Filtra, aquece e umidifica o ar e participa do olfato.", anterior(50, 9), "Cavitas nasi", undefined, "openstaxRespiratory"],
  ["oral-cavity", "Cavidade oral", "face inferior", "Inicia digestão mecânica e química e participa de fala e deglutição.", anterior(50, 11), "Cavitas oris", undefined, "openstaxDigestive"],
  ["parotid-gland", "Glândula parótida", "face lateral", "Produz secreção salivar serosa conduzida à cavidade oral.", anterior(43, 11), "Glandula parotidea", undefined, "openstaxDigestive"],
  ["submandibular-gland", "Glândula submandibular", "assoalho da boca e região submandibular", "Produz secreção salivar mista e a conduz ao assoalho da boca.", anterior(47, 13), "Glandula submandibularis", undefined, "ncbiSalivaryGlands"],
  ["sublingual-gland", "Glândula sublingual", "assoalho da boca", "Produz secreção predominantemente mucosa por múltiplos ductos no assoalho oral.", anterior(49, 12), "Glandula sublingualis", undefined, "ncbiSalivaryGlands"],
  ["pharynx", "Faringe", "cabeça e pescoço", "Conduz ar à laringe e alimento ao esôfago.", anterior(50, 13), "Pharynx", undefined, "openstaxRespiratory"],
  ["larynx", "Laringe", "pescoço anterior", "Protege a via aérea inferior e participa da produção da voz.", anterior(50, 16), "Larynx", undefined, "openstaxRespiratory"],
  ["epiglottis", "Epiglote", "entrada da laringe", "Contribui para proteger a via aérea durante a deglutição.", anterior(50, 14.5), "Epiglottis", undefined, "openstaxRespiratoryAnatomy"],
  ["thyroid-gland", "Glândula tireoide", "pescoço anterior", "Produz hormônios que participam da regulação metabólica e da homeostase do cálcio.", anterior(50, 17), "Glandula thyroidea", undefined, "openstaxEndocrine"],
  ["parathyroid-glands", "Glândulas paratireoides", "face posterior da tireoide", "Secretam paratormônio, importante na homeostase do cálcio.", posterior(50, 17), "Glandulae parathyroideae", undefined, "openstaxEndocrine"],
  ["trachea", "Traqueia", "pescoço e mediastino superior", "Conduz ar entre laringe e brônquios principais.", anterior(50, 20), "Trachea", undefined, "openstaxRespiratory"],
  ["main-bronchi", "Brônquios principais", "tórax", "Conduzem ar da traqueia para cada pulmão.", anterior(50, 23), "Bronchi principales", undefined, "openstaxRespiratory"],
  ["bronchioles", "Bronquíolos", "parênquima pulmonar", "Conduzem e regulam o fluxo de ar em vias aéreas intrapulmonares sem cartilagem.", anterior(58, 25), "Bronchioli", undefined, "openstaxRespiratoryAnatomy"],
  ["alveoli", "Alvéolos pulmonares", "porção respiratória dos pulmões", "Formam as unidades terminais onde ocorre difusão gasosa com capilares pulmonares.", anterior(59, 27), "Alveoli pulmonis", undefined, "openstaxRespiratoryAnatomy"],
  ["pleura", "Pleura", "cavidades pleurais", "Reveste os pulmões e a parede torácica, permitindo deslizamento com pequena quantidade de líquido pleural.", both(62, 25, 38, 25), "Pleura", undefined, "openstaxRespiratoryAnatomy"],
  ["thymus", "Timo", "mediastino anterior", "Participa da maturação de linfócitos T, especialmente no início da vida.", anterior(50, 23), "Thymus", undefined, "openstaxImmune"],
  ["pericardium", "Pericárdio", "mediastino médio", "Envolve o coração, reduz atrito e limita dilatação aguda excessiva.", anterior(52, 27), "Pericardium", undefined, "openstaxHeart"],
  ["right-atrium", "Átrio direito", "base direita do coração", "Recebe sangue das veias cavas e do seio coronário.", anterior(51, 26), "Atrium dextrum", undefined, "openstaxHeart"],
  ["left-atrium", "Átrio esquerdo", "base posterior do coração", "Recebe sangue oxigenado das veias pulmonares.", posterior(49, 26), "Atrium sinistrum", undefined, "openstaxHeart"],
  ["right-ventricle", "Ventrículo direito", "face anterior do coração", "Ejeta sangue para o tronco pulmonar.", anterior(51, 28), "Ventriculus dexter", undefined, "openstaxHeart"],
  ["left-ventricle", "Ventrículo esquerdo", "face esquerda e ápice do coração", "Ejeta sangue para a aorta e sustenta a circulação sistêmica.", anterior(53, 29), "Ventriculus sinister", undefined, "openstaxHeart"],
  ["tricuspid-valve", "Valva atrioventricular direita", "entre átrio e ventrículo direitos", "Favorece fluxo unidirecional do átrio direito ao ventrículo direito.", anterior(51, 27), "Valva atrioventricularis dextra", ["valva tricúspide"], "openstaxHeart"],
  ["mitral-valve", "Valva atrioventricular esquerda", "entre átrio e ventrículo esquerdos", "Favorece fluxo unidirecional do átrio esquerdo ao ventrículo esquerdo.", anterior(52.5, 27), "Valva atrioventricularis sinistra", ["valva mitral", "valva bicúspide"], "openstaxHeart"],
  ["pulmonary-valve", "Valva pulmonar", "saída do ventrículo direito", "Impede refluxo do tronco pulmonar para o ventrículo direito após a ejeção.", anterior(50.5, 25.8), "Valva trunci pulmonalis", undefined, "openstaxHeart"],
  ["aortic-valve", "Valva aórtica", "saída do ventrículo esquerdo", "Impede refluxo da aorta para o ventrículo esquerdo após a ejeção.", anterior(52, 25.8), "Valva aortae", undefined, "openstaxHeart"],
  ["esophagus", "Esôfago", "pescoço, tórax e abdome superior", "Transporta o bolo alimentar da faringe ao estômago.", anterior(54, 29), "Oesophagus", undefined, "openstaxDigestive"],
  ["diaphragm", "Diafragma", "limite toracoabdominal", "É o principal músculo da inspiração e separa tórax e abdome.", anterior(50, 31), "Diaphragma", undefined, "openstaxRespiratory"],
  ["stomach", "Estômago", "abdome superior esquerdo", "Armazena e mistura alimento e inicia etapas da digestão proteica.", anterior(57, 35), "Gaster", undefined, "openstaxDigestive"],
  ["gallbladder", "Vesícula biliar", "abdome superior direito", "Armazena e concentra a bile entre as refeições.", anterior(45, 36), "Vesica biliaris", undefined, "openstaxDigestive"],
  ["common-bile-duct", "Ducto colédoco", "abdome superior", "Conduz bile em direção ao duodeno após receber vias hepática e cística.", anterior(48, 37), "Ductus choledochus", ["ducto biliar comum"], "openstaxDigestive"],
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
  ["anal-canal", "Canal anal", "pelve inferior e períneo", "Forma o segmento terminal do trato gastrointestinal e participa da continência e defecação.", posterior(50, 56), "Canalis analis", undefined, "openstaxDigestive"],
  ["adrenal-glands", "Glândulas suprarrenais", "retroperitônio superior", "Produzem hormônios corticais e catecolaminas medulares.", posterior(56, 36), "Glandulae suprarenales", undefined, "openstaxEndocrine"],
  ["hypothalamus", "Hipotálamo", "diencéfalo", "Integra regulação autonômica e endócrina e controla grande parte da atividade hipofisária.", anterior(50, 7), "Hypothalamus", undefined, "openstaxEndocrine"],
  ["ureters", "Ureteres", "retroperitônio e pelve", "Conduzem urina dos rins à bexiga.", anterior(55, 44), "Ureteres", undefined, "openstaxKidney"],
  ["urinary-bladder", "Bexiga urinária", "pelve anterior", "Armazena urina até a micção.", anterior(50, 53), "Vesica urinaria", ["bexiga"], "openstaxKidney"],
  ["urethra", "Uretra", "pelve e períneo", "Conduz urina da bexiga ao exterior.", anterior(50, 56), "Urethra", undefined, "openstaxKidney"],
  ["ovaries", "Ovários", "pelve", "Produzem oócitos e hormônios que participam da função reprodutiva.", anterior(43, 52), "Ovaria", ["ovário"], "openstaxReproductive"],
  ["uterine-tubes", "Tubas uterinas", "pelve", "Conduzem o oócito em direção ao útero e são o local mais comum de fecundação.", anterior(46, 51), "Tubae uterinae", ["trompas uterinas", "trompas de falópio"], "openstaxReproductive"],
  ["uterus", "Útero", "pelve menor", "Órgão muscular que recebe o embrião implantado e sustenta o desenvolvimento durante a gestação.", anterior(50, 52), "Uterus", undefined, "openstaxReproductive"],
  ["cervix", "Colo do útero", "pelve menor", "Forma a porção inferior do útero e se projeta no canal vaginal.", anterior(50, 54), "Cervix uteri", ["cérvix"], "openstaxReproductive"],
  ["vagina", "Vagina", "pelve e períneo", "Canal fibromuscular que se estende do colo do útero ao vestíbulo.", anterior(50, 56), "Vagina", undefined, "openstaxReproductive"],
  ["vulva", "Vulva", "períneo anterior", "Conjunto das estruturas genitais externas típicas da anatomia ovariana.", anterior(50, 57), "Pudendum femininum", undefined, "openstaxReproductive"],
  ["clitoris", "Clitóris", "vulva", "Órgão erétil altamente inervado relacionado à resposta sexual.", anterior(50, 56.5), "Clitoris", undefined, "openstaxReproductive"],
  ["testes", "Testículos", "escroto", "Produzem espermatozoides nos túbulos seminíferos e secretam hormônios androgênicos.", anterior(48, 58), "Testes", ["testículo"], "openstaxReproductive"],
  ["epididymis", "Epidídimo", "escroto", "Recebe espermatozoides do testículo e participa de sua maturação e armazenamento.", anterior(47, 57.5), "Epididymis", undefined, "openstaxReproductive"],
  ["ductus-deferens", "Ducto deferente", "escroto, canal inguinal e pelve", "Conduz espermatozoides do epidídimo em direção ao ducto ejaculatório.", anterior(47, 54), "Ductus deferens", ["canal deferente"], "openstaxReproductive"],
  ["seminal-vesicles", "Vesículas seminais", "pelve posterior à bexiga", "Produzem parte importante do fluido seminal.", anterior(53, 52.5), "Glandulae vesiculosae", undefined, "openstaxReproductive"],
  ["bulbourethral-glands", "Glândulas bulbouretrais", "períneo profundo", "Secretam fluido para a uretra esponjosa antes da ejaculação.", anterior(51, 55.5), "Glandulae bulbourethrales", ["glândulas de Cowper"], "openstaxReproductive"],
  ["prostate", "Próstata", "pelve inferior à bexiga", "Produz secreção que contribui para o sêmen e circunda a uretra prostática.", anterior(50, 54.5), "Prostata", undefined, "openstaxReproductive"],
  ["scrotum", "Escroto", "períneo anterior", "Bolsa cutânea e fascial que abriga os testículos e participa de sua termorregulação.", anterior(50, 58), "Scrotum", undefined, "openstaxReproductive"],
  ["penis", "Pênis", "períneo anterior", "Contém tecidos eréteis e conduz a uretra em seu segmento distal.", anterior(50, 58), "Penis", undefined, "openstaxReproductive"],
  ["mammary-glands", "Glândulas mamárias", "parede torácica anterior", "Glândulas cutâneas modificadas capazes de produzir leite após estimulação hormonal apropriada.", anterior(43, 27), "Glandulae mammariae", ["mamas"], "openstaxReproductive"],
  ["pituitary-gland", "Hipófise", "base do crânio", "Secreta hormônios que regulam múltiplos eixos endócrinos.", anterior(50, 8), "Hypophysis", ["glândula pituitária"], "openstaxEndocrine"],
  ["pineal-gland", "Glândula pineal", "encéfalo", "Secreta melatonina e participa da regulação circadiana.", posterior(50, 7), "Glandula pinealis", undefined, "openstaxEndocrine"],
  ["palatine-tonsils", "Tonsilas palatinas", "orofaringe", "Participam da vigilância imune na entrada dos tratos respiratório e digestório.", anterior(48, 12), "Tonsillae palatinae", ["amígdalas"], "openstaxImmune"],
  ["cervical-lymph-nodes", "Linfonodos cervicais", "pescoço", "Filtram linfa de territórios da cabeça e do pescoço.", anterior(44, 16), "Nodi lymphoidei cervicales", undefined, "openstaxImmune"],
  ["axillary-lymph-nodes", "Linfonodos axilares", "axila", "Filtram linfa de grande parte do membro superior, parede torácica e mama.", anterior(37, 24), "Nodi lymphoidei axillares", undefined, "openstaxImmune"],
  ["inguinal-lymph-nodes", "Linfonodos inguinais", "virilha", "Filtram linfa de territórios superficiais do membro inferior e regiões adjacentes.", anterior(43, 53), "Nodi lymphoidei inguinales", undefined, "openstaxImmune"],
]);

const deepLayerWithPosteriorContext = new Set<BodyLayer>(["vascular", "nervous", "organs"]);
const femaleReproductiveDetail: Record<string, Partial<Pick<AtlasCatalogSeed, "summary" | "relations" | "nearby">>> = {
  ovaries: {
    summary: "Gônadas pares situadas na pelve, responsáveis pela produção de oócitos e pela secreção de hormônios ovarianos.",
    relations: "Cada ovário liga-se ao útero pelo ligamento próprio do ovário e à parede pélvica pelo ligamento suspensor; as fímbrias da tuba uterina ficam próximas à sua extremidade tubária.",
    nearby: ["Tubas uterinas", "Útero", "Ligamento largo", "Vasos ilíacos"],
  },
  "uterine-tubes": {
    summary: "Tubos musculomembranosos pares que se estendem dos cornos uterinos em direção aos ovários.",
    relations: "O infundíbulo e as fímbrias aproximam-se do ovário; a ampola é o local mais comum de fecundação, e o istmo comunica-se com a cavidade uterina.",
    nearby: ["Ovários", "Útero", "Ligamento largo", "Cavidade peritoneal"],
  },
  uterus: {
    summary: "Órgão muscular oco, mediano e de paredes espessas, situado na pelve menor entre a bexiga e o reto.",
    relations: "O fundo recebe as tubas uterinas, o colo projeta-se na porção superior da vagina, a bexiga fica anteriormente e o reto posteriormente.",
    nearby: ["Bexiga urinária", "Reto", "Tubas uterinas", "Ovários", "Vagina"],
  },
  cervix: {
    summary: "Porção inferior e estreita do útero que contém o canal cervical e se projeta no ápice da vagina.",
    relations: "Continua-se superiormente com o corpo do útero e inferiormente com a vagina; relaciona-se anteriormente com a bexiga e posteriormente com o reto.",
    nearby: ["Corpo do útero", "Vagina", "Bexiga urinária", "Reto"],
  },
  vagina: {
    summary: "Canal fibromuscular que se estende do colo do útero ao vestíbulo vaginal.",
    relations: "Situa-se posteriormente à bexiga e à uretra e anteriormente ao reto; envolve o colo uterino formando os fórnices vaginais.",
    nearby: ["Colo do útero", "Uretra", "Bexiga urinária", "Reto", "Vulva"],
  },
  vulva: {
    summary: "Conjunto das estruturas genitais externas, incluindo monte do púbis, lábios maiores e menores, clitóris e vestíbulo.",
    relations: "O vestíbulo contém as aberturas externas da uretra e da vagina e é delimitado pelos lábios menores.",
    nearby: ["Clitóris", "Vestíbulo vaginal", "Uretra", "Vagina", "Períneo"],
  },
};

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
}).map((structure) => ({ ...structure, ...(femaleReproductiveDetail[structure.id] ?? {}) }));
