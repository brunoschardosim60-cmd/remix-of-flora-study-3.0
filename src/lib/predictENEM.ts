// Predição de nota ENEM ponderada por múltiplos fatores reais
// Interno: 0–1000 (transparente). Display: 300–1000 (escala real ENEM)
// Conversão: displayScore = 300 + (internal / 1000) * 700

/**
 * Converte pontuação interna (0-1000) para escala real do ENEM (300-1000).
 * 0 interno = 300 ENEM (mínimo real), 1000 interno = 1000 ENEM.
 */
export function toENEMScale(internal: number): number {
  return Math.round(300 + (Math.min(1000, Math.max(0, internal)) / 1000) * 700);
}
export interface StudentPerf {
  materia: string;
  accuracy: number;
  erro_recorrente: boolean;
}

export interface StudySession {
  duration_ms: number;
}

export interface EssayRow {
  status: string;
  nota_total: number | null;
}

export interface SpacedReview {
  completed: boolean;
  scheduled_date: string;
}

export interface WeeklySlotRow {
  concluido: boolean;
}

export interface ENEMFactors {
  quizScore: number;
  essayScore: number;
  reviewScore: number;
  volumeScore: number;
  scheduleScore: number;
  reviewRate: number;
  studyVolumeMin: number;
  scheduleAdherence: number;
  hasEssays: boolean;
  hasReviews: boolean;
  hasSchedule: boolean;
  essayCount: number;
  avgEssayRaw: number;
}

export interface ENEMPrediction {
  score: number;
  trend: "up" | "down" | "stable";
  confidence: number;
  breakdown: { area: string; score: number; color: string }[];
  factors: ENEMFactors;
  weights: { quizzes: number; essays: number; reviews: number; volume: number; schedule: number };
}

const AREA_MAP: Record<string, { subjects: string[]; color: string }> = {
  "Ciências Humanas":  { subjects: ["História", "Geografia"], color: "#f97316" },
  "Ciências Natureza": { subjects: ["Biologia", "Química", "Física"], color: "#10b981" },
  "Matemática":        { subjects: ["Matemática"], color: "#3b82f6" },
  "Linguagens":        { subjects: ["Português", "Inglês", "Redação"], color: "#8b5cf6" },
};

export function predictENEMScore(
  perfs: StudentPerf[],
  sessions: StudySession[],
  essays: EssayRow[],
  reviews: SpacedReview[],
  slots: WeeklySlotRow[],
  todayISO?: string,
): ENEMPrediction {
  const today = todayISO ?? new Date().toISOString().split("T")[0];

  // Fator 1: Quizzes (0-1000)
  const avgAcc = perfs.length > 0
    ? perfs.reduce((a, p) => a + p.accuracy, 0) / perfs.length
    : 0;
  const quizScore = Math.min(1000, Math.max(0, Math.round((avgAcc / 100) * 1000)));

  // Fator 2: Redações (nota_total 0-1000)
  const correctedEssays = essays.filter(e => e.status === "corrigida" && typeof e.nota_total === "number");
  const avgEssayRaw = correctedEssays.length > 0
    ? correctedEssays.reduce((a, e) => a + (e.nota_total ?? 0), 0) / correctedEssays.length
    : 0;
  // Sem redação = 0 (não herda quizScore)
  const essayScore = correctedEssays.length > 0
    ? Math.min(1000, Math.max(0, Math.round(avgEssayRaw)))
    : 0;

  // Fator 3: Revisões (0-1000)
  const totalReviews = reviews.length;
  const doneReviews = reviews.filter(r => r.completed).length;
  const overdueReviews = reviews.filter(r => !r.completed && r.scheduled_date < today).length;
  const reviewRate = totalReviews > 0
    ? Math.max(0, Math.round(((doneReviews - overdueReviews * 0.5) / totalReviews) * 100))
    : 0;
  const reviewScore = Math.min(1000, Math.max(0, Math.round((reviewRate / 100) * 1000)));

  // Fator 4: Volume de estudo (0min→0, 600min+→1000)
  const studyVolumeMin = sessions.reduce((a, s) => a + s.duration_ms, 0) / 60000;
  const volumeScore = Math.min(1000, Math.max(0, Math.round((Math.min(studyVolumeMin, 600) / 600) * 1000)));

  // Fator 5: Cronograma (0-1000)
  const totalSlots = slots.length;
  const doneSlots = slots.filter(s => s.concluido).length;
  const scheduleAdherence = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;
  const scheduleScore = Math.min(1000, Math.max(0, Math.round((scheduleAdherence / 100) * 1000)));

  // Pesos adaptativos — sem dados de um fator, redistribui o peso
  const hasEssays = correctedEssays.length > 0;
  const hasReviews = totalReviews > 0;
  const hasSchedule = totalSlots > 0;
  let wQuiz = 0.45, wEssay = 0.25, wReview = 0.15, wVolume = 0.10, wSchedule = 0.05;
  if (!hasEssays)   { wQuiz += wEssay;   wEssay = 0; }
  if (!hasReviews)  { wQuiz += wReview * 0.5; wVolume += wReview * 0.5; wReview = 0; }
  if (!hasSchedule) { wQuiz += wSchedule; wSchedule = 0; }

  const finalScore = Math.min(1000, Math.max(0, Math.round(
    quizScore * wQuiz +
    essayScore * wEssay +
    reviewScore * wReview +
    volumeScore * wVolume +
    scheduleScore * wSchedule
  )));

  // Breakdown por área
  const breakdown = Object.entries(AREA_MAP).map(([area, { subjects, color }]) => {
    const areaPerfs = perfs.filter(p => subjects.includes(p.materia));
    const avgAccArea = areaPerfs.length > 0
      ? areaPerfs.reduce((a, p) => a + p.accuracy, 0) / areaPerfs.length
      : 0;
    let score = Math.round((avgAccArea / 100) * 1000);
    if (area === "Linguagens" && hasEssays) {
      score = Math.round(score * 0.6 + essayScore * 0.4);
    }
    return { area, score: Math.min(1000, Math.max(0, score)), color };
  });

  const recurrentErrors = perfs.filter(p => p.erro_recorrente).length;
  const trend: "up" | "down" | "stable" =
    recurrentErrors > 3 || overdueReviews > 5 ? "down"
    : finalScore > 650 || (hasEssays && avgEssayRaw > 700) ? "up"
    : "stable";

  const confidence = Math.min(95,
    20 + perfs.length * 3 + Math.min(20, sessions.length) +
    (hasEssays ? 15 : 0) + (hasReviews ? 10 : 0) + (hasSchedule ? 5 : 0)
  );

  return {
    score: finalScore,
    trend, confidence, breakdown,
    factors: {
      quizScore, essayScore, reviewScore, volumeScore, scheduleScore,
      reviewRate, studyVolumeMin, scheduleAdherence,
      hasEssays, hasReviews, hasSchedule,
      essayCount: correctedEssays.length, avgEssayRaw,
    },
    weights: {
      quizzes: Math.round(wQuiz * 100),
      essays: Math.round(wEssay * 100),
      reviews: Math.round(wReview * 100),
      volume: Math.round(wVolume * 100),
      schedule: Math.round(wSchedule * 100),
    },
  };
}

export interface WeightedContribution {
  label: string;
  contribution: number; // weighted points contributed to final score
  score: number; // raw 0-1000
  weight: number; // percentage
}

/**
 * Returns top N factors by weighted contribution (score * weight/100).
 */
export function getTopContributors(
  factors: ENEMFactors,
  weights: ENEMPrediction["weights"],
  count = 3,
): WeightedContribution[] {
  const all: WeightedContribution[] = [
    { label: "Quizzes", score: factors.quizScore, weight: weights.quizzes, contribution: Math.round(factors.quizScore * weights.quizzes / 100) },
    { label: "Redações", score: factors.essayScore, weight: weights.essays, contribution: Math.round(factors.essayScore * weights.essays / 100) },
    { label: "Revisões", score: factors.reviewScore, weight: weights.reviews, contribution: Math.round(factors.reviewScore * weights.reviews / 100) },
    { label: "Volume", score: factors.volumeScore, weight: weights.volume, contribution: Math.round(factors.volumeScore * weights.volume / 100) },
    { label: "Cronograma", score: factors.scheduleScore, weight: weights.schedule, contribution: Math.round(factors.scheduleScore * weights.schedule / 100) },
  ].filter(c => c.weight > 0);

  return all.sort((a, b) => b.contribution - a.contribution).slice(0, count);
}
