import type { Flashcard, StudyTopic } from "@/lib/studyData";
import { toLocalDateStr, parseLocalDate } from "@/lib/dateUtils";

/**
 * Algoritmo SuperMemo SM-2 (clássico, mesma base usada pelo Anki).
 *
 * Qualidade da resposta:
 *   0 = Errei      → reseta repetições, ease cai, próxima revisão amanhã
 *   3 = Difícil    → mantém em ciclo curto, ease cai um pouco
 *   4 = Ok         → progressão padrão
 *   5 = Fácil      → progressão acelerada
 */
export type ReviewQuality = 0 | 3 | 4 | 5;

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

/**
 * Anki-style fuzz: pequena variação aleatória (±~12%) no intervalo, aplicada apenas
 * em intervalos >= 4 dias e quando já saiu da fase de aprendizado (reps >= 3).
 * Evita que um lote inteiro de cards estudados no mesmo dia caia no mesmo dia futuro
 * — distribui o pico de revisão.
 *
 * `random` é injetável para testes determinísticos (default: Math.random).
 */
export function fuzzInterval(intervalDays: number, reps: number, random: () => number = Math.random): number {
  if (reps < 3 || intervalDays < 4) return intervalDays;
  // amplitude ~12% (mín 1 dia, máx 7 dias) — segue heurística do Anki
  const amplitude = Math.min(7, Math.max(1, Math.round(intervalDays * 0.12)));
  const delta = Math.round((random() * 2 - 1) * amplitude); // [-amplitude, +amplitude]
  return Math.max(1, intervalDays + delta);
}

export function applySM2(card: Flashcard, quality: ReviewQuality, random: () => number = Math.random): Flashcard {
  const prevEase = card.easeFactor ?? DEFAULT_EASE;
  const prevReps = card.repetitions ?? 0;

  // Atualiza ease factor (fórmula SM-2)
  let nextEase = prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEase < MIN_EASE) nextEase = MIN_EASE;

  let nextReps: number;
  let intervalDays: number;

  if (quality < 3) {
    // Errou: reinicia ciclo
    nextReps = 0;
    intervalDays = 1;
  } else {
    nextReps = prevReps + 1;
    if (nextReps === 1) intervalDays = 1;
    else if (nextReps === 2) intervalDays = 6;
    else intervalDays = Math.round((card.intervalDays ?? 6) * nextEase);
    // Fuzz: distribui cargas de revisão entre cards estudados no mesmo dia
    intervalDays = fuzzInterval(intervalDays, nextReps, random);
  }

  const today = new Date();
  const next = new Date(today);
  next.setDate(next.getDate() + intervalDays);

  return {
    ...card,
    easeFactor: Math.round(nextEase * 100) / 100,
    repetitions: nextReps,
    intervalDays,
    nextReview: toLocalDateStr(next),
    lastReviewedAt: toLocalDateStr(today),
    lastQuality: quality,
    streak: quality >= 3 ? (card.streak ?? 0) + 1 : 0,
  };
}

export interface DueFlashcard {
  topicId: string;
  topicTema: string;
  topicMateria: string;
  card: Flashcard;
}

/**
 * Retorna todos os flashcards "vencidos" hoje (dueDate <= hoje OU sem nextReview).
 * Cards novos (sem nextReview) entram na fila imediatamente.
 */
export function getDueFlashcards(topics: StudyTopic[]): DueFlashcard[] {
  const todayStr = toLocalDateStr(new Date());
  const todayMs = parseLocalDate(todayStr).getTime();
  const result: DueFlashcard[] = [];

  for (const topic of topics) {
    for (const card of topic.flashcards ?? []) {
      const due = !card.nextReview || parseLocalDate(card.nextReview).getTime() <= todayMs;
      if (due) {
        result.push({
          topicId: topic.id,
          topicTema: topic.tema,
          topicMateria: topic.materia,
          card,
        });
      }
    }
  }

  // Prioriza: cards já estudados antes (lastQuality < 4) primeiro, depois novos
  return result.sort((a, b) => {
    const aPriority = (a.card.lastQuality ?? -1) < 4 && (a.card.lastQuality ?? -1) >= 0 ? 0 : 1;
    const bPriority = (b.card.lastQuality ?? -1) < 4 && (b.card.lastQuality ?? -1) >= 0 ? 0 : 1;
    return aPriority - bPriority;
  });
}

export function countDueFlashcards(topics: StudyTopic[]): number {
  return getDueFlashcards(topics).length;
}