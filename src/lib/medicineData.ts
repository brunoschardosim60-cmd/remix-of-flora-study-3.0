import { medicineAtlasCatalog } from "./medicineAtlasCatalog";
import { additionalMedicalClinicalCases } from "./additionalMedicalClinicalCases";
import { histologySources } from "./histologyData";

export type MedicineLevel = "Iniciante" | "Ciclo básico" | "Ciclo clínico" | "Internato" | "Residência";
export type BodyLayer = "surface" | "muscular" | "skeletal" | "vascular" | "nervous" | "organs";
export type AtlasBodyProfile = "female" | "male";
export type AtlasView = "anterior" | "posterior";

export interface AtlasPosition {
  x: number;
  y: number;
}

export interface MedicalSource {
  title: string;
  organization: string;
  url: string;
  reviewedAt: string;
  license?: string;
  attribution?: string;
}

export interface AtlasCoverageReference {
  humanReference: string;
  catalogNote: string;
  sourceIds: string[];
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
  positions?: Partial<Record<AtlasView, AtlasPosition>>;
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
  atlasStructureIds: string[];
  questionSystems: string[];
  sourceId: string;
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

export interface MedicineLevelProfile {
  title: string;
  focus: string;
  homeDescription: string;
  atlasDescription: string;
  practiceDescription: string;
  questionDescription: string;
  clinicalInstruction: string;
  cycle: string[];
}

export interface DevelopmentStage {
  id: string;
  phase: "Pré-natal" | "Pós-natal";
  period: string;
  title: string;
  detail: string;
  milestones: string[];
  systems: string[];
  studyQuestions: string[];
  sourceId: string;
  image: string;
  imageAlt: string;
}

export interface MedicalClinicalStep {
  id: string;
  label: string;
  title: string;
  release: string[];
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  reflectionPrompt: string;
  placeholder: string;
  sourceId: string;
  data?: Array<{
    label: string;
    value: string;
    tone?: "normal" | "attention" | "critical";
  }>;
  hint?: string;
}

export interface MedicalClinicalCase {
  id: string;
  area: string;
  setting: string;
  difficulty: MedicineLevel;
  durationMinutes: number;
  title: string;
  subtitle: string;
  patient: string;
  focus: string;
  sensitive: boolean;
  sensitivityNote?: string;
  visual?: {
    image: string;
    alt: string;
    caption: string;
  };
  triage: Array<{
    label: string;
    value: string;
    tone?: "normal" | "attention" | "critical";
  }>;
  steps: MedicalClinicalStep[];
  completion: {
    title: string;
    summary: string;
    takeaways: string[];
  };
}

export const medicalSources: Record<string, MedicalSource> = {
  ...histologySources,
  openstax: {
    title: "Anatomia e Fisiologia 2e",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxTerminology: {
    title: "Terminologia anatômica e regiões do corpo",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSkeletonCount: {
    title: "Divisões do sistema esquelético",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/7-1-divisions-of-the-skeletal-system",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  nihMuscleCount: {
    title: "Mais de 600 músculos no corpo humano",
    organization: "National Center for Advancing Translational Sciences, NIH",
    url: "https://ncats.nih.gov/research/research-activities/tissue-chip/meet-chip",
    reviewedAt: "2026-08-26",
  },
  openstaxNerveCount: {
    title: "Organização dos nervos periféricos",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/introduction-behavioral-neuroscience/pages/1-5-the-peripheral-nervous-system-pns",
    reviewedAt: "2026-08-26",
    license: "CC BY 4.0",
    attribution: "Access for free at openstax.org.",
  },
  ncbiBodyOrganization: {
    title: "Organização do corpo humano em sistemas",
    organization: "National Library of Medicine, NCBI Bookshelf",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK607445/",
    reviewedAt: "2026-08-26",
  },
  pubmedOrganDefinition: {
    title: "Limites da definição anatômica de órgão",
    organization: "PubMed, National Library of Medicine",
    url: "https://pubmed.ncbi.nlm.nih.gov/28192867/",
    reviewedAt: "2026-08-26",
  },
  humanReferenceAtlas: {
    title: "Atlas de referência do corpo humano",
    organization: "National Library of Medicine, PubMed Central",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13153392/",
    reviewedAt: "2026-08-26",
  },
  openstaxSkin: {
    title: "Funções do sistema tegumentar",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-3-functions-of-the-integumentary-system",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSkinLayers: {
    title: "Camadas da pele",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-1-layers-of-the-skin",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSkinAccessories: {
    title: "Estruturas acessórias da pele",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-2-accessory-structures-of-the-skin",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSurfaceAnatomy: {
    title: "Regiões do corpo humano",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSkeleton: {
    title: "Funções do sistema esquelético",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/6-1-the-functions-of-the-skeletal-system",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSkull: {
    title: "O crânio e o osso hioide",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxMuscle: {
    title: "Músculo esquelético",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/10-2-skeletal-muscle",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxAxialMuscles: {
    title: "Músculos axiais da cabeça, pescoço, dorso, abdome e tórax",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxAppendicularMuscles: {
    title: "Músculos dos membros superiores e inferiores",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxCns: {
    title: "Sistema nervoso central",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/13-2-the-central-nervous-system",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxPns: {
    title: "Sistema nervoso periférico",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/13-4-the-peripheral-nervous-system",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxCranialNerves: {
    title: "Os doze pares de nervos cranianos",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/16-3-the-cranial-nerve-exam",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxHeart: {
    title: "Anatomia do coração",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxCardiacCycle: {
    title: "Ciclo cardíaco",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxMuscleContraction: {
    title: "Contração e relaxamento da fibra muscular",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxCirculation: {
    title: "Vias circulatórias",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxRespiratory: {
    title: "Trocas gasosas",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/22-4-gas-exchange",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxRespiratoryAnatomy: {
    title: "Órgãos e estruturas do sistema respiratório",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system",
    reviewedAt: "2026-08-26",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxDigestive: {
    title: "Processos e regulação do sistema digestório",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/23-2-digestive-system-processes-and-regulation",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  ncbiSalivaryGlands: {
    title: "Anatomia das glândulas salivares",
    organization: "National Center for Biotechnology Information",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK538325/",
    reviewedAt: "2026-08-26",
  },
  openstaxKidney: {
    title: "Anatomia microscópica do rim",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxEndocrine: {
    title: "Sistema endócrino — revisão do capítulo",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/17-chapter-review",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxImmune: {
    title: "Anatomia dos sistemas linfático e imune",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/21-1-anatomy-of-the-lymphatic-and-immune-systems",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxSenses: {
    title: "Percepção sensorial",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/14-1-sensory-perception",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxReproductive: {
    title: "Sistema reprodutor — revisão do capítulo",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/27-chapter-review",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxFetal: {
    title: "Desenvolvimento fetal — Anatomia e Fisiologia 2e",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/28-3-fetal-development",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxEmbryonic: {
    title: "Desenvolvimento embrionário — Anatomia e Fisiologia 2e",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/28-2-embryonic-development",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxInfancy: {
    title: "Desenvolvimento físico de bebês e crianças pequenas",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/lifespan-development/pages/3-1-physical-development-in-infants-and-toddlers",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxChildhood: {
    title: "Saúde física e crescimento na primeira infância",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/lifespan-development/pages/5-1-physical-health-and-growth-in-early-childhood",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxAdolescence: {
    title: "Crescimento e desenvolvimento físico na adolescência",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/lifespan-development/pages/9-1-physical-growth-and-development-in-adolescence",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxEarlyAdult: {
    title: "Saúde física e crescimento no início da vida adulta",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/lifespan-development/pages/11-2-physical-health-and-growth-in-early-adulthood",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxMiddleAdult: {
    title: "Desenvolvimento físico na meia-idade",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/lifespan-development/pages/13-1-physical-development-in-middle-adulthood",
    reviewedAt: "2026-08-25",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxLateAdult: {
    title: "Envelhecimento físico na vida adulta tardia",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/lifespan-development/pages/15-1-physical-aging-in-late-adulthood",
    reviewedAt: "2026-08-25",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxErythrocytes: {
    title: "Eritrócitos — Anatomia e Fisiologia 2e",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-3-erythrocytes",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  nhlbiAnemiaDiagnosis: {
    title: "Anemia — diagnóstico",
    organization: "National Heart, Lung, and Blood Institute / NIH",
    url: "https://www.nhlbi.nih.gov/health/anemia/diagnosis",
    reviewedAt: "2026-08-24",
  },
  ncbiAnemia: {
    title: "Anemia",
    organization: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK499994/",
    reviewedAt: "2026-08-24",
  },
  ncbiFertilization: {
    title: "Embriologia — fecundação",
    organization: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK542186/",
    reviewedAt: "2026-08-24",
  },
  ncbiGastrulation: {
    title: "Embriologia — gastrulação",
    organization: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK554394/",
    reviewedAt: "2026-08-24",
  },
  ncbiEmbryology: {
    title: "Embriologia — semanas 6 a 8",
    organization: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK563181/",
    reviewedAt: "2026-08-24",
  },
  openAnatomy: {
    title: "Projeto Open Anatomy",
    organization: "Brigham and Women's Hospital / NIH-supported research",
    url: "https://www.openanatomy.org/atlas-pages/",
    reviewedAt: "2026-08-24",
    attribution: "Licença e atribuição variam por atlas; consulte a página de cada conjunto antes de reutilizar imagens.",
  },
  zAnatomy3D: {
    title: "Z-Anatomy / BodyParts3D — modelo musculoesquelético 3D",
    organization: "Z-Anatomy, BodyParts3D e hpfrei",
    url: "https://github.com/hpfrei/body-anatomy-3d-viewer",
    reviewedAt: "2026-08-24",
    license: "CC BY-SA 4.0",
    attribution: "Modelo derivado de Z-Anatomy/BodyParts3D, otimizado por hpfrei. Alterações de integração e materiais indicadas no arquivo de atribuição do projeto.",
  },
  zAnatomySystems3D: {
    title: "Z-Anatomy / BodyParts3D — sistemas anatômicos completos para web",
    organization: "Z-Anatomy, BodyParts3D e Dr. Murat Altun",
    url: "https://github.com/DrMuratAltun/anatomi-simulatoru",
    reviewedAt: "2026-08-24",
    license: "CC BY-SA 4.0",
    attribution: "Malhas derivadas de Z-Anatomy/BodyParts3D e convertidas em sistemas web pelo projeto Anatomi Simülatörü. Alterações de integração, catálogo em português, materiais e seleção são documentadas no arquivo de atribuição local.",
  },
  zAnatomyOrgan3D: {
    title: "Z-Anatomy / BodyParts3D — modelos isolados de órgãos",
    organization: "Z-Anatomy, BodyParts3D e FSichi anatomy-atlas",
    url: "https://github.com/FSichi/anatomy-atlas",
    reviewedAt: "2026-08-24",
    license: "CC BY-SA 4.0",
    attribution: "Malhas de órgãos derivadas de Z-Anatomy/BodyParts3D e otimizadas para web pelo projeto anatomy-atlas. Integração e alterações visuais estão descritas na atribuição local.",
  },
  bodyParts3D: {
    title: "BodyParts3D 3.0 — superfície corporal e órgãos",
    organization: "Database Center for Life Science (DBCLS)",
    url: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html",
    reviewedAt: "2026-08-24",
    license: "CC BY-SA 2.1 Japan",
    attribution: "BodyParts3D © Database Center for Life Science. Conversão web derivada do espelho de Kevin-Mattheus-Moerman e do projeto human-body-simulator.",
  },
  openstaxAssessment: {
    title: "Avaliação geral — instrumentos utilizados",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/15-1-performing-a-general-survey",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxVitalSigns: {
    title: "Sinais vitais — habilidades clínicas de enfermagem",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/15-3-vital-signs",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxInterview: {
    title: "Coleta e documentação de dados — histórico de saúde completo",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/4-2-data-collection-and-documentation",
    reviewedAt: "2026-08-25",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxPhysicalAssessment: {
    title: "Avaliação física — habilidades clínicas de enfermagem",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/27-2-physical-assessment",
    reviewedAt: "2026-08-25",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  ncbiClinicalMethods: {
    title: "Métodos clínicos: história, exame físico e exames laboratoriais",
    organization: "NCBI Bookshelf / Butterworths",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK458/",
    reviewedAt: "2026-08-25",
  },
  ncbiMedicalInterview: {
    title: "Entrevista médica",
    organization: "NCBI Bookshelf / Butterworths",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK349/",
    reviewedAt: "2026-08-25",
  },
  ncbiChestExam: {
    title: "Exame do tórax",
    organization: "NCBI Bookshelf / Butterworths",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK368/",
    reviewedAt: "2026-08-25",
  },
  ncbiDataAnalysis: {
    title: "Coleta e análise de dados: fazer e pensar",
    organization: "NCBI Bookshelf / Butterworths",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK353/",
    reviewedAt: "2026-08-25",
  },
  namDiagnosticProcess: {
    title: "Aprimorando o diagnóstico em saúde",
    organization: "National Academies of Sciences, Engineering, and Medicine",
    url: "https://nap.nationalacademies.org/catalog/21794/improving-diagnosis-in-health-care",
    reviewedAt: "2026-08-25",
  },
  anvisaHandHygiene: {
    title: "Higiene das Mãos em Serviços de Saúde",
    organization: "Ministério da Saúde / Anvisa",
    url: "https://www.gov.br/saude/pt-br/composicao/saes/seguranca-do-paciente/publicacoes/protocolos-de-seguranca-do-paciente/protocolo-higiene-das-maos.pdf/view",
    reviewedAt: "2026-08-25",
  },
  cfmMedicalRecord: {
    title: "Prontuário médico: documento legal, sigiloso e científico",
    organization: "Conselho Federal de Medicina",
    url: "https://sistemas.cfm.org.br/normas/visualizar/despachos/BR/2023/460",
    reviewedAt: "2026-08-25",
  },
  cfmEthics: {
    title: "Código de Ética Médica — Resolução CFM nº 2.217/2018",
    organization: "Conselho Federal de Medicina",
    url: "https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2018/2217",
    reviewedAt: "2026-08-25",
  },
  openstaxEarAssessment: {
    title: "Orelhas — otoscopia e testes de Weber e Rinne",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/22-3-ears",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  openstaxNeuroAssessment: {
    title: "Avaliação física — reflexo tendíneo profundo",
    organization: "OpenStax, Rice University",
    url: "https://openstax.org/books/clinical-nursing-skills/pages/26-2-physical-assessment",
    reviewedAt: "2026-08-24",
    license: "CC BY-NC-SA 4.0",
    attribution: "Access for free at openstax.org.",
  },
  whoMedicalDevices: {
    title: "Dispositivos médicos",
    organization: "World Health Organization",
    url: "https://www.who.int/health-topics/medical-devices",
    reviewedAt: "2026-08-24",
  },
  cdcInjectionSafety: {
    title: "Práticas seguras de injeção e sua saúde",
    organization: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov/injectionsafety/index.html",
    reviewedAt: "2026-08-24",
  },
  fdaAed: {
    title: "Como desfibriladores externos automáticos podem restabelecer o ritmo cardíaco",
    organization: "U.S. Food and Drug Administration",
    url: "https://www.fda.gov/consumers/consumer-updates/how-aeds-public-places-can-restart-hearts",
    reviewedAt: "2026-08-24",
  },
  whoSafety: {
    title: "Guia curricular de segurança do paciente",
    organization: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789241501958",
    reviewedAt: "2026-08-24",
  },
  niceMajorTrauma: {
    title: "Trauma maior: avaliação e manejo inicial (NG39)",
    organization: "National Institute for Health and Care Excellence",
    url: "https://www.nice.org.uk/guidance/ng39/chapter/recommendations",
    reviewedAt: "2026-08-24",
  },
  niceComplexFracture: {
    title: "Fraturas complexas: avaliação e manejo (NG37)",
    organization: "National Institute for Health and Care Excellence",
    url: "https://www.nice.org.uk/guidance/ng37/chapter/recommendations",
    reviewedAt: "2026-08-24",
  },
  niceDiabeticFoot: {
    title: "Problemas do pé diabético: prevenção e manejo (NG19)",
    organization: "National Institute for Health and Care Excellence",
    url: "https://www.nice.org.uk/guidance/ng19/chapter/Recommendations",
    reviewedAt: "2026-08-24",
  },
  niceMeningococcal: {
    title: "Meningite bacteriana e doença meningocócica (NG240)",
    organization: "National Institute for Health and Care Excellence",
    url: "https://www.nice.org.uk/guidance/ng240/chapter/Recommendations",
    reviewedAt: "2026-08-24",
  },
  cdcMeningococcal: {
    title: "Doença meningocócica — apresentação clínica",
    organization: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov/yellow-book/hcp/travel-associated-infections-diseases/meningococcal-disease.html",
    reviewedAt: "2026-08-24",
  },
};

export const bodyLayers: Array<{ id: BodyLayer; label: string; description: string; color: string }> = [
  { id: "surface", label: "Superfície", description: "Referências externas e regiões", color: "#d9b89c" },
  { id: "muscular", label: "Músculos", description: "Movimento e estabilidade", color: "#b86158" },
  { id: "skeletal", label: "Esqueleto", description: "Suporte e proteção", color: "#d7cfb6" },
  { id: "vascular", label: "Vasos", description: "Circulação arterial e venosa", color: "#5d83a8" },
  { id: "nervous", label: "Nervos", description: "Integração e condução", color: "#d7a947" },
  { id: "organs", label: "Órgãos", description: "Órgãos, glândulas e sentidos", color: "#8b6b83" },
];

/** Referências de escala: a contagem do atlas é editorial, não um total do corpo. */
export const atlasCoverageByLayer: Record<BodyLayer, AtlasCoverageReference> = {
  surface: {
    humanReference: "Não existe um total universal de regiões superficiais.",
    catalogNote: "O total varia conforme o nível de subdivisão adotado; aqui entram regiões externas e marcos palpáveis selecionados.",
    sourceIds: ["openstaxSurfaceAnatomy", "humanReferenceAtlas"],
  },
  muscular: {
    humanReference: "O corpo humano possui mais de 600 músculos.",
    catalogNote: "O atlas reúne músculos e grupos principais; estruturas bilaterais compartilham uma entrada, portanto não é uma contagem muscular total.",
    sourceIds: ["nihMuscleCount", "openstaxAxialMuscles", "openstaxAppendicularMuscles"],
  },
  skeletal: {
    humanReference: "O esqueleto adulto típico possui 206 ossos.",
    catalogNote: "O atlas reúne os lados direito e esquerdo em uma entrada e inclui ossos pequenos do crânio e da orelha; o total editorial não equivale ao número de ossos individuais.",
    sourceIds: ["openstaxSkeletonCount", "openstaxSkull"],
  },
  vascular: {
    humanReference: "Não existe um total anatômico único de vasos sanguíneos.",
    catalogNote: "Artérias e veias se ramificam progressivamente até redes microscópicas; o atlas mostra troncos e ramos nomeados selecionados.",
    sourceIds: ["openstaxCirculation", "humanReferenceAtlas"],
  },
  nervous: {
    humanReference: "Há 12 pares de nervos cranianos e 31 pares de nervos espinais, além de seus ramos.",
    catalogNote: "Esta camada também inclui encéfalo, medula e plexos; por isso, seus itens não representam uma contagem total de nervos.",
    sourceIds: ["openstaxNerveCount", "openstaxCranialNerves", "openstaxCns"],
  },
  organs: {
    humanReference: "A anatomia é organizada em 11 sistemas, mas não há consenso sobre um total único de órgãos.",
    catalogNote: "O catálogo combina órgãos inteiros, partes de órgãos, glândulas, sentidos e estruturas de conexão; o número exibido é editorial.",
    sourceIds: ["ncbiBodyOrganization", "pubmedOrganDefinition", "ncbiSalivaryGlands"],
  },
};

export const medicineLevelProfiles: Record<MedicineLevel, MedicineLevelProfile> = {
  Iniciante: {
    title: "Reconhecimento fundamental",
    focus: "Nomes, localização e funções essenciais",
    homeDescription: "Comece pelas estruturas mais reconhecíveis, construa vocabulário anatômico e conecte cada nome à sua função básica.",
    atlasDescription: "Priorize nome, região e função. Relações mais complexas ficam ocultas para reduzir a sobrecarga inicial.",
    practiceDescription: "Você recebe região, camada e uma dica com a primeira letra.",
    questionDescription: "Questões introdutórias do nível Iniciante, sem misturar conteúdos avançados.",
    clinicalInstruction: "Identifique os dados principais e descreva o mecanismo básico antes de avançar.",
    cycle: ["Explorar estruturas essenciais", "Aprender nomes e regiões", "Identificar com dicas", "Resolver questões introdutórias", "Revisar erros"],
  },
  "Ciclo básico": {
    title: "Integração estrutura–função",
    focus: "Anatomia, histologia e fisiologia",
    homeDescription: "Relacione estruturas, tecidos e mecanismos fisiológicos para formar uma base sólida antes da aplicação clínica.",
    atlasDescription: "Além da localização, estude função e relações anatômicas diretas entre as estruturas.",
    practiceDescription: "A região permanece visível, mas a dica de primeira letra é retirada.",
    questionDescription: "A sessão usa somente questões de Ciclo básico.",
    clinicalInstruction: "Explique a relação entre estrutura e função e registre quais dados ainda faltam.",
    cycle: ["Revisar anatomia", "Estudar fisiologia", "Identificar sem dica", "Resolver questões do ciclo básico", "Criar revisão espaçada", "Sintetizar no caderno"],
  },
  "Ciclo clínico": {
    title: "Aplicação anatômica e fisiopatológica",
    focus: "Relações clínicas e mecanismos",
    homeDescription: "Use a base anatômica para interpretar mecanismos, correlações clínicas e alterações funcionais com segurança.",
    atlasDescription: "Explore função, relações topográficas e estruturas próximas com foco em aplicação clínica.",
    practiceDescription: "A identificação mostra apenas a região anatômica; o catálogo completo entra na sessão.",
    questionDescription: "A sessão usa somente casos e questões de Ciclo clínico.",
    clinicalInstruction: "Construa uma representação do problema e justifique mecanismos fisiopatológicos possíveis.",
    cycle: ["Revisar anatomia aplicada", "Conectar fisiopatologia", "Identificar estruturas", "Resolver casos do ciclo clínico", "Revisar hipóteses", "Registrar lacunas"],
  },
  Internato: {
    title: "Raciocínio orientado por problemas",
    focus: "Síntese, prioridades e limites",
    homeDescription: "Treine síntese de dados, priorização de hipóteses e comunicação do raciocínio sem transformar o módulo em orientação assistencial.",
    atlasDescription: "A localização visual permanece, mas o painel prioriza relações e nomenclatura anatômica.",
    practiceDescription: "A região deixa de ser exibida antes da resposta; use somente imagem e camada.",
    questionDescription: "A sessão usa somente questões de Internato.",
    clinicalInstruction: "Priorize hipóteses, explicite dados discriminatórios e reconheça os limites da simulação.",
    cycle: ["Revisar pontos fracos", "Localizar estruturas críticas", "Resolver problemas", "Priorizar hipóteses", "Justificar decisões", "Auditar lacunas"],
  },
  Residência: {
    title: "Revisão avançada e precisão",
    focus: "Nomenclatura, relações e discriminação",
    homeDescription: "Faça revisão seletiva de alta precisão, identificando relações anatômicas, mecanismos e lacunas que exigem consulta à referência.",
    atlasDescription: "O painel exibe nomenclatura e relações completas; use as fontes para aprofundamento regional.",
    practiceDescription: "Sem dicas textuais antes da resposta e com prioridade para estruturas de nomenclatura específica.",
    questionDescription: "A sessão usa somente questões de Residência.",
    clinicalInstruction: "Produza uma síntese concisa, compare mecanismos concorrentes e declare incertezas relevantes.",
    cycle: ["Mapear lacunas", "Revisar relações avançadas", "Identificar sem pistas", "Resolver questões de residência", "Comparar mecanismos", "Conferir fontes"],
  },
};

const featuredAnatomyStructures: AnatomyStructure[] = [
  { id: "skin", name: "Pele", latin: "Cutis", layer: "surface", system: "Tegumentar", region: "Corpo inteiro", summary: "Órgão de revestimento que constitui a interface entre o organismo e o ambiente.", function: "Barreira física, termorregulação, sensibilidade e participação na síntese de vitamina D.", relations: "Recobre o tecido subcutâneo e continua-se com mucosas nas aberturas naturais.", nearby: ["Tecido subcutâneo", "Fáscia superficial"], synonyms: ["pele", "cutis", "tegumento"], sourceId: "openstaxSkin", x: 50, y: 37, positions: { anterior: { x: 50, y: 37 }, posterior: { x: 50, y: 37 } } },
  { id: "deltoid", name: "Músculo deltoide", latin: "Musculus deltoideus", layer: "muscular", system: "Musculoesquelético", region: "Ombro", summary: "Músculo triangular que recobre a articulação glenoumeral.", function: "Participa da abdução do braço; suas porções também contribuem para flexão, extensão e rotação.", relations: "Situa-se superficialmente ao úmero proximal e à articulação do ombro.", nearby: ["Acrômio", "Úmero", "Manguito rotador"], synonyms: ["deltoide", "músculo deltoide"], sourceId: "openstaxMuscle", x: 34, y: 25, positions: { anterior: { x: 34, y: 25 }, posterior: { x: 66, y: 25 } } },
  { id: "femur", name: "Fêmur", latin: "Femur", layer: "skeletal", system: "Musculoesquelético", region: "Coxa", summary: "Osso longo da coxa, articulado proximalmente com o acetábulo e distalmente com tíbia e patela.", function: "Transmite cargas e oferece alavancas para músculos do quadril e do joelho.", relations: "A cabeça ocupa o acetábulo; os côndilos participam da articulação do joelho.", nearby: ["Acetábulo", "Patela", "Tíbia"], synonyms: ["fêmur", "osso da coxa"], sourceId: "openstaxSkeleton", x: 43, y: 67, positions: { anterior: { x: 43, y: 67 }, posterior: { x: 57, y: 67 } } },
  { id: "aorta", name: "Aorta", latin: "Aorta", layer: "vascular", system: "Cardiovascular", region: "Tórax e abdome", summary: "Maior artéria da circulação sistêmica, originada no ventrículo esquerdo.", function: "Distribui sangue da circulação sistêmica por meio de seus ramos.", relations: "O arco relaciona-se com os grandes vasos; a aorta descendente segue no mediastino posterior e atravessa o diafragma.", nearby: ["Ventrículo esquerdo", "Tronco pulmonar", "Veia cava superior"], synonyms: ["aorta", "artéria aorta"], sourceId: "openstaxCirculation", x: 53, y: 35, positions: { anterior: { x: 53, y: 35 }, posterior: { x: 47, y: 35 } } },
  { id: "sciatic", name: "Nervo isquiático", latin: "Nervus ischiadicus", layer: "nervous", system: "Nervoso", region: "Pelve e membro inferior", summary: "Grande nervo do plexo sacral que percorre a região glútea e a face posterior da coxa.", function: "Reúne fibras destinadas a funções motoras e sensitivas de grande parte do membro inferior.", relations: "Forma-se a partir do plexo sacral e contém componentes tibial e fibular comum.", nearby: ["Plexo sacral", "Nervo tibial", "Nervo fibular comum"], synonyms: ["nervo isquiático", "ciático", "nervo ciático"], sourceId: "openstaxPns", x: 58, y: 66, positions: { posterior: { x: 58, y: 66 } } },
  { id: "brain", name: "Encéfalo", latin: "Encephalon", layer: "organs", system: "Nervoso", region: "Cavidade craniana", summary: "Conjunto de estruturas do sistema nervoso central contidas no crânio.", function: "Integra informação sensorial, planejamento motor, cognição, memória e regulação autonômica.", relations: "Continua-se inferiormente com a medula espinal e é envolvido pelas meninges.", nearby: ["Meninges", "Medula espinal", "Nervos cranianos"], synonyms: ["encéfalo", "encephalon"], sourceId: "openstaxCns", x: 50, y: 6, positions: { anterior: { x: 50, y: 6 }, posterior: { x: 50, y: 10 } } },
  { id: "heart", name: "Coração", latin: "Cor", layer: "organs", system: "Cardiovascular", region: "Mediastino", summary: "Órgão muscular oco com quatro câmaras que impulsiona sangue pelas circulações pulmonar e sistêmica.", function: "Gera fluxo sanguíneo por contrações coordenadas de átrios e ventrículos.", relations: "Situa-se no pericárdio, posterior ao esterno, entre os pulmões e sobre o diafragma.", nearby: ["Pulmões", "Aorta", "Tronco pulmonar", "Diafragma"], synonyms: ["coração", "cor"], sourceId: "openstaxHeart", x: 52, y: 27, positions: { anterior: { x: 52, y: 27 }, posterior: { x: 48, y: 27 } } },
  { id: "lungs", name: "Pulmões", latin: "Pulmones", layer: "organs", system: "Respiratório", region: "Cavidades pleurais", summary: "Órgãos pares da respiração localizados no tórax.", function: "Realizam trocas gasosas entre o ar alveolar e o sangue capilar.", relations: "Ladeiam o mediastino, são revestidos por pleura visceral e apoiam-se no diafragma.", nearby: ["Pleura", "Brônquios principais", "Diafragma", "Coração"], synonyms: ["pulmões", "pulmão"], sourceId: "openstaxRespiratory", x: 57, y: 22, positions: { anterior: { x: 57, y: 22 }, posterior: { x: 43, y: 23 } } },
  { id: "liver", name: "Fígado", latin: "Hepar", layer: "organs", system: "Digestório", region: "Quadrante superior direito do abdome", summary: "Grande órgão glandular predominantemente situado sob o hemidiafragma direito.", function: "Participa do metabolismo, síntese de proteínas plasmáticas, produção de bile e processamento de substâncias absorvidas.", relations: "Relaciona-se superiormente com o diafragma e inferiormente com vísceras abdominais.", nearby: ["Vesícula biliar", "Veia porta", "Diafragma"], synonyms: ["fígado", "hepar"], sourceId: "openstaxDigestive", x: 43, y: 34, positions: { anterior: { x: 43, y: 34 }, posterior: { x: 57, y: 34 } } },
  { id: "kidneys", name: "Rins", latin: "Renes", layer: "organs", system: "Urinário", region: "Retroperitônio", summary: "Órgãos pares situados na parede posterior do abdome.", function: "Filtram o plasma, regulam água e eletrólitos e participam do equilíbrio ácido-base e de funções endócrinas.", relations: "São retroperitoneais; o rim direito costuma situar-se ligeiramente mais inferior que o esquerdo.", nearby: ["Glândulas suprarrenais", "Ureteres", "Aorta abdominal"], synonyms: ["rins", "rim", "renes"], sourceId: "openstaxKidney", x: 56, y: 37, positions: { anterior: { x: 56, y: 37 }, posterior: { x: 44, y: 37 } } },
];

export const anatomyStructures: AnatomyStructure[] = [
  ...featuredAnatomyStructures,
  ...medicineAtlasCatalog.map((structure) => {
    const firstPosition = structure.positions.anterior ?? structure.positions.posterior ?? { x: 50, y: 50 };
    return { ...structure, x: firstPosition.x, y: firstPosition.y };
  }),
];

export function anatomyPositionFor(structure: AnatomyStructure, view: AtlasView): AtlasPosition | null {
  if (structure.positions) return structure.positions[view] ?? null;
  return {
    x: view === "posterior" ? 100 - structure.x : structure.x,
    y: view === "posterior" && structure.id === "brain" ? 10 : structure.y,
  };
}

export function preferredAnatomyView(structure: AnatomyStructure): AtlasView {
  if (structure.positions?.anterior) return "anterior";
  if (structure.positions?.posterior) return "posterior";
  return structure.id === "sciatic" ? "posterior" : "anterior";
}

const femaleOnlyAtlasStructureIds = new Set(["mammary-glands", "ovaries", "uterine-tubes", "uterus", "cervix", "vagina", "vulva", "clitoris"]);
const maleOnlyAtlasStructureIds = new Set(["testes", "epididymis", "ductus-deferens", "seminal-vesicles", "bulbourethral-glands", "prostate", "scrotum", "penis"]);

export function atlasImageFor(layer: BodyLayer, view: AtlasView, profile: AtlasBodyProfile = "male") {
  if (layer === "organs" && profile === "female") return `/medicine/atlas/organs-female-${view}-v3.png`;
  const version = layer === "surface" ? "v3" : "v2";
  return `/medicine/atlas/${layer}-${view}-${version}.png`;
}

export function atlasBodyProfileForStructure(structure: AnatomyStructure): AtlasBodyProfile {
  return femaleOnlyAtlasStructureIds.has(structure.id) ? "female" : "male";
}

export function atlasImageForStructure(structure: AnatomyStructure, view = preferredAnatomyView(structure)) {
  return atlasImageFor(structure.layer, view, atlasBodyProfileForStructure(structure));
}

export function structureMatchesAtlasBodyProfile(structure: AnatomyStructure, profile: AtlasBodyProfile) {
  if (profile === "female") return !maleOnlyAtlasStructureIds.has(structure.id);
  return !femaleOnlyAtlasStructureIds.has(structure.id);
}

export const medicalSystems: MedicalSystem[] = [
  { id: "cardiovascular", name: "Cardiovascular", description: "Bomba cardíaca, vasos e transporte sistêmico.", color: "#b35f68", icon: "heart", image: "/medicine/systems/cardiovascular-v1.png", structures: ["Coração", "Aorta", "Artérias", "Veias", "Capilares"], topics: ["Ciclo cardíaco", "Hemodinâmica", "Circulações pulmonar e sistêmica"], atlasStructureIds: ["heart", "right-atrium", "left-atrium", "right-ventricle", "left-ventricle", "tricuspid-valve", "mitral-valve", "aortic-valve", "pulmonary-trunk", "pulmonary-veins", "left-coronary-artery", "aorta", "aortic-arch", "superior-vena-cava", "femoral-artery"], questionSystems: ["Cardiovascular"], sourceId: "openstaxHeart" },
  { id: "respiratory", name: "Respiratório", description: "Ventilação, difusão e transporte de gases.", color: "#7398a8", icon: "lungs", image: "/medicine/systems/respiratory-v1.png", structures: ["Pulmões", "Traqueia", "Brônquios", "Alvéolos", "Diafragma"], topics: ["Mecânica ventilatória", "Trocas gasosas", "Controle da respiração"], atlasStructureIds: ["lungs", "nasal-cavity", "pharynx", "larynx", "epiglottis", "trachea", "main-bronchi", "bronchioles", "alveoli", "pleura", "diaphragm"], questionSystems: ["Respiratório"], sourceId: "openstaxRespiratory" },
  { id: "nervous", name: "Nervoso", description: "Integração sensorial, motora e autonômica.", color: "#b48a46", icon: "brain", image: "/medicine/systems/nervous-v1.png", structures: ["Encéfalo", "Medula espinal", "Nervos periféricos"], topics: ["Potencial de ação", "Sinapses", "Vias motoras e sensitivas"], atlasStructureIds: ["brain", "cerebrum", "cerebellum", "brainstem", "spinal-cord", "olfactory-nerve", "optic-nerve", "trigeminal-nerve", "facial-nerve", "vestibulocochlear-nerve", "vagus-nerve", "hypoglossal-nerve", "pudendal-nerve", "sciatic"], questionSystems: ["Nervoso"], sourceId: "openstaxCns" },
  { id: "digestive", name: "Digestório", description: "Digestão, absorção e metabolismo de nutrientes.", color: "#8d7861", icon: "activity", image: "/medicine/systems/digestive-v1.png", structures: ["Esôfago", "Estômago", "Intestinos", "Fígado", "Pâncreas"], topics: ["Motilidade", "Secreções", "Absorção"], atlasStructureIds: ["oral-cavity", "parotid-gland", "submandibular-gland", "sublingual-gland", "esophagus", "stomach", "liver", "gallbladder", "common-bile-duct", "pancreas", "duodenum", "jejunum", "ileum", "ascending-colon", "rectum", "anal-canal"], questionSystems: ["Digestório"], sourceId: "openstaxDigestive" },
  { id: "musculoskeletal", name: "Musculoesquelético", description: "Sustentação, movimento e proteção.", color: "#9d685f", icon: "bone", image: "/medicine/systems/musculoskeletal-v1.png", structures: ["Ossos", "Articulações", "Músculos", "Tendões"], topics: ["Tecido ósseo", "Contração muscular", "Biomecânica"], atlasStructureIds: ["deltoid", "femur", "sphenoid-bone", "hyoid-bone", "clavicle", "scapula", "sternum", "rib-1", "humerus", "patella", "tibia", "pectoralis-major", "subscapularis", "transversus-abdominis", "piriformis", "rectus-femoris"], questionSystems: ["Musculoesquelético"], sourceId: "openstaxSkeleton" },
  { id: "endocrine", name: "Endócrino", description: "Sinalização hormonal e homeostase.", color: "#8d7397", icon: "sparkles", image: "/medicine/systems/endocrine-v1.png", structures: ["Hipófise", "Tireoide", "Suprarrenais", "Pâncreas endócrino"], topics: ["Eixos hormonais", "Retroalimentação hormonal", "Metabolismo"], atlasStructureIds: ["hypothalamus", "pituitary-gland", "pineal-gland", "thyroid-gland", "parathyroid-glands", "adrenal-glands", "pancreas"], questionSystems: ["Endócrino"], sourceId: "openstaxEndocrine" },
  { id: "urinary", name: "Urinário", description: "Filtração, equilíbrio interno e excreção.", color: "#6085a0", icon: "droplets", image: "/medicine/systems/urinary-v1.png", structures: ["Rins", "Ureteres", "Bexiga", "Uretra"], topics: ["Filtração glomerular", "Transporte tubular", "Equilíbrio ácido-base"], atlasStructureIds: ["kidneys", "ureters", "urinary-bladder", "urethra"], questionSystems: ["Urinário"], sourceId: "openstaxKidney" },
  { id: "immune", name: "Linfático e imune", description: "Defesa, vigilância e retorno de fluidos.", color: "#668a75", icon: "shield", image: "/medicine/systems/immune-v1.png", structures: ["Linfonodos", "Baço", "Timo", "Vasos linfáticos"], topics: ["Imunidade inata", "Imunidade adaptativa", "Drenagem linfática"], atlasStructureIds: ["thymus", "spleen", "palatine-tonsils", "cervical-lymph-nodes", "axillary-lymph-nodes", "inguinal-lymph-nodes"], questionSystems: ["Imune", "Linfático"], sourceId: "openstaxImmune" },
  { id: "integumentary", name: "Tegumentar", description: "Barreira corporal, anexos cutâneos e termorregulação.", color: "#c08c75", icon: "shield", image: "/medicine/systems/integumentary-v1.png", structures: ["Epiderme", "Derme", "Hipoderme", "Pelos", "Unhas", "Glândulas cutâneas"], topics: ["Barreira epidérmica", "Anexos cutâneos", "Termorregulação e sensibilidade"], atlasStructureIds: ["skin", "epidermis", "dermis", "hypodermis", "hair-follicle", "sebaceous-gland", "sweat-gland", "nails"], questionSystems: ["Tegumentar"], sourceId: "openstaxSkinLayers" },
  { id: "special-senses", name: "Sentidos especiais", description: "Visão, audição, equilíbrio, olfato e gustação.", color: "#8b79a6", icon: "eye", image: "/medicine/systems/special-senses-v1.png", structures: ["Olho", "Retina", "Orelha interna", "Epitélio olfatório", "Botões gustativos"], topics: ["Transdução sensorial", "Vias visuais e auditivas", "Equilíbrio, olfato e gustação"], atlasStructureIds: ["eyes", "cornea", "iris", "sclera", "retina", "lens-eye", "lacrimal-gland", "optic-nerve", "tympanic-membrane", "cochlea", "semicircular-canals", "olfactory-epithelium", "tongue", "taste-buds"], questionSystems: ["Sentidos especiais"], sourceId: "openstaxSenses" },
  { id: "reproductive", name: "Reprodutor", description: "Gônadas, gametas, ductos e regulação reprodutiva.", color: "#a56f86", icon: "activity", image: "/medicine/atlas/organs-anterior-v2.png", structures: ["Ovários", "Tubas uterinas", "Útero", "Testículos", "Epidídimo", "Próstata"], topics: ["Gametogênese", "Ciclos e regulação hormonal", "Trajetos reprodutivos"], atlasStructureIds: ["mammary-glands", "ovaries", "uterine-tubes", "uterus", "cervix", "vagina", "clitoris", "testes", "epididymis", "ductus-deferens", "seminal-vesicles", "bulbourethral-glands", "prostate", "scrotum"], questionSystems: ["Reprodutor"], sourceId: "openstaxReproductive" },
];

export const embryologyTimeline: DevelopmentStage[] = [
  {
    id: "fertilization",
    phase: "Pré-natal",
    period: "Semana 1",
    title: "Fecundação, clivagem e blastocisto",
    detail: "O desenvolvimento começa com a união dos gametas. O zigoto passa por divisões celulares sucessivas, forma a mórula e depois o blastocisto, que inicia a implantação no endométrio.",
    milestones: ["Formação do zigoto após a fecundação", "Clivagens aumentam o número de células sem crescimento proporcional do conjunto", "Diferenciação inicial entre embrioblasto e trofoblasto no blastocisto"],
    systems: ["Fecundação", "Clivagem", "Mórula", "Blastocisto"],
    studyQuestions: ["Como a clivagem difere do crescimento corporal?", "Quais partes do blastocisto participam do embrião e da interface com o organismo materno?"],
    sourceId: "ncbiFertilization",
    image: "/medicine/development/week-1-v1.png",
    imageAlt: "Sequência didática da fecundação ao blastocisto",
  },
  {
    id: "implantation",
    phase: "Pré-natal",
    period: "Semanas 2–3",
    title: "Implantação e gastrulação",
    detail: "A implantação progride e o disco embrionário se reorganiza. Na gastrulação surgem as três camadas germinativas que darão origem aos tecidos e sistemas do corpo.",
    milestones: ["Aprofundamento da implantação no endométrio", "Formação da linha primitiva e reorganização celular", "Estabelecimento de ectoderma, mesoderma e endoderma"],
    systems: ["Implantação", "Disco embrionário", "Gastrulação", "Camadas germinativas"],
    studyQuestions: ["Por que a gastrulação é um marco de organização corporal?", "Quais são os principais derivados de cada camada germinativa?"],
    sourceId: "ncbiGastrulation",
    image: "/medicine/development/weeks-2-3-v1.png",
    imageAlt: "Modelo didático de implantação e disco embrionário trilaminar",
  },
  {
    id: "embryonic",
    phase: "Pré-natal",
    period: "Semanas 3–8",
    title: "Organogênese embrionária",
    detail: "O plano corporal torna-se reconhecível e ocorre a formação inicial dos principais sistemas. Ao final do período embrionário, os sistemas existem em forma rudimentar e continuarão a crescer e amadurecer.",
    milestones: ["Dobramentos estabelecem a forma corporal básica", "Tubo neural, coração inicial e somitos avançam em organização", "Brotos dos membros e contornos da face tornam-se progressivamente definidos"],
    systems: ["Sistema nervoso", "Sistema cardiovascular", "Musculoesquelético", "Face e membros"],
    studyQuestions: ["Como os dobramentos alteram a relação entre as estruturas embrionárias?", "Por que formação inicial não significa maturidade funcional?"],
    sourceId: "openstaxEmbryonic",
    image: "/medicine/development/weeks-3-8-v2.png",
    imageAlt: "Modelo didático do embrião ao final da oitava semana",
  },
  {
    id: "fetal",
    phase: "Pré-natal",
    period: "Semana 9 ao nascimento",
    title: "Crescimento e maturação fetal",
    detail: "No período fetal, o corpo cresce rapidamente, as proporções se modificam e os sistemas formados no período embrionário prosseguem em diferenciação e maturação funcional.",
    milestones: ["Crescimento corporal e mudança progressiva das proporções", "Aprimoramento estrutural dos órgãos e sistemas", "Maturação gradual necessária para a transição à vida extrauterina"],
    systems: ["Crescimento somático", "Movimento", "Maturação pulmonar", "Maturação neurológica"],
    studyQuestions: ["Qual é a diferença central entre os períodos embrionário e fetal?", "Quais sistemas precisam de adaptações imediatas ao nascimento?"],
    sourceId: "openstaxFetal",
    image: "/medicine/development/fetal-period-v1.png",
    imageAlt: "Modelo fetal didático em envoltório protetor",
  },
  {
    id: "neonatal",
    phase: "Pós-natal",
    period: "Nascimento–28 dias",
    title: "Transição neonatal",
    detail: "O nascimento exige adaptação rápida à vida fora do útero. O início da ventilação pulmonar e a reorganização da circulação estão entre as mudanças fisiológicas centrais desse período.",
    milestones: ["Início da ventilação pulmonar", "Mudança do padrão circulatório fetal", "Adaptação progressiva da termorregulação, alimentação e interação com o ambiente"],
    systems: ["Respiratório", "Cardiovascular", "Termorregulação", "Nutrição"],
    studyQuestions: ["O que muda na circulação quando a troca gasosa passa a ocorrer nos pulmões?", "Quais adaptações distinguem a vida intrauterina da extrauterina?"],
    sourceId: "openstaxFetal",
    image: "/medicine/development/neonatal-transition-v1.png",
    imageAlt: "Representação neonatal didática com destaque para pulmões e coração",
  },
  {
    id: "infancy",
    phase: "Pós-natal",
    period: "1 mês–2 anos",
    title: "Bebê e primeira infância",
    detail: "É uma fase de crescimento corporal intenso, amadurecimento sensorial e rápida aquisição motora. A sequência geral do desenvolvimento é previsível, mas o momento exato varia entre crianças.",
    milestones: ["Controle motor avança das regiões centrais para movimentos mais precisos", "Integração entre visão, audição, postura e exploração do ambiente", "Crescimento cerebral e corporal acompanha novas formas de mobilidade e comunicação"],
    systems: ["Neurodesenvolvimento", "Crescimento", "Coordenação motora", "Integração sensorial"],
    studyQuestions: ["Por que marcos do desenvolvimento devem ser interpretados como faixas?", "Como habilidades motoras amplas preparam movimentos mais finos?"],
    sourceId: "openstaxInfancy",
    image: "/medicine/development/infancy-toddler-v1.png",
    imageAlt: "Representação educacional de um bebê explorando um bloco de madeira",
  },
  {
    id: "childhood",
    phase: "Pós-natal",
    period: "3–10 anos · faixa didática",
    title: "Infância",
    detail: "O crescimento torna-se mais estável que nos primeiros anos, enquanto coordenação, força, equilíbrio, linguagem e autonomia continuam a se desenvolver em interação com o ambiente.",
    milestones: ["Aprimoramento do equilíbrio e das habilidades motoras", "Mudanças graduais nas proporções corporais", "Maior integração entre movimento, aprendizagem e participação social"],
    systems: ["Musculoesquelético", "Sistema nervoso", "Dentição", "Crescimento"],
    studyQuestions: ["Como crescimento e maturação diferem entre si?", "Quais fatores biológicos e ambientais participam do desenvolvimento infantil?"],
    sourceId: "openstaxChildhood",
    image: "/medicine/development/childhood-v1.png",
    imageAlt: "Representação educacional de uma criança em idade escolar",
  },
  {
    id: "adolescence",
    phase: "Pós-natal",
    period: "11–17 anos · faixa didática",
    title: "Adolescência e puberdade",
    detail: "A puberdade produz mudanças hormonais, crescimento acelerado e maturação sexual. O início, a duração e a sequência visível variam, por isso a faixa etária é apenas uma orientação didática.",
    milestones: ["Estirão de crescimento e mudanças nas proporções corporais", "Desenvolvimento de características sexuais secundárias", "Maturação cerebral e reorganização de ritmos biológicos continuam ao longo da adolescência"],
    systems: ["Endócrino", "Reprodutor", "Musculoesquelético", "Sistema nervoso"],
    studyQuestions: ["Como os eixos hormonais coordenam as mudanças puberais?", "Por que idade cronológica e estágio puberal não são equivalentes?"],
    sourceId: "openstaxAdolescence",
    image: "/medicine/development/adolescence-v1.png",
    imageAlt: "Representação educacional de uma pessoa adolescente",
  },
  {
    id: "adult",
    phase: "Pós-natal",
    period: "18–39 anos · faixa didática",
    title: "Adulto jovem",
    detail: "No início da vida adulta, a estatura tende a se estabilizar e os sistemas corporais alcançam sua organização madura. Desenvolvimento, porém, continua como adaptação física, cognitiva e social ao longo da vida.",
    milestones: ["Consolidação das características corporais adultas", "Manutenção e adaptação dos sistemas maduros às demandas do cotidiano", "Hábitos, ambiente e condições de saúde passam a influenciar de forma acumulativa a trajetória corporal"],
    systems: ["Homeostase", "Saúde musculoesquelética", "Metabolismo", "Cognição"],
    studyQuestions: ["Por que desenvolvimento humano não termina com o crescimento em altura?", "Como hábitos e ambiente interagem com a biologia na vida adulta?"],
    sourceId: "openstaxEarlyAdult",
    image: "/medicine/development/early-adulthood-v1.png",
    imageAlt: "Representação educacional de uma pessoa no início da vida adulta",
  },
  {
    id: "middle-adulthood",
    phase: "Pós-natal",
    period: "40–64 anos · faixa didática",
    title: "Meia-idade e adaptação",
    detail: "Na vida adulta intermediária, as mudanças físicas e cognitivas tendem a ocorrer gradualmente e variam amplamente. Composição corporal, percepção sensorial, metabolismo e manutenção musculoesquelética passam por adaptações influenciadas por genética, ambiente, acesso à saúde e hábitos acumulados.",
    milestones: ["Mudanças graduais na composição corporal e na recuperação física", "Manutenção de massa muscular, densidade óssea, sono e saúde cardiovascular ganha importância", "Experiência, contexto social e hábitos continuam modulando saúde e funcionamento"],
    systems: ["Musculoesquelético", "Cardiovascular", "Metabolismo", "Percepção sensorial"],
    studyQuestions: ["Como envelhecimento primário e fatores ambientais se combinam na meia-idade?", "Por que as trajetórias de desenvolvimento ficam cada vez mais diversas entre pessoas adultas?"],
    sourceId: "openstaxMiddleAdult",
    image: "/medicine/development/middle-adulthood-v1.png",
    imageAlt: "Ilustração educacional de uma pessoa adulta na meia-idade em postura ativa e estável",
  },
  {
    id: "late-adulthood",
    phase: "Pós-natal",
    period: "65 anos ou mais · faixa didática",
    title: "Envelhecimento e longevidade",
    detail: "O envelhecimento envolve mudanças progressivas e heterogêneas em músculos, ossos, sentidos, sistema nervoso, circulação e outros sistemas. Idade cronológica não determina sozinha capacidade ou saúde: história de vida, condições clínicas, ambiente, atividade e suporte social produzem trajetórias muito diferentes.",
    milestones: ["Reserva fisiológica e velocidade de recuperação podem se modificar ao longo dos anos", "Força, equilíbrio, mobilidade, visão e audição apresentam grande variação individual", "Atividade, nutrição, sono, prevenção e participação social contribuem para preservar função e autonomia"],
    systems: ["Envelhecimento saudável", "Mobilidade", "Sentidos", "Cognição e autonomia"],
    studyQuestions: ["Por que envelhecimento normal não deve ser tratado como sinônimo de doença?", "Quais fatores ajudam a preservar função e autonomia na velhice?"],
    sourceId: "openstaxLateAdult",
    image: "/medicine/development/late-adulthood-v1.png",
    imageAlt: "Ilustração educacional respeitosa de uma pessoa idosa independente em postura estável",
  },
];

export const medicalClinicalCase: MedicalClinicalCase = {
  id: "microcytic-anemia",
  area: "Hematologia",
  setting: "Ambulatório",
  difficulty: "Ciclo clínico",
  durationMinutes: 18,
  title: "Fadiga progressiva e microcitose",
  subtitle: "Caso fictício para integrar fisiologia do transporte de oxigênio, hemograma e metabolismo do ferro.",
  patient: "Mulher de 24 anos · cenário inteiramente fictício",
  focus: "Reconhecer estabilidade, classificar a anemia, comparar hipóteses e construir uma síntese segura.",
  sensitive: false,
  triage: [
    { label: "PA", value: "112/70 mmHg", tone: "normal" },
    { label: "FC", value: "102 bpm", tone: "attention" },
    { label: "SpO₂", value: "99% AA", tone: "normal" },
    { label: "Dor", value: "0/10", tone: "normal" },
  ],
  steps: [
    {
      id: "initial-assessment",
      label: "Avaliação inicial",
      title: "Queixa, tempo e segurança",
      release: ["Cansaço progressivo há cerca de 3 meses", "Falta de ar ao subir dois lances de escada, com melhora no repouso", "Sem dor torácica, síncope, febre ou sangramento ativo relatado", "PA 112/70 mmHg · FC 102 bpm · FR 18 irpm · SpO₂ 99% em ar ambiente"],
      question: "Antes de formular uma causa, qual é a prioridade de raciocínio nesta primeira etapa?",
      options: ["Confirmar estabilidade e procurar sinais de alarme", "Escolher imediatamente um suplemento de ferro", "Concluir que a falta de ar é pulmonar", "Solicitar apenas uma imagem do tórax"],
      answer: 0,
      explanation: "A primeira tarefa é reconhecer estabilidade e sinais de alarme. Etiologia e investigação dirigida vêm depois; o caso não oferece base para prescrição nem para atribuir o sintoma a um único sistema.",
      reflectionPrompt: "Escreva uma representação do problema em uma frase, incluindo duração, impacto funcional e estabilidade atual.",
      placeholder: "Ex.: pessoa adulta jovem, com sintoma progressivo há…, limitação aos esforços e sem…",
      sourceId: "nhlbiAnemiaDiagnosis",
    },
    {
      id: "directed-history",
      label: "História dirigida",
      title: "Procure pistas de perda ou menor oferta de ferro",
      release: ["Relata vontade frequente de mastigar gelo", "Menstruações de 8 dias, com coágulos e troca de absorvente a cada 2 horas nos dias de maior fluxo", "Dieta com pouca carne e sem suplementação", "Nega fezes escuras, dor abdominal e histórico familiar conhecido de anemia"],
      question: "Qual combinação aumenta mais a suspeita de depleção de ferro por perda crônica neste cenário?",
      options: ["Ausência de dor abdominal e de febre", "Fluxo menstrual prolongado associado a pagofagia", "Idade jovem associada à frequência respiratória de 18", "Falta de ar associada à saturação de 99%"],
      answer: 1,
      explanation: "Perdas menstruais persistentes são uma fonte possível de perda crônica de ferro, e pagofagia é uma pista associada à deficiência de ferro. Esses dados orientam a hipótese, mas ainda exigem confirmação laboratorial e investigação da causa da perda.",
      reflectionPrompt: "Liste a hipótese principal e duas informações adicionais que você perguntaria para avaliar perdas, ingestão ou absorção de ferro.",
      placeholder: "Hipótese: … | Ainda perguntaria sobre: 1) … 2) …",
      sourceId: "ncbiAnemia",
    },
    {
      id: "physical-exam",
      label: "Exame físico",
      title: "Conecte os achados ao transporte de oxigênio",
      release: ["Consciente, orientada e sem desconforto em repouso", "Palidez conjuntival", "Taquicardia regular, sem sinais de congestão", "Sem icterícia, linfonodomegalias ou hepatoesplenomegalia no exame simulado"],
      question: "Qual mecanismo explica melhor fadiga e taquicardia quando a concentração de hemoglobina está reduzida?",
      options: ["Aumento da difusão de oxigênio por excesso de hemoglobina", "Bloqueio mecânico dos brônquios pela redução de ferro", "Menor capacidade de transporte de oxigênio, com resposta cardiovascular compensatória", "Produção excessiva de plaquetas como causa direta da dispneia"],
      answer: 2,
      explanation: "A hemoglobina dos eritrócitos transporta a maior parte do oxigênio. Quando sua concentração cai, a oferta de oxigênio aos tecidos pode diminuir e respostas compensatórias, como aumento da frequência cardíaca, podem aparecer.",
      reflectionPrompt: "Explique em duas frases a sequência: hemoglobina reduzida → oferta de oxigênio → sintomas e compensação.",
      placeholder: "Com menos hemoglobina… Por isso, o organismo…",
      sourceId: "openstaxErythrocytes",
    },
    {
      id: "laboratory-classification",
      label: "Hemograma e ferro",
      title: "Classifique antes de nomear a causa",
      release: ["Hemoglobina 8,9 g/dL · hematócrito 29%", "VCM 68 fL · RDW 18,4%", "Reticulócitos 0,8%", "Ferritina 5 ng/mL · saturação de transferrina 6% · PCR sem elevação", "Valores e intervalos são didáticos; referências laboratoriais variam"],
      question: "Qual descrição integra melhor esses resultados?",
      options: ["Anemia macrocítica com reticulocitose intensa", "Anemia microcítica com resposta reticulocitária inadequada e estoques de ferro reduzidos", "Policitemia com sobrecarga de ferro", "Hemograma normal, sem alteração do transporte de oxigênio"],
      answer: 1,
      explanation: "VCM abaixo de 80 fL classifica a anemia como microcítica. Ferritina e saturação de transferrina muito baixas apoiam depleção de ferro, enquanto a resposta reticulocitária não está aumentada de modo proporcional à anemia.",
      reflectionPrompt: "Registre os quatro dados que sustentam a classificação e diga o que cada um acrescenta ao raciocínio.",
      placeholder: "Hb: … | VCM: … | Reticulócitos: … | Ferritina/TSAT: …",
      sourceId: "ncbiAnemia",
    },
    {
      id: "differential",
      label: "Hipóteses comparadas",
      title: "Não pare na palavra “microcitose”",
      release: ["Deficiência de ferro: pode cursar com ferritina baixa, saturação baixa e RDW elevado", "Traço talassêmico: também pode ser microcítico, mas não explica isoladamente estoques de ferro esgotados", "Anemia da inflamação: a ferritina pode estar normal ou elevada por ser reagente de fase aguda", "A história de perdas continua necessária para explicar por que o ferro foi depletado"],
      question: "Qual hipótese de trabalho é mais coerente com o conjunto, mantendo o limite adequado?",
      options: ["Traço talassêmico confirmado apenas pelo VCM", "Anemia da inflamação confirmada apesar da PCR e ferritina baixas", "Hemólise intravascular confirmada sem dados de destruição eritrocitária", "Anemia por deficiência de ferro, provavelmente relacionada a perda crônica; a fonte ainda precisa ser investigada"],
      answer: 3,
      explanation: "O conjunto favorece deficiência de ferro, mas reconhecer o padrão não encerra o caso. É necessário investigar a origem da depleção e manter diferenciais quando a história, a resposta ou os exames forem discordantes.",
      reflectionPrompt: "Compare deficiência de ferro com uma hipótese alternativa usando ao menos dois dados discriminatórios do caso.",
      placeholder: "Favorece deficiência de ferro porque… Em comparação, a hipótese de… seria esperada se…",
      sourceId: "ncbiAnemia",
    },
    {
      id: "safe-synthesis",
      label: "Síntese final",
      title: "Feche o raciocínio sem ultrapassar os dados",
      release: ["O padrão laboratorial sustenta anemia microcítica com depleção de ferro", "A história sugere perda menstrual crônica como possibilidade importante", "O cenário não avalia todas as causas de sangramento, absorção inadequada ou diagnósticos associados", "Nenhuma conduta terapêutica deve ser inferida desta simulação"],
      question: "Qual conclusão final é mais precisa e segura para este exercício?",
      options: ["A causa está definitivamente provada e dispensa investigação adicional", "Os sintomas demonstram doença pulmonar, independentemente do hemograma", "O padrão apoia deficiência de ferro; é preciso investigar a fonte da perda e causas concorrentes antes de encerrar a avaliação", "O caso permite definir tratamento individual sem avaliação profissional"],
      answer: 2,
      explanation: "Uma boa síntese declara o padrão sustentado pelos dados, propõe a origem como hipótese e explicita o que falta. Ela não transforma uma simulação em diagnóstico definitivo nem em orientação terapêutica individual.",
      reflectionPrompt: "Produza três frases: representação do problema, evidências que sustentam sua hipótese e lacunas que ainda precisam ser investigadas.",
      placeholder: "1) Trata-se de… 2) A hipótese é sustentada por… 3) Ainda faltam…",
      sourceId: "nhlbiAnemiaDiagnosis",
    },
  ],
  completion: {
    title: "Caso concluído: raciocínio auditável",
    summary: "Você percorreu segurança, história dirigida, mecanismo fisiológico, classificação laboratorial, diferenciais e síntese final sem transformar o exercício em prescrição.",
    takeaways: ["Estabilidade vem antes da etiologia", "VCM classifica o padrão; ferritina e saturação ajudam a interpretar o ferro", "Uma hipótese forte ainda precisa explicar a origem da alteração", "Síntese clínica segura inclui evidências, alternativas e lacunas"],
  },
};

export const medicalClinicalCases: MedicalClinicalCase[] = [medicalClinicalCase, ...additionalMedicalClinicalCases];

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
  { id: "mq10", level: "Ciclo básico", system: "Endócrino", type: "Múltipla escolha", prompt: "Qual mecanismo regula primariamente a liberação de muitos hormônios?", options: ["Retroalimentação negativa", "Difusão pulmonar", "Filtração glomerular", "Contração voluntária"], answer: 0, explanation: "A regulação da liberação hormonal ocorre principalmente por circuitos de retroalimentação negativa.", sourceId: "openstaxEndocrine" },
  { id: "mq11", level: "Ciclo básico", system: "Imune", type: "Múltipla escolha", prompt: "Qual célula diferenciada secreta anticorpos?", options: ["Plasmócito", "Hemácia", "Plaqueta", "Fibroblasto"], answer: 0, explanation: "Plasmócitos são linfócitos B diferenciados especializados na secreção de anticorpos.", sourceId: "openstaxImmune" },
  { id: "mq12", level: "Ciclo básico", system: "Digestório", type: "Múltipla escolha", prompt: "Em qual segmento ocorre a maior parte da absorção de nutrientes?", options: ["Esôfago", "Intestino delgado", "Reto", "Cavidade oral"], answer: 1, explanation: "O intestino delgado realiza a maior parte da digestão química e da absorção de nutrientes.", sourceId: "openstaxDigestive" },
  { id: "mq13", level: "Ciclo clínico", system: "Cardiovascular", type: "Múltipla escolha", prompt: "Durante a sístole ventricular, o aumento da pressão ventricular promove ejeção para quais vasos?", options: ["Veias cavas e pulmonares", "Aorta e tronco pulmonar", "Artérias coronárias apenas", "Seio coronário e aorta"], answer: 1, explanation: "A contração ventricular eleva a pressão e ejeta sangue para o tronco pulmonar e a aorta.", sourceId: "openstaxCardiacCycle" },
  { id: "mq14", level: "Ciclo clínico", system: "Respiratório", type: "Múltipla escolha", prompt: "Na respiração externa, qual é o sentido do fluxo de oxigênio?", options: ["Do sangue para o alvéolo", "Do alvéolo para o capilar pulmonar", "Da pleura para o brônquio", "Da traqueia para a artéria pulmonar sem difusão"], answer: 1, explanation: "O oxigênio segue seu gradiente de pressão parcial do ar alveolar para o sangue capilar pulmonar.", sourceId: "openstaxRespiratory" },
  { id: "mq15", level: "Ciclo clínico", system: "Urinário", type: "Múltipla escolha", prompt: "Quais estruturas formam o corpúsculo renal?", options: ["Glomérulo e cápsula glomerular", "Alça de Henle e ureter", "Bexiga e uretra", "Ducto coletor e pelve renal"], answer: 0, explanation: "O corpúsculo renal reúne o tufo capilar glomerular e a cápsula glomerular que o envolve.", sourceId: "openstaxKidney" },
  { id: "mq16", level: "Internato", system: "Endócrino", type: "Caso clínico", prompt: "Em um circuito de retroalimentação negativa, o aumento do produto final tende a produzir qual resposta?", options: ["Estimular indefinidamente sua própria liberação", "Reduzir o estímulo às etapas anteriores", "Bloquear toda sinalização neural", "Converter hormônio em anticorpo"], answer: 1, explanation: "Na retroalimentação negativa, a elevação do resultado regulado reduz estímulos prévios e ajuda a manter a homeostase.", sourceId: "openstaxEndocrine" },
  { id: "mq17", level: "Internato", system: "Respiratório", type: "Caso clínico", prompt: "Se a ventilação de um alvéolo diminui, mas a perfusão se mantém, qual relação fica comprometida?", options: ["Ventilação/perfusão", "Osso/músculo", "Filtração/secreção renal", "Aferência/eferência neural"], answer: 0, explanation: "A troca eficiente depende da compatibilidade entre ventilação alveolar e perfusão capilar.", sourceId: "openstaxRespiratory" },
  { id: "mq18", level: "Internato", system: "Linfático", type: "Múltipla escolha", prompt: "Uma função central dos vasos linfáticos é:", options: ["Ejetar sangue do ventrículo", "Retornar excesso de fluido intersticial à circulação", "Produzir bile", "Ventilar alvéolos"], answer: 1, explanation: "O sistema linfático drena fluido intersticial excedente e o devolve à corrente sanguínea.", sourceId: "openstaxImmune" },
  { id: "mq19", level: "Residência", system: "Urinário", type: "Caso clínico", prompt: "Qual conjunto representa componentes da barreira de filtração glomerular?", options: ["Endotélio fenestrado, membrana basal e fendas entre pedicelos", "Urotélio, músculo detrusor e uretra", "Pleura, alvéolo e endotélio pulmonar", "Periósteo, cartilagem e tendão"], answer: 0, explanation: "A barreira inclui endotélio capilar fenestrado, membrana basal compartilhada e fendas de filtração entre prolongamentos dos podócitos.", sourceId: "openstaxKidney" },
  { id: "mq20", level: "Residência", system: "Musculoesquelético", type: "Múltipla escolha", prompt: "No ciclo de pontes cruzadas, a ligação de uma nova molécula de ATP à miosina favorece:", options: ["Desprendimento da miosina da actina", "Abertura da valva aórtica", "Filtração no glomérulo", "Síntese de anticorpos"], answer: 0, explanation: "A ligação de ATP permite que a cabeça de miosina se desprenda da actina antes de um novo ciclo.", sourceId: "openstaxMuscleContraction" },
  { id: "mq21", level: "Iniciante", system: "Tegumentar", type: "Múltipla escolha", prompt: "Quais são as duas camadas principais da pele?", options: ["Epiderme e derme", "Derme e periósteo", "Pleura e pericárdio", "Córtex e medula"], answer: 0, explanation: "A pele é formada por epiderme superficial e derme mais profunda; a hipoderme situa-se abaixo e conecta a pele aos planos profundos.", sourceId: "openstaxSkinLayers" },
  { id: "mq22", level: "Ciclo básico", system: "Tegumentar", type: "Múltipla escolha", prompt: "Por qual mecanismo a epiderme avascular recebe nutrientes?", options: ["Difusão a partir de vasos da derme", "Filtração a partir da uretra", "Ventilação pelos folículos", "Contração das unhas"], answer: 0, explanation: "Como a epiderme não possui vasos sanguíneos, seus tecidos recebem nutrientes por difusão a partir da rede vascular da derme.", sourceId: "openstaxSkinLayers" },
  { id: "mq23", level: "Ciclo clínico", system: "Tegumentar", type: "Caso clínico", prompt: "Durante calor intenso, qual resposta cutânea favorece diretamente a perda de calor por evaporação?", options: ["Produção de suor", "Contração do músculo eretor do pelo", "Crescimento ungueal", "Produção de sebo"], answer: 0, explanation: "A secreção das glândulas sudoríparas alcança a superfície e sua evaporação remove calor, contribuindo para a termorregulação.", sourceId: "openstaxSkinAccessories" },
  { id: "mq24", level: "Internato", system: "Tegumentar", type: "Caso clínico", prompt: "Uma perda extensa da barreira epidérmica aumenta mais diretamente quais riscos?", options: ["Perda de água e entrada de microrganismos", "Aumento da filtração glomerular", "Obstrução da valva aórtica", "Produção excessiva de bile"], answer: 0, explanation: "A barreira cutânea reduz perda de água e dificulta a entrada de agentes externos; sua perda compromete essas duas funções essenciais.", sourceId: "openstaxSkin" },
  { id: "mq25", level: "Residência", system: "Tegumentar", type: "Múltipla escolha", prompt: "Qual estrato epidérmico contém células mitoticamente ativas que renovam queratinócitos?", options: ["Estrato basal", "Estrato córneo", "Camada reticular da derme", "Hipoderme"], answer: 0, explanation: "O estrato basal é a camada epidérmica profunda com células proliferativas que originam queratinócitos para as camadas superiores.", sourceId: "openstaxSkinLayers" },
  { id: "mq26", level: "Iniciante", system: "Sentidos especiais", type: "Múltipla escolha", prompt: "Qual estrutura da orelha interna participa diretamente da audição?", options: ["Cóclea", "Tireoide", "Baço", "Patela"], answer: 0, explanation: "A cóclea abriga o aparato receptor que transforma vibrações mecânicas em sinais relacionados à audição.", sourceId: "openstaxSenses" },
  { id: "mq27", level: "Ciclo básico", system: "Sentidos especiais", type: "Múltipla escolha", prompt: "Em qual camada do olho ficam os fotorreceptores?", options: ["Retina", "Esclera", "Cristalino", "Córnea"], answer: 0, explanation: "Bastonetes e cones são fotorreceptores localizados na retina, onde a energia luminosa inicia sua conversão em sinal neural.", sourceId: "openstaxSenses" },
  { id: "mq28", level: "Ciclo clínico", system: "Sentidos especiais", type: "Caso clínico", prompt: "Movimentos de rotação da cabeça são detectados principalmente por quais estruturas?", options: ["Canais semicirculares", "Cóclea", "Cristalino", "Botões gustativos"], answer: 0, explanation: "Os canais semicirculares participam da detecção de aceleração angular e fornecem informação essencial ao equilíbrio dinâmico.", sourceId: "openstaxSenses" },
  { id: "mq29", level: "Internato", system: "Sentidos especiais", type: "Múltipla escolha", prompt: "Qual nervo craniano conduz a informação visual da retina?", options: ["Nervo óptico", "Nervo vago", "Nervo acessório", "Nervo hipoglosso"], answer: 0, explanation: "Os axônios das células ganglionares da retina convergem para formar o nervo óptico, que conduz informação visual ao encéfalo.", sourceId: "openstaxSenses" },
  { id: "mq30", level: "Residência", system: "Sentidos especiais", type: "Múltipla escolha", prompt: "A transdução auditiva começa quando a vibração da membrana basilar desloca células receptoras localizadas em qual estrutura?", options: ["Órgão espiral da cóclea", "Câmara anterior do olho", "Epitélio olfatório", "Glândula parótida"], answer: 0, explanation: "O órgão espiral, localizado sobre a membrana basilar na cóclea, contém células ciliadas que convertem movimento mecânico em sinal receptor.", sourceId: "openstaxSenses" },
  { id: "mq31", level: "Iniciante", system: "Reprodutor", type: "Múltipla escolha", prompt: "Como são chamados os órgãos que produzem gametas?", options: ["Gônadas", "Ureteres", "Linfonodos", "Brônquios"], answer: 0, explanation: "Ovários e testículos são gônadas: órgãos que produzem gametas e também participam da secreção de hormônios reprodutivos.", sourceId: "openstaxReproductive" },
  { id: "mq32", level: "Ciclo básico", system: "Reprodutor", type: "Múltipla escolha", prompt: "Em qual estrutura testicular ocorre a espermatogênese?", options: ["Túbulos seminíferos", "Epidídimo", "Próstata", "Vesícula seminal"], answer: 0, explanation: "A produção de espermatozoides ocorre no epitélio dos túbulos seminíferos; o epidídimo participa de etapas posteriores de maturação.", sourceId: "openstaxReproductive" },
  { id: "mq33", level: "Ciclo clínico", system: "Reprodutor", type: "Caso clínico", prompt: "Qual camada uterina é eliminada durante a menstruação?", options: ["Estrato funcional do endométrio", "Miométrio inteiro", "Perimétrio", "Ligamento ovariano"], answer: 0, explanation: "A queda hormonal leva à eliminação do estrato funcional do endométrio; o estrato basal permanece e participa de sua regeneração.", sourceId: "openstaxReproductive" },
  { id: "mq34", level: "Internato", system: "Reprodutor", type: "Múltipla escolha", prompt: "Qual evento hormonal desencadeia diretamente a ovulação no ciclo ovariano típico?", options: ["Pico de LH", "Queda isolada de ADH", "Pico de insulina", "Aumento de paratormônio"], answer: 0, explanation: "O aumento acentuado de hormônio luteinizante desencadeia mudanças no folículo dominante que culminam na liberação do oócito.", sourceId: "openstaxReproductive" },
  { id: "mq35", level: "Residência", system: "Reprodutor", type: "Múltipla escolha", prompt: "Qual sequência descreve corretamente o trajeto do espermatozoide após sair dos túbulos seminíferos?", options: ["Epidídimo → ducto deferente → ducto ejaculatório → uretra", "Próstata → ureter → bexiga → uretra", "Epidídimo → tuba uterina → uretra → próstata", "Ducto deferente → rim → vesícula seminal → ureter"], answer: 0, explanation: "Após vias intratesticulares, os espermatozoides chegam ao epidídimo, seguem pelo ducto deferente, ducto ejaculatório e finalmente pela uretra.", sourceId: "openstaxReproductive" },
];
