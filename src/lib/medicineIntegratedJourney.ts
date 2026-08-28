export type IntegratedMedicineOrganId = "heart";

export type IntegratedMedicineStructureId =
  | "heart"
  | "left-atrium"
  | "right-atrium"
  | "left-ventricle"
  | "right-ventricle"
  | "mitral-valve"
  | "tricuspid-valve"
  | "aortic-valve"
  | "pulmonary-valve";

export type IntegratedMedicineStepId =
  | "heart-interior"
  | "heart-physiology"
  | "heart-histology"
  | "heart-pathology"
  | "heart-semiology"
  | "heart-anamnesis"
  | "heart-clinical-case"
  | "heart-question"
  | "heart-review";

export type IntegratedMedicineDestination =
  | "systems"
  | "histology"
  | "pathology"
  | "semiology"
  | "anamnesis"
  | "clinic"
  | "questions"
  | "review";

type IntegratedMedicineStepBase = {
  id: IntegratedMedicineStepId;
  eyebrow: string;
  label: string;
  description: string;
  sourceIds: string[];
};

export type IntegratedMedicineStep =
  | (IntegratedMedicineStepBase & { kind: "action"; action: "open-interior" })
  | (IntegratedMedicineStepBase & { kind: "destination"; destination: "systems"; target: { systemId: string } })
  | (IntegratedMedicineStepBase & {
    kind: "destination";
    destination: "histology";
    target: { journeyId: "eye" | "oral" | "cell"; depth: number; specimenId: string };
  })
  | (IntegratedMedicineStepBase & { kind: "destination"; destination: "pathology"; target: { pathologyId: string } })
  | (IntegratedMedicineStepBase & { kind: "destination"; destination: "semiology"; target: { moduleId: string } })
  | (IntegratedMedicineStepBase & { kind: "destination"; destination: "anamnesis"; target: { caseId: string } })
  | (IntegratedMedicineStepBase & { kind: "destination"; destination: "clinic"; target: { caseId: string } })
  | (IntegratedMedicineStepBase & { kind: "destination"; destination: "questions"; target: { system: string } })
  | (IntegratedMedicineStepBase & { kind: "destination"; destination: "review"; target: Record<string, never> });

export type IntegratedMedicineStructure = {
  id: IntegratedMedicineStructureId;
  label: string;
  restore3DStructureId: string;
  aliases: string[];
};

export type IntegratedMedicineJourney = {
  id: string;
  organId: IntegratedMedicineOrganId;
  organLabel: string;
  systemLabel: string;
  title: string;
  shortTitle: string;
  description: string;
  structures: IntegratedMedicineStructure[];
  steps: IntegratedMedicineStep[];
};

export type IntegratedMedicineContext = {
  journeyId: string;
  organId: IntegratedMedicineOrganId;
  structure: {
    id: IntegratedMedicineStructureId;
    label: string;
    source3DId: string;
    restore3DStructureId: string;
  };
  activeStepId: IntegratedMedicineStepId;
};

export type IntegratedMedicineStructureInput = { id?: string | null; name?: string | null };

const heartStructures: IntegratedMedicineStructure[] = [
  { id: "left-atrium", label: "Átrio esquerdo", restore3DStructureId: "organ-heart-left-atrium", aliases: ["left atrium", "atrium left", "atrio esquerdo", "atrium sinistrum"] },
  { id: "right-atrium", label: "Átrio direito", restore3DStructureId: "organ-heart-right-atrium", aliases: ["right atrium", "atrium right", "atrio direito", "atrium dextrum"] },
  { id: "left-ventricle", label: "Ventrículo esquerdo", restore3DStructureId: "organ-heart-left-ventricle", aliases: ["left ventricle", "ventricle left", "ventriculo esquerdo", "ventriculus sinister"] },
  { id: "right-ventricle", label: "Ventrículo direito", restore3DStructureId: "organ-heart-right-ventricle", aliases: ["right ventricle", "ventricle right", "ventriculo direito", "ventriculus dexter"] },
  { id: "mitral-valve", label: "Valva mitral", restore3DStructureId: "organ-heart-mitral-valve", aliases: ["mitral valve", "bicuspid valve", "valva mitral", "valvula mitral", "valva bicuspide"] },
  { id: "tricuspid-valve", label: "Valva tricúspide", restore3DStructureId: "organ-heart-tricuspid-valve", aliases: ["tricuspid valve", "valva tricuspide", "valvula tricuspide"] },
  { id: "aortic-valve", label: "Valva aórtica", restore3DStructureId: "organ-heart-aortic-valve", aliases: ["aortic valve", "valva aortica", "valvula aortica", "valva da aorta"] },
  { id: "pulmonary-valve", label: "Valva pulmonar", restore3DStructureId: "organ-heart-pulmonary-valve", aliases: ["pulmonary valve", "pulmonic valve", "valva pulmonar", "valvula pulmonar"] },
  { id: "heart", label: "Coração", restore3DStructureId: "organ-heart", aliases: ["organ heart", "organ-heart", "coracao", "heart"] },
];

const heartSteps: IntegratedMedicineStep[] = [
  { id: "heart-interior", eyebrow: "ANATOMIA 3D", label: "Abrir o interior", description: "Torne a parede translúcida e examine câmaras, septos e valvas no mesmo modelo.", kind: "action", action: "open-interior", sourceIds: ["openstaxHeart", "zanatomy-models"] },
  { id: "heart-physiology", eyebrow: "FISIOLOGIA", label: "Seguir o fluxo", description: "Relacione câmaras, valvas, ciclo cardíaco e circulação sistêmica.", kind: "destination", destination: "systems", target: { systemId: "cardiovascular" }, sourceIds: ["openstaxHeart", "openstaxCardiacCycle"] },
  { id: "heart-histology", eyebrow: "HISTOLOGIA", label: "Ver músculo cardíaco", description: "Passe do órgão para o tecido muscular cardíaco e suas características microscópicas.", kind: "destination", destination: "histology", target: { journeyId: "cell", depth: 78, specimenId: "muscular" }, sourceIds: ["openstax-tissues"] },
  { id: "heart-pathology", eyebrow: "PATOLOGIA", label: "Comparar pós-infarto", description: "Compare miocárdio preservado e cicatriz após infarto sem confundir imagem com diagnóstico.", kind: "destination", destination: "pathology", target: { pathologyId: "heart" }, sourceIds: ["openstaxHeart", "ahaAcs2025"] },
  { id: "heart-semiology", eyebrow: "SEMIOLOGIA", label: "Examinar o cardiovascular", description: "Revise inspeção, pulsos, precórdio e ausculta dentro do exame por sistemas.", kind: "destination", destination: "semiology", target: { moduleId: "systems-exam" }, sourceIds: ["openstaxHeart", "ahaChestPain2021"] },
  { id: "heart-anamnesis", eyebrow: "PACIENTE VIRTUAL", label: "Entrevistar Carlos", description: "Conduza uma conversa livre e ancorada diante de pressão torácica com sinais de alerta.", kind: "destination", destination: "anamnesis", target: { caseId: "chest-pressure" }, sourceIds: ["ahaAcs2025", "ahaChestPain2021"] },
  { id: "heart-clinical-case", eyebrow: "RACIOCÍNIO CLÍNICO", label: "Investigar síndrome coronariana", description: "Integre urgência, ECG, troponina seriada e diagnósticos concorrentes em um caso fictício.", kind: "destination", destination: "clinic", target: { caseId: "acute-coronary-syndrome" }, sourceIds: ["ahaAcs2025", "ahaHeartAttackDiagnosis"] },
  { id: "heart-question", eyebrow: "RECUPERAÇÃO ATIVA", label: "Responder uma questão", description: "Teste o mecanismo cardiovascular no nível atual e registre o resultado.", kind: "destination", destination: "questions", target: { system: "Cardiovascular" }, sourceIds: ["openstaxHeart", "openstaxCardiacCycle"] },
  { id: "heart-review", eyebrow: "REVISÃO", label: "Consolidar a trilha", description: "Retome automaticamente os pontos que precisarem de nova tentativa.", kind: "destination", destination: "review", target: {}, sourceIds: ["openstaxHeart"] },
];

export const integratedMedicineJourneys: IntegratedMedicineJourney[] = [
  {
    id: "heart-clinical-path",
    organId: "heart",
    organLabel: "Coração",
    systemLabel: "Cardiovascular",
    title: "Do coração à decisão clínica",
    shortTitle: "Trilha do coração",
    description: "Siga a mesma estrutura da anatomia normal até a fisiologia, a doença, a entrevista clínica e a revisão.",
    structures: heartStructures,
    steps: heartSteps,
  },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveIntegratedJourneyStructure(input: IntegratedMedicineStructureInput) {
  const haystack = normalize(`${input.id ?? ""} ${input.name ?? ""}`);
  if (!haystack) return undefined;
  for (const journey of integratedMedicineJourneys) {
    const structure = journey.structures.find((candidate) => candidate.aliases.some((alias) => haystack.includes(normalize(alias))));
    if (structure) return { journey, structure };
  }
  return undefined;
}

export function createIntegratedMedicineContext(input: IntegratedMedicineStructureInput, activeStepId: IntegratedMedicineStepId): IntegratedMedicineContext | undefined {
  const resolved = resolveIntegratedJourneyStructure(input);
  if (!resolved || !resolved.journey.steps.some((step) => step.id === activeStepId)) return undefined;
  return {
    journeyId: resolved.journey.id,
    organId: resolved.journey.organId,
    structure: {
      id: resolved.structure.id,
      label: resolved.structure.label,
      source3DId: input.id ?? resolved.structure.restore3DStructureId,
      restore3DStructureId: resolved.structure.restore3DStructureId,
    },
    activeStepId,
  };
}

export function integratedJourneyForContext(context?: IntegratedMedicineContext | null) {
  if (!context) return undefined;
  return integratedMedicineJourneys.find((journey) => journey.id === context.journeyId && journey.organId === context.organId);
}

export function integratedStepForContext(context?: IntegratedMedicineContext | null) {
  return integratedJourneyForContext(context)?.steps.find((step) => step.id === context?.activeStepId);
}

export function nextIntegratedStepForContext(context?: IntegratedMedicineContext | null) {
  const journey = integratedJourneyForContext(context);
  if (!journey || !context) return undefined;
  const index = journey.steps.findIndex((step) => step.id === context.activeStepId);
  return index >= 0 ? journey.steps[index + 1] : undefined;
}
