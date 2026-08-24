export type MedicineLevel = "Iniciante" | "Ciclo básico" | "Ciclo clínico" | "Internato" | "Residência";
export type BodyLayer = "surface" | "muscular" | "skeletal" | "vascular" | "nervous" | "organs";

export interface MedicalSource {
  title: string;
  organization: string;
  url: string;
  reviewedAt: string;
  license?: string;
  attribution?: string;
}

export interface AnatomyStructure {
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
  x: number;
  y: number;
}

export interface MedicalSystem {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  image: string;
  structures: string[];
  topics: string[];
}

export interface MedicalQuestion {
  id: string;
  level: MedicineLevel;
  system: string;
  type: "Múltipla escolha" | "Verdadeiro ou falso" | "Caso clínico" | "Resposta curta";
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  sourceId: string;
}

export const medicalSources: Record<string, MedicalSource> = {
  openstax: {
    title: "Anatomy and Physiology 2e",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSkin: {
    title: "Functions of the Integumentary System",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-3-functions-of-the-integumentary-system",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSkeleton: {
    title: "Functions of the Skeletal System",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/6-1-the-functions-of-the-skeletal-system",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxMuscle: {
    title: "Skeletal Muscle",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/10-2-skeletal-muscle",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxCns: {
    title: "The Central Nervous System",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/13-2-the-central-nervous-system",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxPns: {
    title: "The Peripheral Nervous System",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology/pages/13-4-the-peripheral-nervous-system",
    reviewedAt: "2026-08-24",
    license: "CC BY 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxHeart: {
    title: "Heart Anatomy",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxCardiacCycle: {
    title: "Cardiac Cycle",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxMuscleContraction: {
    title: "Muscle Fiber Contraction and Relaxation",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxCirculation: {
    title: "Circulatory Pathways",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxRespiratory: {
    title: "Gas Exchange",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/22-4-gas-exchange",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxDigestive: {
    title: "Digestive System Processes and Regulation",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/23-2-digestive-system-processes-and-regulation",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxKidney: {
    title: "Microscopic Anatomy of the Kidney",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxEndocrine: {
    title: "Endocrine System — Chapter Review",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/17-chapter-review",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxImmune: {
    title: "Anatomy of the Lymphatic and Immune Systems",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/21-1-anatomy-of-the-lymphatic-and-immune-systems",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxFetal: {
    title: "Fetal Development — Anatomy and Physiology 2e",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/28-3-fetal-development",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  ncbiFertilization: {
    title: "Embryology, Fertilization",
    organization: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK542186/",
    reviewedAt: "2026-08-24",
  },
  ncbiGastrulation: {
    title: "Embryology, Gastrulation",
    organization: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK554394/",
    reviewedAt: "2026-08-24",
  },
  ncbiEmbryology: {
    title: "Embryology, Weeks 6–8",
    organization: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK563181/",
    reviewedAt: "2026-08-24",
  },
  openAnatomy: {
    title: "Open Anatomy Project",
    organization: "Brigham and Women's Hospital / NIH-supported research",
    url: "https://www.openanatomy.org/atlas-pages/",
    reviewedAt: "2026-08-24",
    attribution: "Licença e atribuição variam por atlas; consulte a página de cada conjunto antes de reutilizar imagens.",
  },
  whoSafety: {
    title: "Patient Safety Curriculum Guide",
    organization: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789241501958",
    reviewedAt: "2026-08-24",
  },
};

export const bodyLayers: Array<{ id: BodyLayer; label: string; description: string; color: string }> = [
  { id: "surface", label: "Superfície", description: "Referências externas e regiões", color: "#d9b89c" },
  { id: "muscular", label: "Músculos", description: "Movimento e estabilidade", color: "#b86158" },
  { id: "skeletal", label: "Esqueleto", description: "Suporte e proteção", color: "#d7cfb6" },
  { id: "vascular", label: "Vasos", description: "Circulação arterial e venosa", color: "#5d83a8" },
  { id: "nervous", label: "Nervos", description: "Integração e condução", color: "#d7a947" },
  { id: "organs", label: "Órgãos", description: "Estruturas viscerais", color: "#8b6b83" },
];

export const anatomyStructures: AnatomyStructure[] = [
  { id: "skin", name: "Pele", latin: "Cutis", layer: "surface", system: "Tegumentar", region: "Corpo inteiro", summary: "Órgão de revestimento que constitui a interface entre o organismo e o ambiente.", function: "Barreira física, termorregulação, sensibilidade e participação na síntese de vitamina D.", relations: "Recobre o tecido subcutâneo e continua-se com mucosas nas aberturas naturais.", nearby: ["Tecido subcutâneo", "Fáscia superficial"], synonyms: ["pele", "cutis", "tegumento"], sourceId: "openstaxSkin", x: 50, y: 37 },
  { id: "deltoid", name: "Músculo deltoide", latin: "Musculus deltoideus", layer: "muscular", system: "Musculoesquelético", region: "Ombro", summary: "Músculo triangular que recobre a articulação glenoumeral.", function: "Participa da abdução do braço; suas porções também contribuem para flexão, extensão e rotação.", relations: "Situa-se superficialmente ao úmero proximal e à articulação do ombro.", nearby: ["Acrômio", "Úmero", "Manguito rotador"], synonyms: ["deltoide", "músculo deltoide"], sourceId: "openstaxMuscle", x: 34, y: 25 },
  { id: "femur", name: "Fêmur", latin: "Femur", layer: "skeletal", system: "Musculoesquelético", region: "Coxa", summary: "Osso longo da coxa, articulado proximalmente com o acetábulo e distalmente com tíbia e patela.", function: "Transmite cargas e oferece alavancas para músculos do quadril e do joelho.", relations: "A cabeça ocupa o acetábulo; os côndilos participam da articulação do joelho.", nearby: ["Acetábulo", "Patela", "Tíbia"], synonyms: ["fêmur", "osso da coxa"], sourceId: "openstaxSkeleton", x: 43, y: 67 },
  { id: "aorta", name: "Aorta", latin: "Aorta", layer: "vascular", system: "Cardiovascular", region: "Tórax e abdome", summary: "Maior artéria da circulação sistêmica, originada no ventrículo esquerdo.", function: "Distribui sangue da circulação sistêmica por meio de seus ramos.", relations: "O arco relaciona-se com os grandes vasos; a aorta descendente segue no mediastino posterior e atravessa o diafragma.", nearby: ["Ventrículo esquerdo", "Tronco pulmonar", "Veia cava superior"], synonyms: ["aorta", "artéria aorta"], sourceId: "openstaxCirculation", x: 53, y: 35 },
  { id: "sciatic", name: "Nervo isquiático", latin: "Nervus ischiadicus", layer: "nervous", system: "Nervoso", region: "Pelve e membro inferior", summary: "Grande nervo do plexo sacral que percorre a região glútea e a face posterior da coxa.", function: "Reúne fibras destinadas a funções motoras e sensitivas de grande parte do membro inferior.", relations: "Forma-se a partir do plexo sacral e contém componentes tibial e fibular comum.", nearby: ["Plexo sacral", "Nervo tibial", "Nervo fibular comum"], synonyms: ["nervo isquiático", "ciático", "nervo ciático"], sourceId: "openstaxPns", x: 58, y: 66 },
  { id: "brain", name: "Encéfalo", latin: "Encephalon", layer: "organs", system: "Nervoso", region: "Cavidade craniana", summary: "Conjunto de estruturas do sistema nervoso central contidas no crânio.", function: "Integra informação sensorial, planejamento motor, cognição, memória e regulação autonômica.", relations: "Continua-se inferiormente com a medula espinal e é envolvido pelas meninges.", nearby: ["Meninges", "Medula espinal", "Nervos cranianos"], synonyms: ["encéfalo", "encephalon"], sourceId: "openstaxCns", x: 50, y: 6 },
  { id: "heart", name: "Coração", latin: "Cor", layer: "organs", system: "Cardiovascular", region: "Mediastino", summary: "Órgão muscular oco com quatro câmaras que impulsiona sangue pelas circulações pulmonar e sistêmica.", function: "Gera fluxo sanguíneo por contrações coordenadas de átrios e ventrículos.", relations: "Situa-se no pericárdio, posterior ao esterno, entre os pulmões e sobre o diafragma.", nearby: ["Pulmões", "Aorta", "Tronco pulmonar", "Diafragma"], synonyms: ["coração", "cor"], sourceId: "openstaxHeart", x: 52, y: 27 },
  { id: "lungs", name: "Pulmões", latin: "Pulmones", layer: "organs", system: "Respiratório", region: "Cavidades pleurais", summary: "Órgãos pares da respiração localizados no tórax.", function: "Realizam trocas gasosas entre o ar alveolar e o sangue capilar.", relations: "Ladeiam o mediastino, são revestidos por pleura visceral e apoiam-se no diafragma.", nearby: ["Pleura", "Brônquios principais", "Diafragma", "Coração"], synonyms: ["pulmões", "pulmão"], sourceId: "openstaxRespiratory", x: 57, y: 22 },
  { id: "liver", name: "Fígado", latin: "Hepar", layer: "organs", system: "Digestório", region: "Quadrante superior direito do abdome", summary: "Grande órgão glandular predominantemente situado sob o hemidiafragma direito.", function: "Participa do metabolismo, síntese de proteínas plasmáticas, produção de bile e processamento de substâncias absorvidas.", relations: "Relaciona-se superiormente com o diafragma e inferiormente com vísceras abdominais.", nearby: ["Vesícula biliar", "Veia porta", "Diafragma"], synonyms: ["fígado", "hepar"], sourceId: "openstaxDigestive", x: 43, y: 34 },
  { id: "kidneys", name: "Rins", latin: "Renes", layer: "organs", system: "Urinário", region: "Retroperitônio", summary: "Órgãos pares situados na parede posterior do abdome.", function: "Filtram o plasma, regulam água e eletrólitos e participam do equilíbrio ácido-base e de funções endócrinas.", relations: "São retroperitoneais; o rim direito costuma situar-se ligeiramente mais inferior que o esquerdo.", nearby: ["Glândulas suprarrenais", "Ureteres", "Aorta abdominal"], synonyms: ["rins", "rim", "renes"], sourceId: "openstaxKidney", x: 56, y: 37 },
];

export const medicalSystems: MedicalSystem[] = [
  { id: "cardiovascular", name: "Cardiovascular", description: "Bomba cardíaca, vasos e transporte sistêmico.", color: "#b35f68", icon: "heart", image: "/medicine/systems/cardiovascular-v1.png", structures: ["Coração", "Aorta", "Artérias", "Veias", "Capilares"], topics: ["Ciclo cardíaco", "Hemodinâmica", "Circulações pulmonar e sistêmica"] },
  { id: "respiratory", name: "Respiratório", description: "Ventilação, difusão e transporte de gases.", color: "#7398a8", icon: "lungs", image: "/medicine/systems/respiratory-v1.png", structures: ["Pulmões", "Traqueia", "Brônquios", "Alvéolos", "Diafragma"], topics: ["Mecânica ventilatória", "Trocas gasosas", "Controle da respiração"] },
  { id: "nervous", name: "Nervoso", description: "Integração sensorial, motora e autonômica.", color: "#b48a46", icon: "brain", image: "/medicine/systems/nervous-v1.png", structures: ["Encéfalo", "Medula espinal", "Nervos periféricos"], topics: ["Potencial de ação", "Sinapses", "Vias motoras e sensitivas"] },
  { id: "digestive", name: "Digestório", description: "Digestão, absorção e metabolismo de nutrientes.", color: "#8d7861", icon: "activity", image: "/medicine/systems/digestive-v1.png", structures: ["Esôfago", "Estômago", "Intestinos", "Fígado", "Pâncreas"], topics: ["Motilidade", "Secreções", "Absorção"] },
  { id: "musculoskeletal", name: "Musculoesquelético", description: "Sustentação, movimento e proteção.", color: "#9d685f", icon: "bone", image: "/medicine/systems/musculoskeletal-v1.png", structures: ["Ossos", "Articulações", "Músculos", "Tendões"], topics: ["Tecido ósseo", "Contração muscular", "Biomecânica"] },
  { id: "endocrine", name: "Endócrino", description: "Sinalização hormonal e homeostase.", color: "#8d7397", icon: "sparkles", image: "/medicine/systems/endocrine-v1.png", structures: ["Hipófise", "Tireoide", "Suprarrenais", "Pâncreas endócrino"], topics: ["Eixos hormonais", "Feedback", "Metabolismo"] },
  { id: "urinary", name: "Urinário", description: "Filtração, equilíbrio interno e excreção.", color: "#6085a0", icon: "droplets", image: "/medicine/systems/urinary-v1.png", structures: ["Rins", "Ureteres", "Bexiga", "Uretra"], topics: ["Filtração glomerular", "Transporte tubular", "Equilíbrio ácido-base"] },
  { id: "immune", name: "Linfático e imune", description: "Defesa, vigilância e retorno de fluidos.", color: "#668a75", icon: "shield", image: "/medicine/systems/immune-v1.png", structures: ["Linfonodos", "Baço", "Timo", "Vasos linfáticos"], topics: ["Imunidade inata", "Imunidade adaptativa", "Drenagem linfática"] },
];

export const embryologyTimeline = [
  { period: "Semana 1", title: "Fecundação e clivagem", detail: "Formação do zigoto, divisões celulares, mórula e blastocisto; início da implantação.", sourceId: "ncbiFertilization", image: "/medicine/development/week-1-v1.png", imageAlt: "Sequência ilustrativa da fecundação ao blastocisto" },
  { period: "Semanas 2–3", title: "Implantação e gastrulação", detail: "Organização do disco embrionário e estabelecimento de ectoderma, mesoderma e endoderma.", sourceId: "ncbiGastrulation", image: "/medicine/development/weeks-2-3-v1.png", imageAlt: "Modelo didático de implantação e disco embrionário trilaminar" },
  { period: "Semanas 3–8", title: "Período embrionário", detail: "Organogênese e formação inicial dos principais sistemas; período de alta sensibilidade do desenvolvimento.", sourceId: "ncbiFertilization", image: "/medicine/development/weeks-3-8-v2.png", imageAlt: "Modelo didático de embrião ao final do período embrionário" },
  { period: "Semana 9 ao nascimento", title: "Período fetal", detail: "Predominam crescimento, diferenciação e maturação funcional dos sistemas.", sourceId: "openstaxFetal", image: "/medicine/development/fetal-period-v1.png", imageAlt: "Modelo didático do período fetal em envoltório protetor" },
  { period: "Nascimento", title: "Transição neonatal", detail: "O início da respiração e as mudanças circulatórias marcam a adaptação à vida extrauterina.", sourceId: "openstaxFetal", image: "/medicine/development/neonatal-transition-v1.png", imageAlt: "Manequim neonatal didático com destaque para pulmões e coração" },
];

export const medicalQuestions: MedicalQuestion[] = [
  { id: "mq1", level: "Iniciante", system: "Cardiovascular", type: "Múltipla escolha", prompt: "Qual câmara cardíaca ejeta sangue para a circulação sistêmica?", options: ["Átrio direito", "Ventrículo direito", "Átrio esquerdo", "Ventrículo esquerdo"], answer: 3, explanation: "O ventrículo esquerdo ejeta sangue para a aorta, iniciando a circulação sistêmica.", sourceId: "openstaxHeart" },
  { id: "mq2", level: "Ciclo básico", system: "Respiratório", type: "Múltipla escolha", prompt: "Em qual estrutura ocorre a troca gasosa entre ar e sangue?", options: ["Traqueia", "Brônquios principais", "Membrana respiratória nos alvéolos", "Pleura parietal"], answer: 2, explanation: "Na membrana respiratória, as paredes alveolar e capilar formam a interface onde oxigênio e dióxido de carbono se difundem.", sourceId: "openstaxRespiratory" },
  { id: "mq3", level: "Ciclo básico", system: "Nervoso", type: "Verdadeiro ou falso", prompt: "Encéfalo e medula espinal constituem o sistema nervoso central.", options: ["Verdadeiro", "Falso"], answer: 0, explanation: "O sistema nervoso central é formado pelo encéfalo e pela medula espinal.", sourceId: "openstaxCns" },
  { id: "mq4", level: "Ciclo clínico", system: "Urinário", type: "Caso clínico", prompt: "Uma alteração reduz a filtração glomerular. Qual etapa é afetada diretamente?", options: ["Formação do filtrado no corpúsculo renal", "Armazenamento na bexiga", "Condução pelo ureter", "Eliminação pela uretra"], answer: 0, explanation: "O glomérulo filtra plasma e a cápsula glomerular recebe o filtrado, formando o início do trajeto tubular.", sourceId: "openstaxKidney" },
  { id: "mq5", level: "Iniciante", system: "Embriologia", type: "Múltipla escolha", prompt: "Em qual período ocorre a formação inicial da maioria dos sistemas orgânicos?", options: ["Primeiras 24 horas", "Semanas 3–8", "Somente após a semana 20", "Apenas depois do nascimento"], answer: 1, explanation: "A organogênese ocorre principalmente no período embrionário, entre as semanas 3 e 8.", sourceId: "ncbiFertilization" },
  { id: "mq6", level: "Iniciante", system: "Tegumentar", type: "Múltipla escolha", prompt: "Qual alternativa reúne funções reconhecidas da pele?", options: ["Somente movimento", "Proteção, sensibilidade e termorregulação", "Apenas digestão", "Produção de células sanguíneas"], answer: 1, explanation: "A pele atua como barreira, órgão sensorial e componente da regulação térmica, entre outras funções.", sourceId: "openstaxSkin" },
  { id: "mq7", level: "Ciclo básico", system: "Musculoesquelético", type: "Múltipla escolha", prompt: "Qual íon liberado pelo retículo sarcoplasmático inicia a sequência contrátil da fibra muscular esquelética?", options: ["Ferro", "Cálcio", "Iodo", "Cloreto"], answer: 1, explanation: "O cálcio liberado pelo retículo sarcoplasmático permite a interação regulada entre os filamentos contráteis.", sourceId: "openstaxMuscleContraction" },
  { id: "mq8", level: "Iniciante", system: "Musculoesquelético", type: "Múltipla escolha", prompt: "No movimento do esqueleto, os ossos atuam mecanicamente como:", options: ["Glândulas", "Alavancas", "Sinapses", "Capilares"], answer: 1, explanation: "Ossos funcionam como alavancas, articulações como fulcros e músculos fornecem a força de movimento.", sourceId: "openstaxSkeleton" },
  { id: "mq9", level: "Ciclo básico", system: "Cardiovascular", type: "Múltipla escolha", prompt: "Qual vaso recebe diretamente o sangue ejetado pelo ventrículo esquerdo?", options: ["Veia cava superior", "Tronco pulmonar", "Aorta", "Veia pulmonar"], answer: 2, explanation: "O ventrículo esquerdo ejeta sangue na aorta para a circulação sistêmica.", sourceId: "openstaxHeart" },
  { id: "mq10", level: "Ciclo básico", system: "Endócrino", type: "Múltipla escolha", prompt: "Qual mecanismo regula primariamente a liberação de muitos hormônios?", options: ["Feedback negativo", "Difusão pulmonar", "Filtração glomerular", "Contração voluntária"], answer: 0, explanation: "A regulação da liberação hormonal ocorre principalmente por circuitos de feedback negativo.", sourceId: "openstaxEndocrine" },
  { id: "mq11", level: "Ciclo básico", system: "Imune", type: "Múltipla escolha", prompt: "Qual célula diferenciada secreta anticorpos?", options: ["Plasmócito", "Hemácia", "Plaqueta", "Fibroblasto"], answer: 0, explanation: "Plasmócitos são linfócitos B diferenciados especializados na secreção de anticorpos.", sourceId: "openstaxImmune" },
  { id: "mq12", level: "Ciclo básico", system: "Digestório", type: "Múltipla escolha", prompt: "Em qual segmento ocorre a maior parte da absorção de nutrientes?", options: ["Esôfago", "Intestino delgado", "Reto", "Cavidade oral"], answer: 1, explanation: "O intestino delgado realiza a maior parte da digestão química e da absorção de nutrientes.", sourceId: "openstaxDigestive" },
  { id: "mq13", level: "Ciclo clínico", system: "Cardiovascular", type: "Múltipla escolha", prompt: "Durante a sístole ventricular, o aumento da pressão ventricular promove ejeção para quais vasos?", options: ["Veias cavas e pulmonares", "Aorta e tronco pulmonar", "Artérias coronárias apenas", "Seio coronário e aorta"], answer: 1, explanation: "A contração ventricular eleva a pressão e ejeta sangue para o tronco pulmonar e a aorta.", sourceId: "openstaxCardiacCycle" },
  { id: "mq14", level: "Ciclo clínico", system: "Respiratório", type: "Múltipla escolha", prompt: "Na respiração externa, qual é o sentido do fluxo de oxigênio?", options: ["Do sangue para o alvéolo", "Do alvéolo para o capilar pulmonar", "Da pleura para o brônquio", "Da traqueia para a artéria pulmonar sem difusão"], answer: 1, explanation: "O oxigênio segue seu gradiente de pressão parcial do ar alveolar para o sangue capilar pulmonar.", sourceId: "openstaxRespiratory" },
  { id: "mq15", level: "Ciclo clínico", system: "Urinário", type: "Múltipla escolha", prompt: "Quais estruturas formam o corpúsculo renal?", options: ["Glomérulo e cápsula glomerular", "Alça de Henle e ureter", "Bexiga e uretra", "Ducto coletor e pelve renal"], answer: 0, explanation: "O corpúsculo renal reúne o tufo capilar glomerular e a cápsula glomerular que o envolve.", sourceId: "openstaxKidney" },
  { id: "mq16", level: "Internato", system: "Endócrino", type: "Caso clínico", prompt: "Em um circuito de feedback negativo, o aumento do produto final tende a produzir qual resposta?", options: ["Estimular indefinidamente sua própria liberação", "Reduzir o estímulo às etapas anteriores", "Bloquear toda sinalização neural", "Converter hormônio em anticorpo"], answer: 1, explanation: "No feedback negativo, a elevação do resultado regulado reduz estímulos prévios e ajuda a manter a homeostase.", sourceId: "openstaxEndocrine" },
  { id: "mq17", level: "Internato", system: "Respiratório", type: "Caso clínico", prompt: "Se a ventilação de um alvéolo diminui, mas a perfusão se mantém, qual relação fica comprometida?", options: ["Ventilação/perfusão", "Osso/músculo", "Filtração/secreção renal", "Aferência/eferência neural"], answer: 0, explanation: "A troca eficiente depende da compatibilidade entre ventilação alveolar e perfusão capilar.", sourceId: "openstaxRespiratory" },
  { id: "mq18", level: "Internato", system: "Linfático", type: "Múltipla escolha", prompt: "Uma função central dos vasos linfáticos é:", options: ["Ejetar sangue do ventrículo", "Retornar excesso de fluido intersticial à circulação", "Produzir bile", "Ventilar alvéolos"], answer: 1, explanation: "O sistema linfático drena fluido intersticial excedente e o devolve à corrente sanguínea.", sourceId: "openstaxImmune" },
  { id: "mq19", level: "Residência", system: "Urinário", type: "Caso clínico", prompt: "Qual conjunto representa componentes da barreira de filtração glomerular?", options: ["Endotélio fenestrado, membrana basal e fendas entre pedicelos", "Urotélio, músculo detrusor e uretra", "Pleura, alvéolo e endotélio pulmonar", "Periósteo, cartilagem e tendão"], answer: 0, explanation: "A barreira inclui endotélio capilar fenestrado, membrana basal compartilhada e fendas de filtração entre prolongamentos dos podócitos.", sourceId: "openstaxKidney" },
  { id: "mq20", level: "Residência", system: "Musculoesquelético", type: "Múltipla escolha", prompt: "No ciclo de pontes cruzadas, a ligação de uma nova molécula de ATP à miosina favorece:", options: ["Desprendimento da miosina da actina", "Abertura da valva aórtica", "Filtração no glomérulo", "Síntese de anticorpos"], answer: 0, explanation: "A ligação de ATP permite que a cabeça de miosina se desprenda da actina antes de um novo ciclo.", sourceId: "openstaxMuscleContraction" },
];

export const medicalNotebookTemplates = [
  { id: "anamnesis", name: "Anamnese educacional", description: "Estrutura para treinar coleta de história, sem dados reais.", body: "Identificação fictícia\nQueixa principal\nHistória da condição\nAntecedentes\nMedicamentos simulados\nRevisão por sistemas\nSíntese educacional" },
  { id: "disease", name: "Resumo de condição", description: "Organize mecanismo, manifestações e raciocínio.", body: "Definição\nFisiopatologia\nAnatomia aplicada\nManifestações principais\nPrincípios de investigação\nPontos de revisão\nFontes" },
  { id: "pharma", name: "Farmacologia", description: "Estudo de classes e mecanismos, sem prescrição.", body: "Classe\nMecanismo de ação\nAlvos\nEfeitos farmacológicos\nFarmacocinética\nReações adversas estudadas\nContraindicações estudadas\nFonte" },
  { id: "clinical", name: "Caso clínico fictício", description: "Treine hipóteses e justificativas em cenário educacional.", body: "Queixa\nHistória progressiva\nAchados do exame\nDados complementares\nRepresentação do problema\nHipóteses justificadas\nLacunas de conhecimento\nReflexão de segurança" },
];
