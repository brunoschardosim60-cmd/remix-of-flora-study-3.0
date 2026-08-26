export type SensoryJourneyId = "eye" | "oral" | "cell";
export type SensoryStage = "macro" | "meso";

export interface SensoryStructure {
  id: string;
  name: string;
  latin?: string;
  group: string;
  summary: string;
  function: string;
  sourceId: string;
  image: string;
  stage: SensoryStage;
  x: number;
  y: number;
}

export interface SensoryView {
  id: string;
  journeyId: SensoryJourneyId;
  stage: SensoryStage;
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  alt: string;
  assetKind: "anatomical" | "schematic" | "model3d";
  sourceId: string;
  structureIds: string[];
}

const make = (
  id: string,
  name: string,
  group: string,
  summary: string,
  fn: string,
  sourceId: string,
  image: string,
  stage: SensoryStage,
  x: number,
  y: number,
  latin?: string,
): SensoryStructure => ({ id, name, latin, group, summary, function: fn, sourceId, image, stage, x, y });

const eyeExternal = "/medicine/histology/openstax/eye-external.jpg";
const eyeAnatomy = "/medicine/histology/openstax/eye-anatomy.jpg";
const eyeMuscles = "/medicine/histology/openstax/eye-muscles.jpg";
const oralCavity = "/medicine/histology/openstax/oral-cavity.jpg";
const teethTypes = "/medicine/histology/openstax/teeth-types.jpg";
const toothSection = "/medicine/histology/openstax/tooth-section.jpg";
const tongueAnatomy = "/medicine/histology/openstax/tongue-anatomy.jpg";
const tongueTaste = "/medicine/histology/openstax/tongue-taste.jpg";
const salivaryGlands = "/medicine/histology/openstax/salivary-glands.jpg";

export const sensoryStructures: SensoryStructure[] = [
  make("eyelids", "Pálpebras", "Superfície ocular", "Pregas móveis que recobrem a região anterior do olho.", "Protegem o globo ocular e distribuem o filme lacrimal durante o piscar.", "openstax-eye", eyeExternal, "macro", 49, 45, "Palpebrae"),
  make("eyelashes", "Cílios", "Superfície ocular", "Pelos curtos implantados nas margens palpebrais.", "Ajudam a reter partículas e participam do reflexo de piscar.", "openstax-eye", eyeExternal, "macro", 49, 51, "Cilia"),
  make("conjunctiva", "Conjuntiva", "Superfície ocular", "Membrana mucosa que reveste a face interna das pálpebras e a esclera anterior.", "Lubrifica e contribui para a defesa da superfície ocular.", "openstax-eye", eyeExternal, "macro", 53, 48, "Tunica conjunctiva"),
  make("lacrimal-gland", "Glândula lacrimal", "Aparelho lacrimal", "Glândula serosa localizada na porção superolateral da órbita.", "Produz a porção aquosa das lágrimas, que lubrifica e protege a superfície ocular.", "openstax-eye", eyeExternal, "macro", 65, 30, "Glandula lacrimalis"),

  make("cornea", "Córnea", "Globo ocular", "Parte anterior transparente da túnica fibrosa do olho.", "É a principal superfície refrativa do sistema óptico ocular.", "openstax-eye", eyeAnatomy, "meso", 64, 48, "Cornea"),
  make("iris", "Íris", "Globo ocular", "Diafragma pigmentado situado anteriormente ao cristalino.", "Modula o diâmetro pupilar e a quantidade de luz que alcança a retina.", "openstax-eye", eyeAnatomy, "meso", 61, 50, "Iris"),
  make("pupil", "Pupila", "Globo ocular", "Abertura circular central da íris, observada na face anterior do olho.", "Controla, por meio da íris, a passagem de luz para o interior do olho.", "openstax-eye", eyeAnatomy, "meso", 64, 53, "Pupilla"),
  make("lens", "Cristalino", "Globo ocular", "Lente biconvexa transparente suspensa atrás da íris.", "Ajusta a focalização da imagem sobre a retina por acomodação.", "openstax-eye", eyeAnatomy, "meso", 58, 47, "Lens crystallina"),
  make("sclera", "Esclera", "Globo ocular", "Camada fibrosa externa e opaca que envolve a maior parte do globo.", "Mantém a forma do olho, protege estruturas internas e recebe inserções musculares.", "openstax-eye", eyeAnatomy, "meso", 42, 27, "Sclera"),
  make("ciliary-body", "Corpo ciliar", "Globo ocular", "Espessamento anterior da úvea que contém músculo e processos ciliares.", "Participa da acomodação e da produção do humor aquoso.", "openstax-eye", eyeAnatomy, "meso", 57, 61, "Corpus ciliare"),
  make("retina", "Retina", "Globo ocular", "Camada nervosa interna que contém fotorreceptores e circuitos visuais.", "Converte luz em sinais neurais e inicia seu processamento.", "openstax-eye", eyeAnatomy, "meso", 42, 40, "Retina"),
  make("optic-nerve", "Nervo óptico", "Globo ocular", "Feixe de axônios das células ganglionares que deixa o olho posteriormente.", "Transmite informação visual da retina para o encéfalo.", "openstax-eye", eyeAnatomy, "meso", 27, 66, "Nervus opticus"),
  make("vitreous-humor", "Humor vítreo", "Câmaras oculares", "Gel transparente que preenche a cavidade posterior ao cristalino.", "Ajuda a manter o formato do globo e a retina aplicada às camadas externas.", "openstax-eye", eyeAnatomy, "meso", 50, 48, "Corpus vitreum"),
  make("aqueous-humor", "Humor aquoso", "Câmaras oculares", "Fluido transparente das câmaras anterior e posterior.", "Nutre córnea e cristalino e contribui para a pressão intraocular.", "openstax-eye", eyeAnatomy, "meso", 62, 57, "Humor aquosus"),

  make("superior-rectus", "Músculo reto superior", "Músculos extraoculares", "Músculo reto na porção superior da órbita.", "Eleva o olho e contribui para adução e rotação medial.", "openstax-eye-muscles", eyeMuscles, "meso", 52, 27, "Musculus rectus superior"),
  make("inferior-rectus", "Músculo reto inferior", "Músculos extraoculares", "Músculo reto na porção inferior da órbita.", "Deprime o olho e contribui para adução e rotação lateral.", "openstax-eye-muscles", eyeMuscles, "meso", 53, 70, "Musculus rectus inferior"),
  make("medial-rectus", "Músculo reto medial", "Músculos extraoculares", "Músculo reto na parede medial da órbita.", "Realiza principalmente a adução do globo ocular.", "openstax-eye-muscles", eyeMuscles, "meso", 42, 48, "Musculus rectus medialis"),
  make("lateral-rectus", "Músculo reto lateral", "Músculos extraoculares", "Músculo reto na parede lateral da órbita.", "Realiza principalmente a abdução do globo ocular.", "openstax-eye-muscles", eyeMuscles, "meso", 66, 49, "Musculus rectus lateralis"),
  make("superior-oblique", "Músculo oblíquo superior", "Músculos extraoculares", "Músculo que passa pela tróclea superomedial antes de se inserir no globo.", "Intorce, deprime e auxilia a abdução do olho.", "openstax-eye-muscles", eyeMuscles, "meso", 44, 34, "Musculus obliquus superior"),
  make("inferior-oblique", "Músculo oblíquo inferior", "Músculos extraoculares", "Músculo que se origina no assoalho anterior da órbita.", "Extorce, eleva e auxilia a abdução do olho.", "openstax-eye-muscles", eyeMuscles, "meso", 60, 66, "Musculus obliquus inferior"),

  make("lips", "Lábios", "Cavidade oral", "Pregas musculomucosas que delimitam a abertura da boca.", "Participam da fala, apreensão do alimento e vedação oral.", "openstax-oral", oralCavity, "macro", 50, 88, "Labia oris"),
  make("cheeks", "Bochechas", "Cavidade oral", "Paredes laterais musculares da cavidade oral.", "Mantêm o alimento entre as superfícies mastigatórias e auxiliam expressão e fala.", "openstax-oral", oralCavity, "macro", 24, 51, "Buccae"),
  make("hard-palate", "Palato duro", "Cavidade oral", "Porção óssea anterior do teto da boca.", "Separa cavidades oral e nasal e oferece superfície rígida para manipulação do alimento.", "openstax-oral", oralCavity, "meso", 44, 30, "Palatum durum"),
  make("soft-palate", "Palato mole", "Cavidade oral", "Porção muscular posterior e móvel do teto da boca.", "Eleva-se na deglutição para limitar comunicação com a nasofaringe.", "openstax-oral", oralCavity, "meso", 45, 38, "Palatum molle"),
  make("uvula", "Úvula", "Cavidade oral", "Projeção mediana pendente do palato mole.", "Integra o mecanismo do fechamento velofaríngeo e contribui para a articulação da fala.", "openstax-oral", oralCavity, "meso", 50, 45, "Uvula palatina"),

  make("incisors", "Incisivos", "Dentes", "Dentes anteriores com borda cortante.", "Cortam o alimento durante a mastigação.", "openstax-oral", teethTypes, "meso", 50, 74, "Dentes incisivi"),
  make("canines", "Caninos", "Dentes", "Dentes de coroa pontiaguda situados ao lado dos incisivos.", "Perfuram e rasgam o alimento.", "openstax-oral", teethTypes, "meso", 38, 65, "Dentes canini"),
  make("premolars", "Pré-molares", "Dentes", "Dentes posteriores com cúspides, presentes na dentição permanente.", "Trituram e esmagam o alimento.", "openstax-oral", teethTypes, "meso", 30, 59, "Dentes premolares"),
  make("molars", "Molares", "Dentes", "Dentes posteriores com ampla superfície oclusal.", "Realizam trituração vigorosa do alimento.", "openstax-oral", teethTypes, "meso", 25, 49, "Dentes molares"),
  make("enamel", "Esmalte", "Histologia do dente", "Tecido altamente mineralizado que recobre a coroa.", "Resiste ao desgaste mecânico e protege a dentina subjacente.", "openstax-oral", toothSection, "meso", 48, 24, "Enamelum"),
  make("dentin", "Dentina", "Histologia do dente", "Tecido mineralizado que compõe a maior parte do dente.", "Sustenta o esmalte e transmite estímulos em direção à polpa.", "openstax-oral", toothSection, "meso", 50, 39, "Dentinum"),
  make("dental-pulp", "Polpa dentária", "Histologia do dente", "Tecido conjuntivo vascularizado e inervado no interior do dente.", "Nutre a dentina, participa de reparo e conduz sensibilidade.", "openstax-oral", toothSection, "meso", 50, 52, "Pulpa dentis"),

  make("filiform-papillae", "Papilas filiformes", "Língua", "Papilas finas e queratinizadas, numerosas no dorso da língua.", "Aumentam atrito mecânico; em humanos, geralmente não contêm botões gustativos.", "openstax-oral", tongueTaste, "meso", 43, 45, "Papillae filiformes"),
  make("fungiform-papillae", "Papilas fungiformes", "Língua", "Papilas em forma de cogumelo dispersas entre as filiformes.", "Podem conter botões gustativos em sua superfície superior.", "openstax-oral", tongueTaste, "meso", 57, 48, "Papillae fungiformes"),
  make("circumvallate-papillae", "Papilas circunvaladas", "Língua", "Grandes papilas alinhadas em V próximo ao sulco terminal.", "Contêm numerosos botões gustativos nas paredes laterais.", "openstax-oral", tongueTaste, "meso", 50, 30, "Papillae vallatae"),
  make("foliate-papillae", "Papilas foliadas", "Língua", "Pregas paralelas nas margens posterolaterais da língua.", "Abrigam botões gustativos, mais evidentes funcionalmente na infância.", "openstax-oral", tongueTaste, "meso", 72, 46, "Papillae foliatae"),
  make("intrinsic-tongue-muscles", "Músculos intrínsecos da língua", "Língua", "Feixes musculares totalmente contidos na língua.", "Alteram a forma da língua durante fala, mastigação e deglutição.", "openstax-oral", tongueAnatomy, "meso", 49, 52, "Musculi linguae intrinseci"),
  make("extrinsic-tongue-muscles", "Músculos extrínsecos da língua", "Língua", "Músculos que se originam fora da língua e nela se inserem.", "Movem a língua como um todo, protrudindo, retraindo, elevando ou deprimindo.", "openstax-oral", tongueAnatomy, "meso", 42, 66, "Musculi linguae extrinseci"),

  make("parotid-gland", "Glândula parótida", "Glândulas salivares", "Maior glândula salivar, situada anterior e inferiormente à orelha.", "Produz secreção predominantemente serosa e rica em enzimas.", "openstax-oral", salivaryGlands, "meso", 70, 39, "Glandula parotidea"),
  make("submandibular-gland", "Glândula submandibular", "Glândulas salivares", "Glândula situada inferiormente ao corpo da mandíbula.", "Produz secreção mista e responde por grande parcela da saliva em repouso.", "openstax-oral", salivaryGlands, "meso", 54, 66, "Glandula submandibularis"),
  make("sublingual-gland", "Glândula sublingual", "Glândulas salivares", "Glândula no assoalho da boca, abaixo da língua.", "Produz secreção predominantemente mucosa por múltiplos ductos.", "openstax-oral", salivaryGlands, "meso", 49, 58, "Glandula sublingualis"),
];

const idsFor = (image: string) => sensoryStructures.filter((structure) => structure.image === image).map((structure) => structure.id);

export const sensoryViews: SensoryView[] = [
  { id: "eye-external", journeyId: "eye", stage: "macro", title: "Olho por fora", eyebrow: "OLHO NU", description: "Superfície ocular, proteção e aparelho lacrimal.", image: eyeExternal, alt: "Ilustração anatômica externa do olho e aparelho lacrimal.", assetKind: "anatomical", sourceId: "openstax-eye", structureIds: idsFor(eyeExternal) },
  { id: "eye-anatomy", journeyId: "eye", stage: "meso", title: "Globo ocular em corte", eyebrow: "ANATOMIA", description: "Túnicas, meios ópticos, câmaras e via visual.", image: eyeAnatomy, alt: "Corte anatômico lateral do globo ocular.", assetKind: "schematic", sourceId: "openstax-eye", structureIds: idsFor(eyeAnatomy) },
  { id: "eye-muscles", journeyId: "eye", stage: "meso", title: "Músculos extraoculares", eyebrow: "MOVIMENTO", description: "Os seis músculos que orientam o globo ocular.", image: eyeMuscles, alt: "Ilustração anatômica dos músculos extraoculares.", assetKind: "anatomical", sourceId: "openstax-eye-muscles", structureIds: idsFor(eyeMuscles) },
  { id: "oral-external", journeyId: "oral", stage: "macro", title: "Cavidade oral", eyebrow: "OLHO NU", description: "Limites, lábios, bochechas e entrada da boca.", image: oralCavity, alt: "Vista anterior aberta da cavidade oral.", assetKind: "schematic", sourceId: "openstax-oral", structureIds: idsFor(oralCavity).filter((id) => ["lips", "cheeks"].includes(id)) },
  { id: "oral-cavity", journeyId: "oral", stage: "meso", title: "Palato e orofaringe", eyebrow: "ANATOMIA", description: "Palatos, úvula e limites da cavidade oral.", image: oralCavity, alt: "Diagrama anatômico da cavidade oral aberta.", assetKind: "schematic", sourceId: "openstax-oral", structureIds: idsFor(oralCavity).filter((id) => !["lips", "cheeks"].includes(id)) },
  { id: "teeth-types", journeyId: "oral", stage: "meso", title: "Tipos de dentes", eyebrow: "DENTIÇÃO", description: "Incisivos, caninos, pré-molares e molares.", image: teethTypes, alt: "Diagrama dos tipos de dentes humanos.", assetKind: "schematic", sourceId: "openstax-oral", structureIds: idsFor(teethTypes) },
  { id: "tooth-section", journeyId: "oral", stage: "meso", title: "Dente em corte", eyebrow: "ESTRUTURA", description: "Esmalte, dentina e polpa dentária.", image: toothSection, alt: "Esquema em corte de um dente.", assetKind: "schematic", sourceId: "openstax-oral", structureIds: idsFor(toothSection) },
  { id: "tongue-papillae", journeyId: "oral", stage: "meso", title: "Papilas da língua", eyebrow: "PALADAR", description: "Distribuição e diferenças funcionais das papilas linguais.", image: tongueTaste, alt: "Diagrama de papilas e botões gustativos da língua.", assetKind: "schematic", sourceId: "openstax-oral", structureIds: idsFor(tongueTaste) },
  { id: "tongue-muscles", journeyId: "oral", stage: "meso", title: "Músculos da língua", eyebrow: "MOVIMENTO", description: "Músculos intrínsecos e extrínsecos.", image: tongueAnatomy, alt: "Diagrama anatômico dos músculos da língua.", assetKind: "schematic", sourceId: "openstax-oral", structureIds: idsFor(tongueAnatomy) },
  { id: "salivary-glands", journeyId: "oral", stage: "meso", title: "Glândulas salivares", eyebrow: "SECREÇÃO", description: "Parótida, submandibular e sublingual.", image: salivaryGlands, alt: "Diagrama das principais glândulas salivares.", assetKind: "schematic", sourceId: "openstax-oral", structureIds: idsFor(salivaryGlands) },
];

export function sensoryStructureById(id: string) {
  return sensoryStructures.find((structure) => structure.id === id);
}
