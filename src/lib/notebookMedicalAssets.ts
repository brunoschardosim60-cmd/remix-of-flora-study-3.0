export type MedicalAssetCategory = "Camadas" | "Sistemas" | "Desenvolvimento";

export interface NotebookMedicalAsset {
  id: string;
  label: string;
  description: string;
  src: string;
  category: MedicalAssetCategory;
  orientation?: "Anterior" | "Posterior";
}

const atlasAsset = (
  id: string,
  label: string,
  description: string,
  layer: string,
  orientation: "Anterior" | "Posterior",
): NotebookMedicalAsset => ({
  id: `${id}-${orientation.toLocaleLowerCase("pt-BR")}`,
  label: `${label} · vista ${orientation.toLocaleLowerCase("pt-BR")}`,
  description,
  src: `/medicine/atlas/${layer}-${orientation.toLocaleLowerCase("pt-BR")}-v2.png`,
  category: "Camadas",
  orientation,
});

export const notebookMedicalAssets: NotebookMedicalAsset[] = [
  atlasAsset("surface", "Superfície corporal", "Regiões externas, orientação e localização no corpo.", "surface", "Anterior"),
  atlasAsset("surface", "Superfície corporal", "Regiões externas, orientação e localização no corpo.", "surface", "Posterior"),
  atlasAsset("muscular", "Sistema muscular", "Principais grupos musculares e suas relações superficiais.", "muscular", "Anterior"),
  atlasAsset("muscular", "Sistema muscular", "Principais grupos musculares do dorso e membros.", "muscular", "Posterior"),
  atlasAsset("skeletal", "Esqueleto", "Ossos, eixos de sustentação e referências anatômicas.", "skeletal", "Anterior"),
  atlasAsset("skeletal", "Esqueleto", "Ossos e referências anatômicas posteriores.", "skeletal", "Posterior"),
  atlasAsset("vascular", "Vasos sanguíneos", "Trajetos arteriais e venosos principais.", "vascular", "Anterior"),
  atlasAsset("vascular", "Vasos sanguíneos", "Trajetos vasculares em vista posterior.", "vascular", "Posterior"),
  atlasAsset("nervous", "Sistema nervoso", "Sistema nervoso central e nervos periféricos.", "nervous", "Anterior"),
  atlasAsset("nervous", "Sistema nervoso", "Medula, trajetos nervosos e relações posteriores.", "nervous", "Posterior"),
  atlasAsset("organs", "Órgãos internos", "Posição aproximada e relações dos principais órgãos.", "organs", "Anterior"),
  atlasAsset("organs", "Órgãos internos", "Relações viscerais observadas posteriormente.", "organs", "Posterior"),
  { id: "cardiovascular", label: "Sistema cardiovascular", description: "Coração, grandes vasos e circulação sistêmica.", src: "/medicine/systems/cardiovascular-v1.png", category: "Sistemas" },
  { id: "respiratory", label: "Sistema respiratório", description: "Vias aéreas, pulmões e interface de trocas gasosas.", src: "/medicine/systems/respiratory-v1.png", category: "Sistemas" },
  { id: "nervous-system", label: "Sistema nervoso", description: "Organização central e periférica do sistema nervoso.", src: "/medicine/systems/nervous-v1.png", category: "Sistemas" },
  { id: "digestive", label: "Sistema digestório", description: "Trajeto gastrointestinal e órgãos associados.", src: "/medicine/systems/digestive-v1.png", category: "Sistemas" },
  { id: "musculoskeletal", label: "Sistema musculoesquelético", description: "Integração entre ossos, articulações e músculos.", src: "/medicine/systems/musculoskeletal-v1.png", category: "Sistemas" },
  { id: "endocrine", label: "Sistema endócrino", description: "Glândulas e eixos de regulação hormonal.", src: "/medicine/systems/endocrine-v1.png", category: "Sistemas" },
  { id: "urinary", label: "Sistema urinário", description: "Rins, ureteres, bexiga e vias de eliminação.", src: "/medicine/systems/urinary-v1.png", category: "Sistemas" },
  { id: "immune", label: "Sistema imune e linfático", description: "Órgãos linfoides e circulação linfática.", src: "/medicine/systems/immune-v1.png", category: "Sistemas" },
  { id: "week-1", label: "Primeira semana", description: "Fecundação, clivagem e formação inicial do blastocisto.", src: "/medicine/development/week-1-v1.png", category: "Desenvolvimento" },
  { id: "weeks-2-3", label: "Semanas 2 e 3", description: "Implantação, disco embrionário e gastrulação.", src: "/medicine/development/weeks-2-3-v1.png", category: "Desenvolvimento" },
  { id: "weeks-3-8", label: "Semanas 3 a 8", description: "Dobramentos, diferenciação e organogênese inicial.", src: "/medicine/development/weeks-3-8-v2.png", category: "Desenvolvimento" },
  { id: "fetal-period", label: "Período fetal", description: "Crescimento corporal e maturação progressiva dos sistemas.", src: "/medicine/development/fetal-period-v1.png", category: "Desenvolvimento" },
  { id: "neonatal", label: "Transição neonatal", description: "Adaptações funcionais relacionadas ao nascimento.", src: "/medicine/development/neonatal-transition-v1.png", category: "Desenvolvimento" },
  { id: "infancy", label: "Lactente e primeira infância", description: "Crescimento e aquisição progressiva de funções.", src: "/medicine/development/infancy-toddler-v1.png", category: "Desenvolvimento" },
  { id: "childhood", label: "Infância", description: "Desenvolvimento corporal e funcional durante a infância.", src: "/medicine/development/childhood-v1.png", category: "Desenvolvimento" },
  { id: "adolescence", label: "Adolescência", description: "Maturação puberal e transição para a vida adulta.", src: "/medicine/development/adolescence-v1.png", category: "Desenvolvimento" },
  { id: "adult", label: "Adulto jovem", description: "Organização corporal no início da vida adulta.", src: "/medicine/development/early-adulthood-v1.png", category: "Desenvolvimento" },
];

