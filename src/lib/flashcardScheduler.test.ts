import { describe, it, expect } from "vitest";
import { applySM2, fuzzInterval, getDueFlashcards } from "@/lib/flashcardScheduler";
import type { Flashcard, StudyTopic } from "@/lib/studyData";
import { toLocalDateStr } from "@/lib/dateUtils";

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: "c1",
    frente: "f",
    verso: "v",
    ...overrides,
  } as Flashcard;
}

describe("fuzzInterval", () => {
  it("não fuzz em intervalos curtos (<4 dias)", () => {
    expect(fuzzInterval(1, 5, () => 1)).toBe(1);
    expect(fuzzInterval(3, 5, () => 0)).toBe(3);
  });

  it("não fuzz nas primeiras repetições (reps<3)", () => {
    expect(fuzzInterval(15, 1, () => 1)).toBe(15);
    expect(fuzzInterval(15, 2, () => 0)).toBe(15);
  });

  it("aplica delta positivo no extremo superior", () => {
    // amplitude = round(15 * 0.12) = 2
    // random=1 → delta = +2
    expect(fuzzInterval(15, 5, () => 1)).toBe(17);
  });

  it("aplica delta negativo no extremo inferior", () => {
    // random=0 → delta = -2
    expect(fuzzInterval(15, 5, () => 0)).toBe(13);
  });

  it("nunca retorna intervalo < 1", () => {
    // intervalo 4, amplitude=1 (round(0.48) → 0, mas Math.max(1,...)=1)
    expect(fuzzInterval(4, 5, () => 0)).toBeGreaterThanOrEqual(1);
  });
});

describe("applySM2", () => {
  it("reseta repetições e marca 1 dia quando o aluno erra (qty<3)", () => {
    const card = makeCard({ easeFactor: 2.5, repetitions: 5, intervalDays: 30 });
    const next = applySM2(card, 0);
    expect(next.repetitions).toBe(0);
    expect(next.intervalDays).toBe(1);
    expect(next.streak).toBe(0);
    expect(next.lastQuality).toBe(0);
  });

  it("primeira repetição correta = 1 dia", () => {
    const card = makeCard({ repetitions: 0 });
    const next = applySM2(card, 4);
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
  });

  it("segunda repetição correta = 6 dias", () => {
    const card = makeCard({ repetitions: 1 });
    const next = applySM2(card, 4);
    expect(next.repetitions).toBe(2);
    expect(next.intervalDays).toBe(6);
  });

  it("repetições subsequentes aplicam ease factor com fuzz determinístico", () => {
    const card = makeCard({ repetitions: 2, intervalDays: 6, easeFactor: 2.5 });
    // Sem fuzz (random=0.5 → delta=0): 6 * 2.5 = 15
    const next = applySM2(card, 4, () => 0.5);
    expect(next.intervalDays).toBe(15);
    expect(next.repetitions).toBe(3);
  });

  it("ease factor diminui em respostas difíceis (qty=3)", () => {
    const card = makeCard({ easeFactor: 2.5, repetitions: 1 });
    const next = applySM2(card, 3);
    expect(next.easeFactor!).toBeLessThan(2.5);
    expect(next.easeFactor!).toBeGreaterThanOrEqual(1.3);
  });

  it("ease factor não cai abaixo de 1.3", () => {
    const card = makeCard({ easeFactor: 1.3, repetitions: 1 });
    const next = applySM2(card, 0);
    expect(next.easeFactor!).toBeGreaterThanOrEqual(1.3);
  });

  it("incrementa streak em respostas corretas e zera no erro", () => {
    const card = makeCard({ repetitions: 0, streak: 3 });
    const okay = applySM2(card, 4);
    expect(okay.streak).toBe(4);
    const wrong = applySM2(card, 0);
    expect(wrong.streak).toBe(0);
  });
});

describe("getDueFlashcards", () => {
  const today = toLocalDateStr(new Date());
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return toLocalDateStr(d); })();

  it("retorna cards sem nextReview (novos)", () => {
    const topics: StudyTopic[] = [
      { id: "t1", tema: "T", materia: "M", flashcards: [makeCard({ id: "c1" })] } as any,
    ];
    const due = getDueFlashcards(topics);
    expect(due).toHaveLength(1);
  });

  it("ignora cards com nextReview no futuro", () => {
    const topics: StudyTopic[] = [
      { id: "t1", tema: "T", materia: "M", flashcards: [makeCard({ id: "c1", nextReview: future })] } as any,
    ];
    expect(getDueFlashcards(topics)).toHaveLength(0);
  });

  it("inclui cards com nextReview <= hoje", () => {
    const topics: StudyTopic[] = [
      { id: "t1", tema: "T", materia: "M", flashcards: [makeCard({ id: "c1", nextReview: today })] } as any,
    ];
    expect(getDueFlashcards(topics)).toHaveLength(1);
  });

  it("prioriza cards previamente errados (lastQuality<4) antes dos novos", () => {
    const topics: StudyTopic[] = [
      { id: "t1", tema: "T", materia: "M", flashcards: [
        makeCard({ id: "novo" }),
        makeCard({ id: "errou", lastQuality: 0 }),
      ] } as any,
    ];
    const due = getDueFlashcards(topics);
    expect(due[0].card.id).toBe("errou");
  });
});
