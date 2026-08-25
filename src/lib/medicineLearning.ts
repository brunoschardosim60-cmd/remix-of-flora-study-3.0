export type MedicineCompetency = "anatomia" | "fisiologia" | "semiologia" | "raciocinio-clinico" | "instrumentos" | "seguranca";
export type MedicineReviewCategory = "anatomia" | "questoes" | "instrumentos" | "anamnese" | "semiologia" | "clinica" | "cirurgia";

export interface MedicineLearningAttempt {
  id: string;
  label: string;
  category: MedicineReviewCategory;
  competency: MedicineCompetency;
  sourceSection: string;
  attempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  pending: boolean;
  lastAttemptAt: string;
}

export interface MedicineLearningState {
  version: 1;
  items: Record<string, MedicineLearningAttempt>;
}

export interface RegisterMedicineAttemptInput {
  id: string;
  label: string;
  category: MedicineReviewCategory;
  competency: MedicineCompetency;
  sourceSection: string;
  correct: boolean;
  attemptedAt?: string;
}

export const emptyMedicineLearningState: MedicineLearningState = { version: 1, items: {} };

export const medicineCompetencyLabels: Record<MedicineCompetency, string> = {
  anatomia: "Anatomia",
  fisiologia: "Fisiologia",
  semiologia: "Semiologia",
  "raciocinio-clinico": "Raciocínio clínico",
  instrumentos: "Instrumentos",
  seguranca: "Segurança",
};

export const medicineReviewCategoryLabels: Record<MedicineReviewCategory, string> = {
  anatomia: "Estruturas anatômicas",
  questoes: "Questões",
  instrumentos: "Instrumentos",
  anamnese: "Anamnese",
  semiologia: "Semiologia",
  clinica: "Decisões clínicas",
  cirurgia: "Cirurgia virtual",
};

export function parseMedicineLearningState(value: unknown): MedicineLearningState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyMedicineLearningState;
  const candidate = value as Partial<MedicineLearningState>;
  if (!candidate.items || typeof candidate.items !== "object" || Array.isArray(candidate.items)) return emptyMedicineLearningState;
  const items = Object.fromEntries(Object.entries(candidate.items).filter(([, item]) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const attempt = item as Partial<MedicineLearningAttempt>;
    return typeof attempt.id === "string" && typeof attempt.label === "string" && typeof attempt.pending === "boolean";
  })) as Record<string, MedicineLearningAttempt>;
  return { version: 1, items };
}

export function registerMedicineAttempt(state: MedicineLearningState, input: RegisterMedicineAttemptInput): MedicineLearningState {
  const previous = state.items[input.id];
  const next: MedicineLearningAttempt = {
    id: input.id,
    label: input.label,
    category: input.category,
    competency: input.competency,
    sourceSection: input.sourceSection,
    attempts: (previous?.attempts ?? 0) + 1,
    correctAttempts: (previous?.correctAttempts ?? 0) + Number(input.correct),
    wrongAttempts: (previous?.wrongAttempts ?? 0) + Number(!input.correct),
    pending: !input.correct,
    lastAttemptAt: input.attemptedAt ?? new Date().toISOString(),
  };
  return { version: 1, items: { ...state.items, [input.id]: next } };
}

export function mergeMedicineLearningStates(localState: MedicineLearningState, cloudState: MedicineLearningState): MedicineLearningState {
  const ids = new Set([...Object.keys(localState.items), ...Object.keys(cloudState.items)]);
  const items: Record<string, MedicineLearningAttempt> = {};
  ids.forEach((id) => {
    const local = localState.items[id];
    const cloud = cloudState.items[id];
    if (!local) { items[id] = cloud; return; }
    if (!cloud) { items[id] = local; return; }
    const latest = local.lastAttemptAt >= cloud.lastAttemptAt ? local : cloud;
    items[id] = {
      ...latest,
      attempts: Math.max(local.attempts, cloud.attempts),
      correctAttempts: Math.max(local.correctAttempts, cloud.correctAttempts),
      wrongAttempts: Math.max(local.wrongAttempts, cloud.wrongAttempts),
    };
  });
  return { version: 1, items };
}

export function pendingMedicineReviews(state: MedicineLearningState) {
  return Object.values(state.items)
    .filter((item) => item.pending)
    .sort((a, b) => b.lastAttemptAt.localeCompare(a.lastAttemptAt));
}

export function medicineCompetencyProgress(state: MedicineLearningState) {
  return (Object.keys(medicineCompetencyLabels) as MedicineCompetency[]).map((competency) => {
    const items = Object.values(state.items).filter((item) => item.competency === competency);
    const score = items.length
      ? Math.round(items.reduce((total, item) => total + item.correctAttempts / Math.max(item.attempts, 1), 0) / items.length * 100)
      : 0;
    return { competency, label: medicineCompetencyLabels[competency], score, activities: items.length };
  });
}

export function medicineOverallProgress(state: MedicineLearningState) {
  const active = medicineCompetencyProgress(state).filter((item) => item.activities > 0);
  return active.length ? Math.round(active.reduce((total, item) => total + item.score, 0) / active.length) : 0;
}
