export type MedicalAssetCategory = "Camadas" | "Sistemas" | "Patologia" | "Desenvolvimento";

export interface NotebookMedicalAsset {
  id: string;
  label: string;
  description: string;
  src: string;
  category: MedicalAssetCategory;
  orientation?: "Anterior" | "Posterior";
  /** O arquivo contém canal alfa real e entra no papel como recorte. */
  transparent: boolean;
  suggestedWidth?: number;
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
  transparent: true,
  suggestedWidth: 430,
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
  ...[
    ["cardiovascular", "Sistema cardiovascular", "Coração, grandes vasos e circulação sistêmica.", "cardiovascular-v1.png"],
    ["respiratory", "Sistema respiratório", "Vias aéreas, pulmões e interface de trocas gasosas.", "respiratory-v1.png"],
    ["nervous-system", "Sistema nervoso", "Organização central e periférica do sistema nervoso.", "nervous-v1.png"],
    ["digestive", "Sistema digestório", "Trajeto gastrointestinal e órgãos associados.", "digestive-v1.png"],
    ["musculoskeletal", "Sistema musculoesquelético", "Integração entre ossos, articulações e músculos.", "musculoskeletal-v1.png"],
    ["endocrine", "Sistema endócrino", "Glândulas e eixos de regulação hormonal.", "endocrine-v1.png"],
    ["urinary", "Sistema urinário", "Rins, ureteres, bexiga e vias de eliminação.", "urinary-v1.png"],
    ["immune", "Sistema imune e linfático", "Órgãos linfoides e circulação linfática.", "immune-v1.png"],
  ].map(([id, label, description, file]) => ({ id, label, description, src: `/medicine/systems/${file}`, category: "Sistemas" as const, transparent: true, suggestedWidth: 460 })),
  ...[
    ["pathology-lungs", "Pulmões · saudável e enfisema", "Prancha comparativa com alterações enfisematosas e pontos para anotação.", "lungs-emphysema-comparison-v1.png"],
    ["pathology-heart", "Coração · saudável e pós-infarto", "Corte comparativo com cicatriz miocárdica e remodelamento ventricular.", "heart-infarction-comparison-v1.png"],
    ["pathology-liver", "Fígado · saudável e cirrose", "Comparação macroscópica entre superfície hepática lisa e arquitetura cirrótica.", "liver-cirrhosis-comparison-v1.png"],
    ["pathology-kidney", "Rim · saudável e hidronefrose", "Corte renal comparativo com dilatação da pelve, cálices e compressão do parênquima.", "kidney-hydronephrosis-comparison-v1.png"],
    ["pathology-brain", "Cérebro · saudável e AVC isquêmico", "Corte comparativo com território focal ilustrativo de lesão isquêmica.", "brain-stroke-comparison-v1.png"],
  ].map(([id, label, description, file]) => ({ id, label, description, src: `/medicine/pathology/${file}`, category: "Patologia" as const, transparent: true, suggestedWidth: 620 })),
  ...[
    ["week-1", "Primeira semana", "Fecundação, clivagem e formação inicial do blastocisto.", "week-1-v1.png"],
    ["weeks-2-3", "Semanas 2 e 3", "Implantação, disco embrionário e gastrulação.", "weeks-2-3-v1.png"],
    ["weeks-3-8", "Semanas 3 a 8", "Dobramentos, diferenciação e organogênese inicial.", "weeks-3-8-v2.png"],
    ["fetal-period", "Período fetal", "Crescimento corporal e maturação progressiva dos sistemas.", "fetal-period-v1.png"],
    ["neonatal", "Transição neonatal", "Adaptações funcionais relacionadas ao nascimento.", "neonatal-transition-v1.png"],
    ["infancy", "Lactente e primeira infância", "Crescimento e aquisição progressiva de funções.", "infancy-toddler-v1.png"],
    ["childhood", "Infância", "Desenvolvimento corporal e funcional durante a infância.", "childhood-v1.png"],
    ["adolescence", "Adolescência", "Maturação puberal e transição para a vida adulta.", "adolescence-v1.png"],
    ["adult", "Adulto jovem", "Organização corporal no início da vida adulta.", "early-adulthood-v1.png"],
    ["middle-adulthood", "Meia-idade", "Adaptações graduais durante a vida adulta intermediária.", "middle-adulthood-v1.png"],
    ["late-adulthood", "Envelhecimento", "Mudanças heterogêneas, longevidade, função e autonomia.", "late-adulthood-v1.png"],
  ].map(([id, label, description, file]) => ({ id, label, description, src: `/medicine/development/${file}`, category: "Desenvolvimento" as const, transparent: false, suggestedWidth: 600 })),
];

/** Adiciona metadados de edição às figuras médicas já existentes nos templates. */
export function prepareMedicalNotebookHtml(html: string) {
  return html.replace(/<img\s+([^>]*src=["']\/medicine\/(?:atlas|systems|pathology)\/[^"']+["'][^>]*)>/gi, (match, attributes: string) => {
    if (/data-medical-asset=/i.test(attributes)) return match;
    return `<img ${attributes} data-medical-asset="template" data-transparent="true" data-wrap="true" data-alignment="left" width="430">`;
  });
}
